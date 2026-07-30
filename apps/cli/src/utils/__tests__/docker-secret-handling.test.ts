import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exec, executeGit } from '@utils/exec';

// An ECR authorization token is short-lived but live, and a build argument or a container environment variable holds
// whatever the user's configuration resolved into it. These stand-ins are unmistakable, cannot occur by accident and
// are deliberately not shaped like any credential format the repository's secret scanner looks for.
const SENTINEL_PASSWORD = 'SENTINEL-registry-password-must-never-be-logged';
const SENTINEL_BUILD_ARG_VALUE = 'SENTINEL-build-arg-value-must-never-be-in-argv';
const SENTINEL_CONTAINER_ENV_VALUE = 'SENTINEL-container-env-value-must-never-be-in-argv';
// The names are visible by design — Docker needs them on the command line to know what to read out of its own
// environment — so they are kept distinct from the values the tests hunt for.
const SENTINEL_BUILD_ARG_NAME = 'STP_SENTINEL_BUILD_ARG';
const SENTINEL_CONTAINER_ENV_NAME = 'STP_SENTINEL_CONTAINER_ENV';
const REGISTRY = '123456789012.dkr.ecr.eu-west-1.amazonaws.com';

// Captured before the module is replaced, so the tests that need a real child process still run the real runner.
const realExec = exec;
const realExecuteGit = executeGit;

type ExecCall = { command: string; args: string[]; params: Record<string, any> };

let execStub: ((call: ExecCall) => Promise<any>) | null = null;
const execCalls: ExecCall[] = [];

// The replacement is a pass-through by default. `mock.module` is process-wide in Bun, so only the tests that install
// an `execStub` see anything other than the real runner, and no other test file's behavior changes.
mock.module('@utils/exec', () => ({
  exec: (command: string, args: string[], params: Record<string, any>) => {
    const call = { command, args, params };
    execCalls.push(call);
    return execStub ? execStub(call) : realExec(command, args, params);
  },
  executeGit: realExecuteGit
}));

// Imported once the runner above is in place, and in `beforeAll` because this file's target has no top-level await.
type DockerModule = typeof import('@utils/docker');
let buildDockerImage: DockerModule['buildDockerImage'];
let dockerLogin: DockerModule['dockerLogin'];
let dockerRun: DockerModule['dockerRun'];

/**
 * Stands in for the Docker binary so a real child process, a real Execa rejection and the real error handling are
 * exercised; only which executable runs is substituted. What it received — its own argv, its own standard input and
 * the part of its own environment these tests care about — is appended to a side file rather than written to its own
 * output, because Execa folds a failed child's output into the error message: a fake that echoed everything back
 * would plant the sentinels in the error itself and prove nothing.
 */
const FAKE_DOCKER_PROGRAM = `
const { appendFileSync } = require('node:fs');
const behavior = JSON.parse(process.argv[2]);
const args = process.argv.slice(3);
const observedEnv = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => name.startsWith('STP_SENTINEL') || name === 'DOCKER_BUILDKIT')
);
const respond = (stdin) => {
  if (behavior.reportPath) {
    appendFileSync(behavior.reportPath, JSON.stringify({ args, stdin, env: observedEnv }) + '\\n');
  }
  if (args[0] === 'image' && args[1] === 'inspect') {
    // Lets buildDockerImage finish the way it does against a real Docker.
    process.stdout.write(JSON.stringify([{ Id: 'sha256:fake', Size: 1024, Created: '2026-07-28T00:00:00Z' }]));
    process.exit(0);
  }
  if (behavior.echoStdinToStderr) {
    process.stderr.write(stdin);
  }
  if (behavior.stderr) {
    process.stderr.write(behavior.stderr);
  }
  process.exit(behavior.exitCode || 0);
};
if (behavior.readStdin) {
  let stdin = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    stdin += chunk;
  });
  process.stdin.on('end', () => respond(stdin));
} else {
  respond('');
}
`;

