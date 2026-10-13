/** Authored Dockerfiles: real image output proves cache identity across instructions, context and arguments. */
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildUsingDockerfile } from '../src/image/dockerfile';
import type { BuildDockerImage } from '../src/runtime-contracts';
import { progressLogger, run, write } from './e2e-helpers';

const root = await mkdtemp(join(tmpdir(), 'stp-dockerfile-image-'));
const context = join(root, 'service');
const prefix = `stp-dockerfile-image-${randomUUID()}`;
const imageTags = new Set<string>();
const base = 'node:24-slim';
const dockerfile = `FROM ${base}\nWORKDIR /app\nARG FIRST\nARG SECOND\nENV RESULT=$FIRST:$SECOND\nCOPY . .\nCMD ["node", "server.js"]\n`;
const buildDockerImage: BuildDockerImage = async ({
  buildContextPath,
  dockerfilePath,
  imageTag,
  buildArgs = {},
  dockerBuildOutputArchitecture
}) => {
  imageTags.add(imageTag);
  const started = Date.now();
  const { stderr } = await run(
    'docker',
    [
      'build',
      '--pull=false',
      '--network=none',
      '--platform',
      dockerBuildOutputArchitecture!,
      '--tag',
      imageTag,
      '--file',
      join(buildContextPath, dockerfilePath!),
      ...Object.keys(buildArgs).flatMap((name) => ['--build-arg', name]),
      buildContextPath
    ],
    undefined,
    { ...Bun.env, ...buildArgs }
  );
  const { stdout } = await run('docker', ['image', 'inspect', imageTag, '--format', '{{json .}}']);
  const details = JSON.parse(stdout) as { Size: number; Id: string; Created: string; Architecture: string; Os: string };
  assert.equal(`${details.Os}/${details.Architecture}`, 'linux/amd64');
  return {
    size: details.Size / 1024 / 1024,
    id: details.Id,
    created: Date.parse(details.Created),
    duration: Date.now() - started,
    dockerOutput: stderr
  };
};
const build = (
  label: string,
  existingDigests: string[] = [],
  selected = '../Dockerfile',
  buildArgs = [
    { argName: 'FIRST', value: 'one' },
    { argName: 'SECOND', value: 'two' }
  ]
) =>
  buildUsingDockerfile({
    name: `${prefix}:${label}`,
    cwd: root,
    buildContextPath: 'service',
    dockerfilePath: selected,
    dockerBuildOutputArchitecture: 'linux/amd64',
    progressLogger,
    existingDigests,
    buildArgs,
    buildDockerImage
  });
const response = async (image: string) => {
  const { stdout } = await run('docker', ['run', '--rm', '--network=none', '--platform', 'linux/amd64', image]);
  return JSON.parse(stdout) as { values: string[]; args: string; instruction: string | null };
};

try {
  // No pulls: this lane names the local prerequisite and never substitutes a different base.
  await run('docker', ['image', 'inspect', base]);
  await write(join(root, 'Dockerfile'), dockerfile);
  await write(join(root, 'Dockerfile.release'), dockerfile);
  await write(join(context, '.dockerignore'), '*.log\n');
  await write(join(context, 'ignored.log'), 'ignored-one');
  await write(
    join(context, 'server.js'),
    `const fs = require('node:fs');
console.log(JSON.stringify({ values: ['dist/output', 'node_modules/runtime/value', '.git/revision'].map(p => fs.readFileSync(p, 'utf8')), args: process.env.RESULT, instruction: process.env.INSTRUCTION ?? null }));\n`
  );
  const paths = ['dist/output', 'node_modules/runtime/value', '.git/revision'];
  for (const path of paths) {
    // oxlint-disable-next-line no-await-in-loop -- Prepare the small project sequentially.
    await write(join(context, path), 'one');
  }
  let previous = await build('initial');
  assert.equal(previous.outcome, 'bundled');
  assert.deepEqual(await response(previous.imageName!), {
    values: ['one', 'one', 'one'],
    args: 'one:two',
    instruction: null
  });

  await write(join(context, 'ignored.log'), 'ignored-two');
  const ignored = await build('ignored', [previous.digest]);
  assert.equal(ignored.outcome, 'skipped', 'an ignored edit must reuse the image');
  const reordered = await build('reordered', [previous.digest], '../Dockerfile', [
    { argName: 'SECOND', value: 'two' },
    { argName: 'FIRST', value: 'one' }
  ]);
  assert.equal(reordered.outcome, 'skipped', 'argument order must not invalidate the image');
  assert.equal(imageTags.size, 1);

  previous = await build('selected', [previous.digest], '../Dockerfile.release');
  assert.equal(
    previous.outcome,
    'bundled',
    'selecting another Dockerfile must invalidate identity, even with identical bytes'
  );
  assert.deepEqual(await response(previous.imageName!), {
    values: ['one', 'one', 'one'],
    args: 'one:two',
    instruction: null
  });
  await write(join(root, 'Dockerfile.release'), dockerfile.replace('COPY . .', 'ENV INSTRUCTION=changed\nCOPY . .'));
  previous = await build('instructions', [previous.digest], '../Dockerfile.release');
  assert.equal(previous.outcome, 'bundled', 'an out-of-context instruction edit must rebuild');
  assert.equal((await response(previous.imageName!)).instruction, 'changed');

  const expected = ['one', 'one', 'one'];
  for (const [index, path] of paths.entries()) {
    // oxlint-disable-next-line no-await-in-loop -- Each change must independently invalidate the preceding image.
    await write(join(context, path), 'two');
    // oxlint-disable-next-line no-await-in-loop -- Each change must independently invalidate the preceding image.
    previous = await build(`context-${index}`, [previous.digest], '../Dockerfile.release');
    assert.equal(previous.outcome, 'bundled', `${path} must participate in the image digest`);
    expected[index] = 'two';
    // oxlint-disable-next-line no-await-in-loop -- Observe the rebuilt artifact before making the next edit.
    assert.deepEqual((await response(previous.imageName!)).values, expected);
  }
  const argsChanged = await build('args', [previous.digest], '../Dockerfile.release', [
    { argName: 'FIRST', value: 'changed' },
    { argName: 'SECOND', value: 'two' }
  ]);
  assert.equal(argsChanged.outcome, 'bundled');
  assert.equal((await response(argsChanged.imageName!)).args, 'changed:two');
  console.log(
    'Authored Dockerfile image passed: instructions, selected file, build outputs, vendored dependency, VCS, ignores, arguments and linux/amd64 runtime.'
  );
} finally {
  try {
    await Promise.all(
      [...imageTags].map(async (tag) => {
        const list = () => run('docker', ['image', 'ls', '--quiet', '--filter', `reference=${tag}`]);
        if ((await list()).stdout.trim()) await run('docker', ['image', 'rm', '--force', tag]);
        assert.equal((await list()).stdout.trim(), '', `owned image remains: ${tag}`);
      })
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
