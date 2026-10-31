/**
 * r2at: a Dockerfile web service built into the local image `web-service-container`, a name that every project with a
 * workload called `web` shared. Two projects (or stages) on one machine overwrote each other's image, and `dev` could
 * run the other project's code. Two projects with a same-named workload are packaged here in parallel by the source
 * CLI with real Docker, and each image must run its own project's code. The tag an older CLI gave the image goes.
 *
 * The workload name is unique per run, so the old-style tag this test creates and removes cannot be another session's.
 * `package` needs no AWS here: the child has an isolated HOME and the network guard.
 */
import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { getLocalImageName } from '@stacktape/naming/workload-names';

const cliRoot = resolve(import.meta.dir, '..', '..');
const docker = (args: string[]) => spawnSync('docker', args, { encoding: 'utf8', timeout: 120_000 });

const packageProject = async ({
  home,
  projectName,
  workload,
  message
}: {
  home: string;
  projectName: string;
  workload: string;
  message: string;
}) => {
  const project = join(home, projectName);
  await mkdir(project, { recursive: true });
  await writeFile(join(project, 'message.txt'), `${message}\n`);
  await writeFile(
    join(project, 'Dockerfile'),
    'FROM alpine:3\nCOPY message.txt /message.txt\nCMD ["cat", "/message.txt"]\n'
  );
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
  const invocationId = `local-image-names-${randomUUID()}`;
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
  return { exitCode, output: stdout + stderr };
};

test('two projects with a same-named workload, packaged in parallel, each get an image with their own code', async () => {
  const id = randomUUID().replaceAll('-', '').slice(0, 10);
  const workload = `web${id}`;
  const jobName = `${workload}-service-container`;
  const projects = [`imga${id}`, `imgb${id}`];
  const images = projects.map((projectName) => getLocalImageName({ stackName: `${projectName}-dev`, jobName }));
  const home = await mkdtemp(join(tmpdir(), 'stacktape-local-image-names-'));
  // The tag an older CLI gave this workload's image, shared by every project with a workload of this name.
  const sharedTag = `${jobName}:latest`;
  try {
    expect(docker(['tag', 'alpine:3', sharedTag]).status).toBe(0);
    const runs = await Promise.all(
      projects.map((projectName) => packageProject({ home, projectName, workload, message: `code of ${projectName}` }))
    );
    for (const run of runs) expect(run.exitCode, run.output).toBe(0);

    for (const [index, image] of images.entries()) {
      const output = docker(['run', '--rm', image]);
      expect(output.status, output.stderr).toBe(0);
      expect(output.stdout.trim()).toBe(`code of ${projects[index]}`);
    }
    // Only the tag goes: the image it named (alpine:3 here) stays.
    expect(docker(['image', 'inspect', sharedTag]).status).not.toBe(0);
    expect(docker(['image', 'inspect', 'alpine:3']).status).toBe(0);
  } finally {
    for (const image of [...images, sharedTag]) docker(['image', 'rm', '--force', image]);
    for (const image of images) expect(docker(['image', 'inspect', image]).status).not.toBe(0);
    await rm(home, { recursive: true, force: true });
  }
}, 300_000);
