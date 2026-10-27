import { afterAll, beforeAll, expect, test } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execa } from 'execa';
import {
  buildDockerImage,
  checkDockerImageExists,
  getDockerImageDetails,
  getLocalImageDigestReference
} from '../../src/utils/docker';
import { RAILPACK_FRONTEND_IMAGE } from '../../src/config/railpack';

/**
 * The CLI's own Docker runner, against the real daemon: every image build of the product goes through it. The
 * scenarios in `packages/packaging` substitute their own `docker build` call, so the platform, secret and argument
 * plumbing of this runner is proven here. Nothing is pulled: the first image is `FROM scratch`, the second is built
 * on a base this test pulls once if it is not local. The `docker-container` builder one test creates, and removes,
 * runs Docker's BuildKit image, which Docker also pulls once if it is not local. The classic image store scenario runs a
 * privileged Docker 28 daemon in a container, which pulls Railpack's frontend, BusyBox and BuildKit into its own store
 * and is removed with them.
 */
const BASE_IMAGE = 'node:24-slim';
const SECRET_VALUE = `SENTINEL-build-secret-${randomUUID()}`;
const docker = (args: string[]) => execa('docker', args, { reject: false, all: true });

let root: string;
const tags: string[] = [];
const builders: string[] = [];
const daemons: string[] = [];
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
  for (const daemon of daemons) {
    const removed = await docker(['rm', '--force', '--volumes', daemon]);
    if (removed.exitCode !== 0) throw new Error(`Could not remove the classic store daemon ${daemon}:\n${removed.all}`);
  }
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

test('pins a pulled image to the digest it was pulled by, and a missing image to nothing', async () => {
  const pinned = await getLocalImageDigestReference(BASE_IMAGE);
  expect(pinned).toMatch(new RegExp(`^${BASE_IMAGE}@sha256:[0-9a-f]{64}$`));
  // The pinned reference names the same local image.
  const [byTag, byDigest] = await Promise.all([
    docker(['image', 'inspect', '--format', '{{.Id}}', BASE_IMAGE]),
    docker(['image', 'inspect', '--format', '{{.Id}}', pinned!])
  ]);
  expect(byDigest.exitCode, byDigest.all).toBe(0);
  expect(byDigest.stdout).toBe(byTag.stdout);

  // An image that is not local has none.
  expect(await getLocalImageDigestReference(`stp-docker-runner-missing-${randomUUID()}:none`)).toBeUndefined();
}, 120_000);

/** Docker 28's daemon, whose default is the classic image store, pinned like other images the tests run. */
const CLASSIC_STORE_DAEMON_IMAGE =
  'docker:28-dind@sha256:2a232a42256f70d78e3cc5d2b5d6b3276710a0de0596c145f627ecfae90282ac';

// Upgraded Docker installs and GitHub's hosted runners keep the classic image store, where Docker's default builder
// refuses the merge operation Railpack's frontend uses. A plan with several step inputs needs it; a simpler plan falls
// back to copies and would prove nothing, so the plain build must fail first.
test('builds a Railpack plan on a Docker daemon that keeps the classic image store', async () => {
  const daemon = `stp-classic-store-${randomUUID()}`;
  const started = await docker([
    'run',
    '--detach',
    '--rm',
    '--privileged',
    '--name',
    daemon,
    '--publish',
    '127.0.0.1::2375',
    '--env',
    'DOCKER_TLS_CERTDIR=',
    CLASSIC_STORE_DAEMON_IMAGE,
    '--host=tcp://0.0.0.0:2375'
  ]);
  if (started.exitCode !== 0) throw new Error(`Could not start the classic store daemon:\n${started.all}`);
  daemons.push(daemon);
  const previousHost = process.env.DOCKER_HOST;
  const previousBuildxConfig = process.env.BUILDX_CONFIG;
  try {
    const port = (await docker(['port', daemon, '2375/tcp'])).stdout.trim().split('\n')[0]!;
    const host = `tcp://${port}`;
    const deadline = Date.now() + 60_000;
    while ((await docker(['--host', host, 'info'])).exitCode !== 0) {
      if (Date.now() > deadline) throw new Error('The classic store daemon did not start within 60 s.');
      await Bun.sleep(500);
    }
    const store = await docker(['--host', host, 'info', '--format', '{{json .DriverStatus}}']);
    expect(store.stdout).not.toContain('io.containerd.snapshotter');

    const context = join(root, 'classic-store-context');
    await Bun.write(join(context, 'payload.txt'), 'payload');
    const plan = join(root, 'classic-store-plan', 'railpack-plan.json');
    await Bun.write(
      plan,
      JSON.stringify({
        steps: [
          {
            name: 'tools',
            inputs: [{ image: 'busybox:1.37' }],
            commands: [{ cmd: 'mkdir -p /opt/tools && echo t > /opt/tools/t' }]
          },
          {
            name: 'build',
            inputs: [{ step: 'tools' }, { local: true, include: ['.'] }],
            commands: [{ cmd: 'mkdir -p /app/out && echo built > /app/out/built' }]
          }
        ],
        deploy: {
          base: { image: 'busybox:1.37' },
          inputs: [
            { step: 'tools', include: ['/opt/tools'] },
            { step: 'build', include: ['/app/out'] },
            { step: 'build', include: ['.'], exclude: ['out'] }
          ],
          startCommand: 'cat /app/payload.txt'
        }
      })
    );
    // The CLI's own builder state stays in this test's directory, bound to this daemon.
    process.env.DOCKER_HOST = host;
    process.env.BUILDX_CONFIG = join(root, 'classic-store-buildx');
    const build = {
      buildContextPath: context,
      dockerfilePath: plan,
      imageTag: tag('classic-store'),
      buildArgs: { BUILDKIT_SYNTAX: RAILPACK_FRONTEND_IMAGE }
    };

    await expect(buildDockerImage(build)).rejects.toMatchObject({ code: 'DOCKER_MERGE_OPERATION_UNSUPPORTED' });
    const details = await buildDockerImage({ ...build, builderImages: [RAILPACK_FRONTEND_IMAGE] });

    expect(details.id).toStartWith('sha256:');
    const output = await docker(['--host', host, 'run', '--rm', '--entrypoint', 'cat', details.id, '/app/payload.txt']);
    expect(output.stdout.trim(), output.all).toBe('payload');
  } finally {
    if (previousHost === undefined) delete process.env.DOCKER_HOST;
    else process.env.DOCKER_HOST = previousHost;
    if (previousBuildxConfig === undefined) delete process.env.BUILDX_CONFIG;
    else process.env.BUILDX_CONFIG = previousBuildxConfig;
  }
}, 600_000);