const fakeDockerPath = join(tmpdir(), `stacktape-fake-docker-${process.pid}.cjs`);
const fakeDockerReportPath = join(tmpdir(), `stacktape-fake-docker-report-${process.pid}.jsonl`);
const emptyPathDirectory = join(tmpdir(), `stacktape-empty-path-${process.pid}`);
// A directory that satisfies the `docker` PATH preflight without being what actually runs. The preflight asks whether
// the machine has a Docker to launch; these tests answer yes and substitute the child, so they behave identically on
// a machine with Docker installed and on one without.
const dockerOnPathDirectory = join(tmpdir(), `stacktape-docker-on-path-${process.pid}`);
const dockerOnPathStub = join(dockerOnPathDirectory, process.platform === 'win32' ? 'docker.cmd' : 'docker');

// Windows resolves PATH under the name `Path`; `bin-executable` reads whichever one the platform uses.
const pathEnvName = process.platform === 'win32' ? 'Path' : 'PATH';

const withPath = async <T>(value: string, run: () => Promise<T>): Promise<T> => {
  const original = process.env[pathEnvName];
  process.env[pathEnvName] = value;
  try {
    return await run();
  } finally {
    process.env[pathEnvName] = original;
  }
};

type FakeDockerBehavior = { exitCode?: number; stderr?: string; readStdin?: boolean; echoStdinToStderr?: boolean };

/** Runs `run()` with a `docker` on PATH and every `docker` invocation redirected to the fake binary above. */
const withFakeDocker = async (behavior: FakeDockerBehavior, run: () => Promise<any>) => {
  rmSync(fakeDockerReportPath, { force: true });
  const encodedBehavior = JSON.stringify({ ...behavior, reportPath: fakeDockerReportPath });
  execStub = (call) => realExec(process.execPath, [fakeDockerPath, encodedBehavior, ...call.args], { ...call.params });
  try {
    return await withPath(dockerOnPathDirectory, async () => ({
      error: await run().then(
        () => null,
        (err) => err
      )
    }));
  } finally {
    execStub = null;
  }
};

type FakeDockerInvocation = { args: string[]; stdin: string; env: Record<string, string> };

