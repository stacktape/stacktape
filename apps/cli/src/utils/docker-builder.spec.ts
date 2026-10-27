import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';

const cliRoot = resolve(import.meta.dir, '../..');
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

// A stand-in `docker` that answers `info` with the scenario's image store, keeps one buildx builder and records every
// command. Builder state lives in a file, so a create is visible to the next inspect.
const FAKE_DOCKER = `#!/bin/sh
printf '%s\\n' "$*" >> "$DOCKER_LOG"
case "$1 $2" in
  "info --format")
    [ "$FAKE_STORE" = unreachable ] && exit 1
    if [ "$FAKE_STORE" = containerd ]; then echo '[["driver-type","io.containerd.snapshotter.v1"]]'; else echo '[["Backing Filesystem","extfs"],["Supports d_type","true"]]'; fi ;;
  "buildx inspect")
    [ -s "$BUILDER_FILE" ] || exit 1
    printf 'Name:   stacktape-builder\\nDriver: %s\\n' "$(cat "$BUILDER_FILE")" ;;
  "buildx rm") : > "$BUILDER_FILE" ;;
  "buildx create") echo docker-container > "$BUILDER_FILE" ;;
esac
`;

const runScenario = async ({ store, builder }: { store: string; builder?: string }) => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-docker-builder-'));
  temporaryDirectories.push(directory);
  await writeFile(join(directory, 'docker'), FAKE_DOCKER);
  await chmod(join(directory, 'docker'), 0o755);
  const log = join(directory, 'docker.log');
  const builderFile = join(directory, 'builder');
  await writeFile(builderFile, builder ?? '');
  const script = `
    import { ensureStacktapeBuilder, needsStacktapeBuilder } from './src/utils/docker';
    const frontend = await needsStacktapeBuilder({ builderImages: ['ghcr.io/railwayapp/railpack-frontend:v0.40.1'] });
    const plain = await needsStacktapeBuilder({ builderImages: [] });
    if (frontend) await Promise.all([ensureStacktapeBuilder(), ensureStacktapeBuilder()]);
    console.log(JSON.stringify({ frontend, plain }));
  `;
  const child = Bun.spawnSync(['bun', '-e', script], {
    cwd: cliRoot,
    env: {
      ...process.env,
      PATH: [directory, process.env.PATH].join(delimiter),
      DOCKER_LOG: log,
      BUILDER_FILE: builderFile,
      FAKE_STORE: store
    }
  });
  expect(child.exitCode, child.stderr.toString()).toBe(0);
  const commands = (await readFile(log, 'utf8').catch(() => '')).trim().split('\n').filter(Boolean);
  return {
    ...(JSON.parse(child.stdout.toString().trim().split('\n').at(-1)!) as { frontend: boolean; plain: boolean }),
    commands,
    builder: (await readFile(builderFile, 'utf8')).trim()
  };
};

describe.skipIf(process.platform === 'win32')("Stacktape's buildx builder", () => {
  test('a frontend build on the classic image store gets the docker-container builder, created once', async () => {
    const result = await runScenario({ store: 'classic' });
    expect(result).toMatchObject({ frontend: true, plain: false, builder: 'docker-container' });
    expect(result.commands.filter((command) => command.startsWith('info'))).toHaveLength(1);
    expect(result.commands.filter((command) => command.startsWith('buildx create'))).toEqual([
      'buildx create --name stacktape-builder --driver docker-container'
    ]);
  });

  test('the containerd image store keeps every build on the default builder', async () => {
    const result = await runScenario({ store: 'containerd' });
    expect(result).toMatchObject({ frontend: false, plain: false });
    expect(result.commands.some((command) => command.startsWith('buildx'))).toBe(false);
  });

  test('a builder of that name with another driver is replaced, and a docker-container one is kept', async () => {
    const replaced = await runScenario({ store: 'classic', builder: 'docker' });
    expect(replaced.builder).toBe('docker-container');
    expect(replaced.commands).toContain('buildx rm stacktape-builder');
    const kept = await runScenario({ store: 'classic', builder: 'docker-container' });
    expect(kept.commands.some((command) => command.startsWith('buildx create'))).toBe(false);
  });

  test('an unanswered `docker info` keeps the default builder, as before', async () => {
    expect(await runScenario({ store: 'unreachable' })).toMatchObject({ frontend: false, plain: false });
  });
});
