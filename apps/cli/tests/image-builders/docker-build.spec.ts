import { afterAll, beforeAll, expect, test } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execa } from 'execa';
import { buildDockerImage, checkDockerImageExists, getDockerImageDetails } from '../../src/utils/docker';

/**
 * The CLI's own Docker runner, against the real daemon: every image build of the product goes through it. The
 * scenarios in `packages/packaging` substitute their own `docker build` call, so the platform, secret and argument
 * plumbing of this runner is proven here. Nothing is pulled: the first image is `FROM scratch`, the second is built
 * on a base this test pulls once if it is not local. The `docker-container` builder one test creates, and removes,
 * runs Docker's BuildKit image, which Docker also pulls once if it is not local.
 */
const BASE_IMAGE = 'node:24-slim';
const SECRET_VALUE = `SENTINEL-build-secret-${randomUUID()}`;
const docker = (args: string[]) => execa('docker', args, { reject: false, all: true });

let root: string;
const tags: string[] = [];
const builders: string[] = [];
const tag = (label: string) => {
  const imageTag = `stp-docker-runner-${randomUUID()}:${label}`;
  tags.push(imageTag);
  return imageTag;
};

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stp-docker-runner-'));
  const base = await docker(['image', 'inspect', BASE_IMAGE]);
  if (base.exitCode !== 0) {
    const pulled = await docker(['pull', BASE_IMAGE]);
    if (pulled.exitCode !== 0) throw new Error(`Could not pull ${BASE_IMAGE}:\n${pulled.all}`);
  }
}, 300_000);

afterAll(async () => {
  for (const builder of builders) {
    const removed = await docker(['buildx', 'rm', '--force', builder]);
    if (removed.exitCode !== 0) throw new Error(`Could not remove builder ${builder}:\n${removed.all}`);
  }
  for (const imageTag of tags) {
    await docker(['image', 'rm', '--force', imageTag]);
    const remaining = await docker(['image', 'ls', '--quiet', '--filter', `reference=${imageTag}`]);
    if (remaining.exitCode !== 0 || remaining.stdout.trim()) throw new Error(`owned image remains: ${imageTag}`);
  }
  await rm(root, { recursive: true, force: true });
});

test('builds for the requested platform from a generated Dockerfile outside the context', async () => {
  // A generated build file lives outside the context, under an absolute path, as the Railpack plan does.
  const context = join(root, 'platform-context');
  const generated = join(root, 'generated');
  await Bun.write(join(context, 'payload.txt'), 'payload');
  await Bun.write(join(generated, 'stp-image-plan.Dockerfile'), 'FROM scratch\nCOPY payload.txt /payload.txt\n');
  const imageTag = tag('arm64');

  const details = await buildDockerImage({
    buildContextPath: context,
    dockerfilePath: join(generated, 'stp-image-plan.Dockerfile'),
    imageTag,
    dockerBuildOutputArchitecture: 'linux/arm64'
  });

  const inspected = await docker(['image', 'inspect', imageTag, '--format', '{{.Os}}/{{.Architecture}} {{.Id}}']);
  expect(inspected.exitCode).toBe(0);
  const [platform, id] = inspected.stdout.trim().split(' ');
  expect(platform).toBe('linux/arm64');
  expect(details.id).toBe(id!);
  expect(await checkDockerImageExists(imageTag)).toBe(true);
  expect(await getDockerImageDetails(imageTag)).toMatchObject({ id, size: details.size });
}, 120_000);

test('passes build arguments and secrets through the environment and redacts the secret from the build output', async () => {
  const context = join(root, 'secret-context');
  await Bun.write(
    join(context, 'Dockerfile'),
    [
      `FROM ${BASE_IMAGE}`,
      'ARG GREETING',
      // BuildKit does not key a layer on the secret it mounts. The product passes a hash of the secret values as a
      // build argument so a changed value rebuilds the layers that read it; this build does the same, so a warm
      // cache from an earlier run cannot hand back a layer holding a previous token.
      'ARG SECRETS_HASH',
      // The secret is read where a package manager would read a token, and echoed as a careless build step might.
      'RUN --mount=type=secret,id=NPM_TOKEN sh -c \'cat /run/secrets/NPM_TOKEN > /token && echo "token=$(cat /run/secrets/NPM_TOKEN) greeting=$GREETING" >&2\'',
      'RUN echo "$GREETING" > /greeting',
      ''
    ].join('\n')
  );
  const imageTag = tag('secret');

  const details = await buildDockerImage({
    buildContextPath: context,
    imageTag,
    buildArgs: { GREETING: 'hello-from-arg', SECRETS_HASH: createHash('sha256').update(SECRET_VALUE).digest('hex') },
    secrets: { NPM_TOKEN: SECRET_VALUE }
  });

  expect(details.size).toBeGreaterThan(1);
  const run = await docker(['run', '--rm', imageTag, 'sh', '-c', 'cat /token; echo; cat /greeting']);
  expect(run.exitCode).toBe(0);
  expect(run.stdout.trim().split('\n')).toEqual([SECRET_VALUE, 'hello-from-arg']);
  expect(details.dockerOutput).toContain('token=[redacted]');
  expect(details.dockerOutput).not.toContain(SECRET_VALUE);
  const history = await docker(['image', 'history', '--no-trunc', '--format', '{{.CreatedBy}}', imageTag]);
  expect(history.exitCode).toBe(0);
  expect(history.stdout).not.toContain(SECRET_VALUE);
}, 180_000);

test('loads the image and reports its own ID when the selected builder keeps results in its cache', async () => {
  // A docker-container builder does not load images by default. Selected with BUILDX_BUILDER, a plain build into it
  // leaves the tag on the previous image, which a deployment would then push.
  const context = join(root, 'builder-context');
  await Bun.write(join(context, 'Dockerfile'), 'FROM scratch\nCOPY payload.txt /payload.txt\n');
  await Bun.write(join(context, 'payload.txt'), 'previous build');
  const imageTag = tag('builder');
  const previous = await buildDockerImage({ buildContextPath: context, imageTag });

  const builder = `stp-docker-runner-${randomUUID()}`;
  builders.push(builder);
  const created = await docker(['buildx', 'create', '--name', builder, '--driver', 'docker-container']);
  if (created.exitCode !== 0) throw new Error(`Could not create builder ${builder}:\n${created.all}`);
  process.env.BUILDX_BUILDER = builder;
  try {
    await Bun.write(join(context, 'payload.txt'), 'this build');
    const details = await buildDockerImage({ buildContextPath: context, imageTag });

    expect(details.id).not.toBe(previous.id);
    const inspected = await docker(['image', 'inspect', imageTag, '--format', '{{.Id}}']);
    expect(inspected.stdout.trim()).toBe(details.id);
  } finally {
    delete process.env.BUILDX_BUILDER;
  }
}, 180_000);

test('reports a missing image as such rather than inventing details', async () => {
  const imageTag = `stp-docker-runner-${randomUUID()}:absent`;
  expect(await checkDockerImageExists(imageTag)).toBe(false);
  await expect(getDockerImageDetails(imageTag)).rejects.toMatchObject({ code: 'DOCKER_IMAGE_NOT_FOUND' });
});