/** What each fake Docker child was actually given: its own argv, its own standard input, its own environment. */
const readFakeDockerInvocations = (): FakeDockerInvocation[] =>
  readFileSync(fakeDockerReportPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

const fakeDockerInvocation = (subcommand: string): FakeDockerInvocation => {
  const invocation = readFakeDockerInvocations().find((entry) => entry.args[0] === subcommand);
  if (!invocation) {
    throw new Error(`The fake Docker was never invoked with "${subcommand}".`);
  }
  return invocation;
};

/**
 * Runs `run()` with a PATH that contains no `docker`, so the CLI behaves the way it does on a machine without Docker
 * installed.
 */
const withDockerMissingFromPath = (run: () => Promise<any>) =>
  withPath(emptyPathDirectory, () =>
    run().then(
      () => null,
      (err) => err
    )
  );

/**
 * Every string a thrown error can reach the user through: what the CLI prints, the stack it attaches to its own
 * error, the Execa fields a debug dump would show, and the JSON serialization that ends up in the JSONL result.
 */
const errorSurfaces = (err: any): string[] => {
  const hint = Array.isArray(err?.hint) ? err.hint.join('\n') : err?.hint;
  return [
    err?.message,
    err?.stack,
    err?.shortMessage,
    err?.command,
    err?.escapedCommand,
    err?.stdout,
    err?.stderr,
    hint,
    JSON.stringify({ ...err, message: err?.message, stack: err?.stack, hint })
  ].filter((surface): surface is string => typeof surface === 'string');
};

const expectNoSecretIn = (err: any, secret: string) => {
  const surfaces = errorSurfaces(err);
  expect(surfaces.length).toBeGreaterThan(0);
  for (const surface of surfaces) {
    expect(surface).not.toContain(secret);
  }
};

/** Collects everything the CLI would print while `run()` executes. */
const captureConsole = async <T>(run: () => Promise<T>) => {
  const printed: string[] = [];
  const { info, error, warn, log } = console;
  const record = (...parts: any[]) => printed.push(parts.join(' '));
  Object.assign(console, { info: record, error: record, warn: record, log: record });
  try {
    return { printed, result: await run() };
  } finally {
    Object.assign(console, { info, error, warn, log });
  }
};

beforeAll(async () => {
  ({ buildDockerImage, dockerLogin, dockerRun } = await import('@utils/docker'));
  writeFileSync(fakeDockerPath, FAKE_DOCKER_PROGRAM);
  mkdirSync(emptyPathDirectory, { recursive: true });
  mkdirSync(dockerOnPathDirectory, { recursive: true });
  // Never executed — `execStub` substitutes the child — but it is a real file the PATH preflight can find.
  writeFileSync(dockerOnPathStub, 'exit 1\n');
});

afterAll(() => {
  rmSync(fakeDockerPath, { force: true });
  rmSync(fakeDockerReportPath, { force: true });
  rmSync(emptyPathDirectory, { force: true, recursive: true });
  rmSync(dockerOnPathDirectory, { force: true, recursive: true });
});

describe('docker login credential handling', () => {
  test('passes the registry password on stdin and never as a command argument', async () => {
    execCalls.length = 0;
    const { error } = await withFakeDocker({ readStdin: true }, () =>
      dockerLogin({ user: 'AWS', password: SENTINEL_PASSWORD, proxyEndpoint: REGISTRY })
    );

    expect(error).toBeNull();

    // What `execDocker` was asked to run: the user and the registry are still correct, the password is not there.
    const [call] = execCalls;
    expect(call.command).toBe('docker');
    expect(call.args).toEqual(['login', '--username', 'AWS', '--password-stdin', REGISTRY]);
    expect(JSON.stringify(call.args)).not.toContain(SENTINEL_PASSWORD);
    expect(call.params.stdinInput).toBe(SENTINEL_PASSWORD);
    expect(call.params.safeCommandDescription).toBe('docker login [arguments omitted]');

    // What the child process actually received: the password on standard input, and nowhere in its argv.
    const observed = fakeDockerInvocation('login');
    expect(observed.stdin).toBe(SENTINEL_PASSWORD);
    expect(observed.args).toEqual(['login', '--username', 'AWS', '--password-stdin', REGISTRY]);
    expect(observed.args.join(' ')).not.toContain(SENTINEL_PASSWORD);
  });

  test('succeeds when Docker warns about its credential store on stderr', async () => {
    // What `docker login --password-stdin` prints on any machine without a credential helper — while exiting 0. The
    // exit status decides the outcome; treating this warning as a failure would break login on exactly those machines.
    const credentialStoreWarning = [
      'WARNING! Your password will be stored unencrypted in /home/runner/.docker/config.json.',
      'Configure a credential helper to remove this warning. See',
      'https://docs.docker.com/engine/reference/commandline/login/#credentials-store',
      ''
    ].join('\n');

    const { printed, result } = await captureConsole(() =>
      withFakeDocker({ readStdin: true, exitCode: 0, stderr: credentialStoreWarning }, () =>
        dockerLogin({ user: 'AWS', password: SENTINEL_PASSWORD, proxyEndpoint: REGISTRY })
      )
    );

    expect(result.error).toBeNull();
    expect(fakeDockerInvocation('login').stdin).toBe(SENTINEL_PASSWORD);
    expect(printed.join('\n')).not.toContain(SENTINEL_PASSWORD);
  });

  test('reports a missing Docker executable without reproducing the token', async () => {
    // The reproduced incident: Docker absent, a live token in hand. Execa's rejection carries the command line it
    // built, and everything the CLI derives from it used to carry the token with it.
    execCalls.length = 0;
    const error = await withDockerMissingFromPath(() =>
      dockerLogin({ user: 'AWS', password: SENTINEL_PASSWORD, proxyEndpoint: REGISTRY })
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Docker is not installed or not found in PATH.');
    expect(error.type).toBe('DOCKER');
    expect(error.hint).toContain('https://www.docker.com/products/docker-desktop/');
    expectNoSecretIn(error, SENTINEL_PASSWORD);

    // The classification is structural: it came from a PATH lookup, before anything was spawned, so it does not
    // depend on how a runtime or a localized Windows console words a missing executable.
    expect(execCalls).toHaveLength(0);
  });

  test('still classifies a Docker that disappears between the PATH check and the spawn', async () => {
    // The race the preflight cannot close. Both runtimes report it as an ENOENT spawn error.
    const enoent: any = new Error('spawn docker ENOENT');
    enoent.code = 'ENOENT';
    enoent.command = 'docker login [arguments omitted]';

    execStub = () => Promise.reject(enoent);
    const error = await withPath(dockerOnPathDirectory, () =>
      dockerLogin({ user: 'AWS', password: SENTINEL_PASSWORD, proxyEndpoint: REGISTRY }).then(
        () => null,
        (err) => err
      )
    );
    execStub = null;

    expect(error.message).toBe('Docker is not installed or not found in PATH.');
  });

  test("fails an ordinary rejected login with Docker's own message and no command echo", async () => {
    const deniedByRegistry = `Error response from daemon: login attempt to https://${REGISTRY}/v2/ failed with status: 401 Unauthorized`;
    const { error } = await withFakeDocker({ readStdin: true, exitCode: 1, stderr: deniedByRegistry }, () =>
      dockerLogin({ user: 'AWS', password: SENTINEL_PASSWORD, proxyEndpoint: REGISTRY })
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('Failed to login to AWS container registry');
    expect(error.message).toContain('401 Unauthorized');
    expectNoSecretIn(error, SENTINEL_PASSWORD);
  });

  test('redacts the password from a failed login whose Docker echoes standard input back', async () => {
    // A `docker` on PATH that repeats what it was given on stdin would otherwise have that echo folded into Execa's
    // message, and from there into the CLI's error and its JSONL result.
    const { error } = await withFakeDocker(
      { readStdin: true, echoStdinToStderr: true, exitCode: 1, stderr: '\nlogin attempt failed' },
      () => dockerLogin({ user: 'AWS', password: SENTINEL_PASSWORD, proxyEndpoint: REGISTRY })
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('Failed to login to AWS container registry');
    expect(error.message).toContain('[redacted]');
    expectNoSecretIn(error, SENTINEL_PASSWORD);
  });
});

describe('build arguments and container environment', () => {
  const buildWithSecretArg = () =>
    buildDockerImage({
      buildContextPath: process.cwd(),
      imageTag: 'stacktape-secret-handling-test:latest',
      buildArgs: { [SENTINEL_BUILD_ARG_NAME]: SENTINEL_BUILD_ARG_VALUE }
    });

  const runWithSecretEnvironment = () =>
    dockerRun({
      args: {} as any,
      name: 'stacktape-secret-handling-test',
      image: 'stacktape-secret-handling-test:latest',
      environment: { [SENTINEL_CONTAINER_ENV_NAME]: SENTINEL_CONTAINER_ENV_VALUE }
    });

  test('a build passes its --build-arg value in the child environment, not in the child argv', async () => {
    const { error } = await withFakeDocker({}, buildWithSecretArg);
    expect(error).toBeNull();

    const build = fakeDockerInvocation('build');
    // Docker reads the value out of its own environment and supplies the same Dockerfile ARG.
    expect(build.env[SENTINEL_BUILD_ARG_NAME]).toBe(SENTINEL_BUILD_ARG_VALUE);
    expect(build.args).toContain('--build-arg');
    expect(build.args).toContain(SENTINEL_BUILD_ARG_NAME);
    // What `ps` and Process Explorer would show.
    expect(build.args.join(' ')).not.toContain(SENTINEL_BUILD_ARG_VALUE);
    expect(build.args).not.toContain(`${SENTINEL_BUILD_ARG_NAME}=${SENTINEL_BUILD_ARG_VALUE}`);
    // Stacktape's own variable survives alongside it.
    expect(build.env.DOCKER_BUILDKIT).toBe('1');
  });

  test('a container run passes its -e value in the child environment, not in the child argv', async () => {
    const { error } = await withFakeDocker({}, runWithSecretEnvironment);
    expect(error).toBeNull();

    const run = fakeDockerInvocation('run');
    expect(run.env[SENTINEL_CONTAINER_ENV_NAME]).toBe(SENTINEL_CONTAINER_ENV_VALUE);
    expect(run.args).toContain('-e');
    expect(run.args).toContain(SENTINEL_CONTAINER_ENV_NAME);
    expect(run.args.join(' ')).not.toContain(SENTINEL_CONTAINER_ENV_VALUE);
    expect(run.args).not.toContain(`${SENTINEL_CONTAINER_ENV_NAME}=${SENTINEL_CONTAINER_ENV_VALUE}`);
  });

  test('a failing build does not echo the command Stacktape built', async () => {
    // Stacktape's guarantee stops here: it does not put the value in argv and does not repeat the command line it
    // built. A Dockerfile that prints its own ARGs still prints them, and that output is passed through untouched.
    const { error } = await withFakeDocker({ exitCode: 1, stderr: 'failed to solve: process did not complete' }, () =>
      buildWithSecretArg()
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('Error building docker image');
    expect(error.message).toContain('docker build [arguments omitted]');
    expectNoSecretIn(error, SENTINEL_BUILD_ARG_VALUE);
  });

  test('a build that cannot start reports a missing Docker rather than the command line', async () => {
    const error = await withDockerMissingFromPath(() => buildWithSecretArg());

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('Docker is not installed or not found in PATH.');
    expectNoSecretIn(error, SENTINEL_BUILD_ARG_VALUE);
  });

  test('a container run that cannot start reports a missing Docker', async () => {
    const error = await withDockerMissingFromPath(() => runWithSecretEnvironment());

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('Docker is not installed or not found in PATH.');
  });

  test('rejects names reserved for the Docker CLI process itself', async () => {
    const reservedBuildArg = await withFakeDocker({}, () =>
      buildDockerImage({
        buildContextPath: process.cwd(),
        imageTag: 'stacktape-secret-handling-test:latest',
        buildArgs: { DOCKER_BUILDKIT: '0' }
      })
    );
    expect(reservedBuildArg.error?.message).toContain('reserved for the Docker CLI process itself');

    const reservedContainerEnv = await withFakeDocker({}, () =>
      dockerRun({
        args: {} as any,
        name: 'stacktape-secret-handling-test',
        image: 'stacktape-secret-handling-test:latest',
        environment: { PATH: '/opt/whatever' }
      })
    );
    expect(reservedContainerEnv.error?.message).toContain('reserved for the Docker CLI process itself');
  });

  test('rejects a name that would be read back as an inline value', async () => {
    // `--build-arg NAME=value` is Docker's inline form; a configured name containing "=" would silently become one.
    const { error } = await withFakeDocker({}, () =>
      buildDockerImage({
        buildContextPath: process.cwd(),
        imageTag: 'stacktape-secret-handling-test:latest',
        buildArgs: { 'NAME=INLINE': SENTINEL_BUILD_ARG_VALUE }
      })
    );

    expect(error?.message).toContain('cannot be used');
    expectNoSecretIn(error, SENTINEL_BUILD_ARG_VALUE);
  });
});

describe('process runner command descriptions', () => {
  const runnerParams = {
    disableStdout: true,
    disableStderr: true,
    safeCommandDescription: 'docker login [arguments omitted]'
  };

  test('the debug line describes the command instead of echoing its arguments', async () => {
    const { printed } = await captureConsole(() =>
      realExec(process.execPath, [fakeDockerPath, '{}', '-p', SENTINEL_PASSWORD], {
        ...runnerParams,
        logDetails: true
      })
    );

    expect(printed).toHaveLength(1);
    expect(printed[0]).toContain("[STP_DEBUG] Command 'docker login [arguments omitted]'");
    expect(printed[0]).not.toContain(SENTINEL_PASSWORD);
  });

  test('an inaccessible working directory is reported without echoing the arguments', async () => {
    const error = await realExec(process.execPath, [fakeDockerPath, '{}', '-p', SENTINEL_PASSWORD], {
      ...runnerParams,
      cwd: join(tmpdir(), 'stacktape-directory-that-does-not-exist')
    }).then(
      () => null,
      (err) => err
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('Cannot run command "docker login [arguments omitted]"');
    expectNoSecretIn(error, SENTINEL_PASSWORD);
  });
});
