import { expect, test } from 'bun:test';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigResolver } from '@domain-services/config-manager/config-resolver';
import { createConfigChangeDetector } from '../config-change';

const CLI_DIRECTORY = join(import.meta.dir, '..', '..', '..', '..');

const typescriptConfig = (handlerPath: string) => `
import { defineConfig } from '@stacktape/config-authoring';
import { memory } from './sizes';
export default defineConfig({ projectName: 'todos' }, () => ({
  resources: {
    api: {
      type: 'function',
      properties: { packaging: { type: 'js-bundle', properties: { entryfilePath: '${handlerPath}' } }, memory }
    }
  }
}));
`;

// A rebuild must notice a configuration it cannot apply, also in a TypeScript configuration and in the modules it
// imports, which the CLI process loaded once already.
test('a TypeScript configuration is loaded again, with its imports, to tell a real change from none', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-config-change-'));
  try {
    await symlink(join(CLI_DIRECTORY, 'node_modules'), join(directory, 'node_modules'), 'junction');
    const configPath = join(directory, 'stacktape.ts');
    await writeFile(configPath, typescriptConfig('./src/api.ts'));
    await writeFile(join(directory, 'sizes.ts'), 'export const memory = 512;\n');
    const resolver = new ConfigResolver();
    await resolver.loadRawConfig({
      context: {
        configPath,
        workingDir: directory,
        authoringParams: { stage: 'dev', region: 'eu-north-1', cliArgs: {}, command: 'dev', awsProfile: '' },
        builtInDirectives: {}
      } as unknown as Parameters<ConfigResolver['loadRawConfig']>[0]['context']
    });
    const sessionConfig = resolver.rawConfig;
    const detect = await createConfigChangeDetector({ configPath, loadConfig: () => resolver.reloadRawConfig() });
    expect(await detect()).toEqual({ changed: false });

    await writeFile(configPath, `// A comment changes nothing.\n${typescriptConfig('./src/api.ts')}`);
    expect(await detect()).toEqual({ changed: false });

    await writeFile(join(directory, 'sizes.ts'), 'export const memory = 1024;\n');
    expect(await detect()).toMatchObject({ changed: true, reason: expect.stringContaining('stacktape.ts changed') });
    await writeFile(join(directory, 'sizes.ts'), 'export const memory = 512;\n');
    expect(await detect()).toEqual({ changed: false });

    await writeFile(configPath, typescriptConfig('./src/handler.ts'));
    expect(await detect()).toMatchObject({ changed: true });

    await writeFile(configPath, 'export default (;');
    expect(await detect()).toMatchObject({ changed: true, reason: expect.stringContaining('no longer loads') });

    // The session's own configuration is never replaced.
    expect(resolver.rawConfig).toBe(sessionConfig);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
