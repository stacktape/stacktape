import { afterEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigResolver } from '@domain-services/config-manager/config-resolver';
import { createConfigChangeDetector } from '../config-change';

const CLI_DIRECTORY = join(import.meta.dir, '..', '..', '..', '..');
const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});

/**
 * A repository whose configuration lives in `infra/` and imports a module from `shared/`, outside its own directory.
 * The CLI reaches it through a symlink, as a worktree or a linked checkout would; Bun caches modules by real path.
 */
const project = async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-config-change-'));
  directories.push(root);
  await mkdir(join(root, 'repo', 'infra'), { recursive: true });
  await mkdir(join(root, 'repo', 'shared'), { recursive: true });
  await symlink(join(CLI_DIRECTORY, 'node_modules'), join(root, 'repo', 'node_modules'), 'junction');
  await symlink(join(root, 'repo'), join(root, 'linked'), 'junction');
  return { real: join(root, 'repo'), linked: join(root, 'linked') };
};

const load = async (configPath: string, workingDir: string) => {
  const resolver = new ConfigResolver();
  await resolver.loadRawConfig({
    context: {
      configPath,
      workingDir,
      authoringParams: { stage: 'dev', region: 'eu-north-1', cliArgs: {}, command: 'dev', awsProfile: '' },
      builtInDirectives: {}
    } as unknown as Parameters<ConfigResolver['loadRawConfig']>[0]['context']
  });
  return resolver;
};

const typescriptConfig = (entryfilePath: string) => `
import { defineConfig } from '@stacktape/config-authoring';
import { memory } from '../shared/sizes';
export default defineConfig({ projectName: 'todos' }, () => ({
  resources: {
    api: { type: 'function', properties: { packaging: { type: 'js-bundle', properties: { entryfilePath: '${entryfilePath}' } }, memory } }
  }
}));
`;

const javascriptConfig = (entryfilePath: string) => `
const { memory } = require('../shared/sizes.js');
exports.default = () => ({
  resources: {
    api: { type: 'function', properties: { packaging: { type: 'js-bundle', properties: { entryfilePath: '${entryfilePath}' } }, memory } }
  }
});
`;

// A rebuild must notice a configuration it cannot apply. The CLI process loaded the configuration and its imports once
// already, so they have to execute again: a TypeScript or a JavaScript configuration, and modules outside its folder.
for (const kind of ['typescript', 'javascript'] as const) {
  test(`a ${kind} configuration is loaded again, with its imports, to tell a real change from none`, async () => {
    const { real, linked } = await project();
    const extension = kind === 'typescript' ? 'ts' : 'js';
    const write = (entryfilePath: string, prefix = '') =>
      writeFile(
        join(real, 'infra', `stacktape.${extension}`),
        prefix + (kind === 'typescript' ? typescriptConfig : javascriptConfig)(entryfilePath)
      );
    const writeMemory = (memory: number) =>
      writeFile(
        join(real, 'shared', `sizes.${extension}`),
        kind === 'typescript' ? `export const memory = ${memory};\n` : `exports.memory = ${memory};\n`
      );
    await write('./src/api.ts');
    await writeMemory(512);

    const configPath = join(linked, 'infra', `stacktape.${extension}`);
    const resolver = await load(configPath, join(linked, 'infra'));
    const sessionConfig = resolver.rawConfig;
    expect(JSON.stringify(sessionConfig)).toContain('512');
    const detect = createConfigChangeDetector({
      configPath,
      sessionConfig,
      loadConfig: () => resolver.reloadRawConfig()
    });
    expect(await detect()).toEqual({ changed: false });

    await write('./src/api.ts', '// A comment changes nothing.\n');
    expect(await detect()).toEqual({ changed: false });

    await writeMemory(1024);
    expect(await detect()).toMatchObject({
      changed: true,
      reason: expect.stringContaining(`stacktape.${extension} changed`)
    });
    await writeMemory(512);
    expect(await detect()).toEqual({ changed: false });

    await write('./src/handler.ts');
    expect(await detect()).toMatchObject({ changed: true });

    await writeFile(join(real, 'infra', `stacktape.${extension}`), 'export default (;');
    expect(await detect()).toMatchObject({ changed: true, reason: expect.stringContaining('no longer loads') });

    // The session's own configuration is never replaced.
    expect(resolver.rawConfig).toBe(sessionConfig);
  });
}

// r2p: adding only a script set ready to false and needed a restart. Scripts run only on request: seed reads them from
// the file, so a change to them alone is no configuration change.
test('a change to scripts alone is no configuration change; any other change still is', async () => {
  const session = {
    resources: { api: { type: 'function' } },
    scripts: { seed: { type: 'local-script', properties: { executeCommand: 'echo 1' } } }
  };
  let current: unknown = session;
  const detect = createConfigChangeDetector({
    configPath: '/project/stacktape.json',
    sessionConfig: session,
    loadConfig: async () => current
  });
  current = { ...session, scripts: { seed: { type: 'local-script', properties: { executeCommand: 'echo 2' } } } };
  expect(await detect()).toEqual({ changed: false });
  current = { resources: session.resources };
  expect(await detect()).toEqual({ changed: false });
  current = { ...session, resources: { ...session.resources, worker: { type: 'function' } } };
  expect(await detect()).toMatchObject({ changed: true, reason: expect.stringContaining('stacktape.json changed') });
});

// Review of #422: a resource that reads a script through `$This()` changes with it, so the change still counts.
test.each([
  ['$This().scripts.seed.properties.executeCommand', true],
  ['$This()', true],
  ["$Format('{}', $This( ).scripts.seed.type)", true],
  ['$This().resources.api.type', false]
])('a scripts change with a resource reading %s counts: %p', async (reference, counts) => {
  const scripts = (command: string) => ({ seed: { type: 'local-script', properties: { executeCommand: command } } });
  const config = (command: string) => ({
    resources: {
      api: { type: 'function', properties: { environment: [{ name: 'SEED_COMMAND', value: reference }] } }
    },
    scripts: scripts(command)
  });
  let current: unknown = config('echo 1');
  const detect = createConfigChangeDetector({
    configPath: '/project/stacktape.json',
    sessionConfig: config('echo 1'),
    loadConfig: async () => current
  });
  current = config('echo 2');
  expect((await detect()).changed).toBe(counts);
});
