import { afterEach, expect, test } from 'bun:test';
import { access, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runDockerArtifactBuild } from '../src/artifact/docker-artifact-build';
import { buildGeneratedDockerImage } from '../src/artifact/generated-image-build';

const roots: string[] = [];
const temporaryPaths: string[] = [];
const resources: { kind: 'image' | 'container'; name: string }[] = [];
const docker = (args: string[]) => {
  const result = Bun.spawnSync(['docker', ...args], { stdout: 'pipe', stderr: 'pipe', timeout: 90_000 });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return { stdout: result.stdout.toString(), stderr: result.stderr.toString(), exitCode: result.exitCode };
};
afterEach(async () => {
  const failures: unknown[] = [];
  for (const { kind, name } of resources.splice(0).toReversed()) {
    try {
      docker(kind === 'image' ? ['image', 'rm', '--force', name] : ['rm', '--force', name]);
      const probe = Bun.spawnSync(['docker', 'inspect', name], { stdout: 'pipe', stderr: 'pipe' });
      expect(probe.exitCode).not.toBe(0);
      expect(probe.stderr.toString()).toMatch(/No such (?:object|image|container)/i);
    } catch (error) {
      failures.push(error);
    }
  }
  const cleanup = await Promise.allSettled(
    [...roots.splice(0), ...temporaryPaths.splice(0)].map((path) => rm(path, { recursive: true, force: true }))
  );
  failures.push(...cleanup.flatMap((result) => (result.status === 'rejected' ? [result.reason] : [])));
  if (failures.length) throw new AggregateError(failures, 'Archive build cleanup failed');
});
const exists = async (path: string) =>
  access(path).then(
    () => true,
    () => false
  );
const fixture = async () => {
  const root = await mkdtemp(join(tmpdir(), 'stp-archive-build-'));
  roots.push(root);
  const source = join(root, 'source');
  await mkdir(join(source, 'empty'), { recursive: true });
  await mkdir(join(source, '.git'));
  await mkdir(join(source, 'node_modules'));
  await writeFile(join(source, 'main.py'), 'print("ok")');
  await writeFile(join(source, '.git', 'HEAD'), 'private checkout state');
  await writeFile(join(source, 'node_modules', 'local.js'), 'local dependency');
  await writeFile(join(source, '.dockerignore'), 'main.py\n');
  return { root, source };
};

test('Docker exports the selected artifact tree, removes stale files and cleans successful and failed builds', async () => {
  const { root, source } = await fixture();
  const output = join(root, 'output');
  const build = (dockerfileContents = 'FROM scratch AS artifact\nCOPY . /\n') =>
    runDockerArtifactBuild({
      sourcePath: source,
      distFolderPath: output,
      dockerfileContents,
      runDocker: async (args) => {
        temporaryPaths.push(args[args.indexOf('--file') + 1]!, args.at(-1)!);
        return docker(args);
      }
    });
  await build();
  expect(await readFile(join(output, 'main.py'), 'utf8')).toBe('print("ok")');
  expect((await readdir(output)).toSorted()).toEqual(['empty', 'main.py']);
  await rm(join(source, 'main.py'));
  await writeFile(join(source, 'next.py'), 'print("next")');
  await build();
  expect((await readdir(output)).toSorted()).toEqual(['empty', 'next.py']);
  await expect(build('FROM scratch AS artifact\nCOPY missing.py /\n')).rejects.toThrow('missing.py');
  expect(await Promise.all(temporaryPaths.map(exists))).toEqual(temporaryPaths.map(() => false));
  expect((await readdir(root)).toSorted()).toEqual(['output', 'source']);
  await writeFile(join(root, 'outside.txt'), 'outside');
  await symlink('../outside.txt', join(source, 'escape'));
  await expect(build()).rejects.toThrow('resolves outside its source directory');
}, 180_000);

test('generated image copies only customer files and removes its Dockerfile after real build success and failure', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stp-generated-image-'));
  roots.push(root);
  const source = join(root, 'source');
  await mkdir(source);
  await writeFile(join(source, 'index.js'), 'customer code');
  const tag = `stp-t15-${crypto.randomUUID()}:test`;
  let dockerfile = '';
  const build = (dockerfileContents: string) =>
    buildGeneratedDockerImage({
      dockerfileContents,
      buildContextPath: source,
      imageTag: tag,
      buildDockerImage: async ({ dockerfilePath }) => {
        dockerfile = resolve(source, dockerfilePath!);
        temporaryPaths.push(dockerfile);
        docker(['build', '--file', dockerfile, '--tag', tag, source]);
        if (!resources.some((resource) => resource.name === tag)) resources.push({ kind: 'image', name: tag });
        return { size: 0, id: tag, created: 0, dockerOutput: '', duration: 0 };
      }
    });
  await build('FROM scratch\nCOPY . /app/\nCMD ["unused"]\n');
  expect(await Bun.file(dockerfile).exists()).toBe(false);
  const name = `stp-t15-${crypto.randomUUID()}`;
  docker(['create', '--name', name, tag]);
  resources.push({ kind: 'container', name });
  const extracted = join(root, 'extracted');
  docker(['cp', `${name}:/app`, extracted]);
  expect(await readdir(extracted)).toEqual(['index.js']);
  expect(await readFile(join(extracted, 'index.js'), 'utf8')).toBe('customer code');
  await expect(build('FROM scratch\nCOPY missing-file /\n')).rejects.toThrow('missing-file');
  expect(await Bun.file(dockerfile).exists()).toBe(false);
  expect((await readdir(root)).toSorted()).toEqual(['extracted', 'source']);
}, 180_000);
