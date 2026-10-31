/**
 * Local container images built by the source CLI with real Docker (`package`, which shares the build with `dev` and
 * `deploy`). `package` needs no AWS here: the child has an isolated HOME and the network guard.
 *
 * r2at: a Dockerfile web service built into the local image `web-service-container`, a name that every project with a
 * workload called `web` shared, so two projects on one machine overwrote each other's image and `dev` could run the
 * other project's code. r2bb: with `COPY . .`, an image carried the project's `.stacktape` directory, where the files
 * of local dev databases live, and a running local PostgreSQL made the build fail with EACCES.
 */
import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { getLocalImageName } from '@stacktape/naming/workload-names';

const cliRoot = resolve(import.meta.dir, '..', '..');
const docker = (args: string[]) => spawnSync('docker', args, { encoding: 'utf8', timeout: 120_000 });

/** Writes a project with one Dockerfile web service `workload` and `files`, and runs `package` for stage `dev`. */
const packageProject = async ({
  home,
  projectName,
  workload,
  files
}: {
  home: string;
  projectName: string;
  workload: string;
  files: Record<string, string>;
}) => {
  const project = join(home, projectName);
  for (const [path, contents] of Object.entries(files)) {
    await mkdir(join(project, path, '..'), { recursive: true });
    await writeFile(join(project, path), contents);
  }
  await writeFile(
    join(project, 'stacktape.yml'),
    [
      'resources:',
      `  ${workload}:`,
      '    type: web-service',
      '    properties:',
      '      packaging:',
      '        type: dockerfile',
      '        properties:',
      '          buildContextPath: ./',
      '      resources:',
      '        cpu: 0.25',
      '        memory: 512',
      ''
    ].join('\n')
  );
  const invocationId = `local-images-${randomUUID()}`;
  const child = Bun.spawn(
    [
      'bun',
      '--preload',
      join(cliRoot, 'scripts', 'network-guard-preload.ts'),
      join(cliRoot, 'scripts', 'dev.ts'),
      'package',
      '--stage',
      'dev',
      '--region',
      'eu-west-1',
      '--projectName',
      projectName,
      '--currentWorkingDirectory',
      project
    ],
    {
      cwd: cliRoot,
      env: {
        PATH: process.env.PATH ?? '',
        HOME: home,
        XDG_CONFIG_HOME: join(home, '.config'),
        XDG_CACHE_HOME: join(home, '.cache'),
        // The isolated HOME must not hide the Docker client configuration: its contexts and CLI plugins (buildx).
        DOCKER_CONFIG: process.env.DOCKER_CONFIG ?? join(homedir(), '.docker'),
        // The isolated HOME has no AWS configuration, so this profile reaches no account.
        AWS_PROFILE: process.env.AWS_PROFILE ?? 'stacktape-e2e',
        AWS_EC2_METADATA_DISABLED: 'true',
        TMPDIR: tmpdir(),
        CI: '1',
        NO_COLOR: '1',
        SKIP_LOADING_ENV: '1',
        STP_DISABLE_TELEMETRY: '1',
        STP_INVOCATION_ID: invocationId
      },
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe'
    }
  );
  const timeout = setTimeout(() => child.kill('SIGKILL'), 150_000);
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ]);
  clearTimeout(timeout);
  await rm(join(cliRoot, '.stacktape', invocationId), { recursive: true, force: true });
  return { project, exitCode, output: stdout + stderr };
};

test('two projects with a same-named workload, packaged in parallel, each get an image with their own code', async () => {
  const id = randomUUID().replaceAll('-', '').slice(0, 10);
  const workload = `web${id}`;
  const projects = [`imga${id}`, `imgb${id}`];
  const images = projects.map((projectName) =>
    getLocalImageName({ projectName, stage: 'dev', jobName: `${workload}-service-container` })
  );
  const home = await mkdtemp(join(tmpdir(), 'stacktape-local-images-'));
  try {
    const runs = await Promise.all(
      projects.map((projectName) =>
        packageProject({
          home,
          projectName,
          workload,
          files: {
            'message.txt': `code of ${projectName}\n`,
            Dockerfile: 'FROM alpine:3\nCOPY message.txt /message.txt\nCMD ["cat", "/message.txt"]\n'
          }
        })
      )
    );
    for (const run of runs) expect(run.exitCode, run.output).toBe(0);

    for (const [index, image] of images.entries()) {
      const output = docker(['run', '--rm', image]);
      expect(output.status, output.stderr).toBe(0);
      expect(output.stdout.trim()).toBe(`code of ${projects[index]}`);
    }
  } finally {
    for (const image of images) docker(['image', 'rm', '--force', image]);
    for (const image of images) expect(docker(['image', 'inspect', image]).status).not.toBe(0);
    await rm(home, { recursive: true, force: true });
  }
}, 300_000);

test("a `COPY . .` image never contains the project's .stacktape, also while its local PostgreSQL runs", async () => {
  const id = randomUUID().replaceAll('-', '').slice(0, 10);
  const projectName = `state${id}`;
  const workload = `web${id}`;
  const image = getLocalImageName({ projectName, stage: 'dev', jobName: `${workload}-service-container` });
  const database = `stp-qa-${id}-db`;
  const home = await mkdtemp(join(tmpdir(), 'stacktape-local-images-'));
  const project = join(home, projectName);
  // Where dev mode keeps a local database's files: owned by the database container's user once it runs.
  const dataDirectory = join(project, '.stacktape', 'dev-data', 'dev', 'db', 'data');
  try {
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(join(project, '.stacktape', 'dev-agents.json'), '{"session":"local"}\n');
    const started = docker([
      'run',
      '--detach',
      '--name',
      database,
      '--label',
      `stacktape.qa.task=${id}`,
      '--env',
      'POSTGRES_PASSWORD=local-only',
      '--volume',
      `${dataDirectory}:/var/lib/postgresql/data`,
      'postgres:16.4'
    ]);
    expect(started.status, started.stderr).toBe(0);
    const deadline = Date.now() + 90_000;
    while (docker(['exec', database, 'pg_isready', '-U', 'postgres']).status !== 0) {
      expect(Date.now() < deadline, 'local PostgreSQL did not become ready').toBeTrue();
      await Bun.sleep(500);
    }

    const run = await packageProject({
      home,
      projectName,
      workload,
      files: {
        'app.txt': 'app\n',
        // A project whose .dockerignore keeps everything, .stacktape included.
        '.dockerignore': '!.stacktape\n',
        Dockerfile: 'FROM alpine:3\nWORKDIR /app\nCOPY . .\nCMD ["sh", "-c", "find /app | sort"]\n'
      }
    });
    expect(run.exitCode, run.output).toBe(0);

    const listing = docker(['run', '--rm', image]);
    expect(listing.status, listing.stderr).toBe(0);
    expect(listing.stdout).toContain('/app/app.txt');
    expect(listing.stdout).not.toContain('.stacktape');
  } finally {
    docker(['rm', '--force', database]);
    docker(['image', 'rm', '--force', image]);
    // The database container owns its files; a container of the same image deletes them.
    docker(['run', '--rm', '--volume', `${project}:/project`, 'alpine:3', 'rm', '-rf', '/project/.stacktape']);
    expect(docker(['container', 'inspect', database]).status).not.toBe(0);
    expect(docker(['image', 'inspect', image]).status).not.toBe(0);
    await rm(home, { recursive: true, force: true });
  }
}, 300_000);
