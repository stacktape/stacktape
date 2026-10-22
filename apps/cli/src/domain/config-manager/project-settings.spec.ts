import { afterEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  locateConfigFile,
  projectSettingsForCommand,
  projectSettingsFromSource,
  readCommandProjectSettings,
  readProjectSettingsFile
} from './project-settings';

const directories: string[] = [];
const project = (files: Record<string, string>) => {
  const directory = mkdtempSync(join(tmpdir(), 'stp-project-settings-'));
  directories.push(directory);
  for (const [name, content] of Object.entries(files)) writeFileSync(join(directory, name), content);
  return directory;
};
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

const read = (source: string, filePath = '/project/stacktape.ts') => projectSettingsFromSource({ source, filePath });

describe('reading project settings from TypeScript and JavaScript without running them', () => {
  test.each([
    [
      'the documented form',
      "import { defineConfig } from 'stacktape';\nexport default defineConfig({ projectName: 'shop', region: 'eu-west-1' }, ({ stage }) => ({ resources: {} }));",
      { projectName: 'shop', region: 'eu-west-1' }
    ],
    [
      'quoted keys, double quotes and template literals',
      'export default defineConfig({ "projectName": "shop", region: `us-east-1` }, () => ({ resources: {} }));',
      { projectName: 'shop', region: 'us-east-1' }
    ],
    [
      'only a region',
      "export default defineConfig({ region: 'eu-central-1' }, () => ({ resources: {} }));",
      { region: 'eu-central-1' }
    ],
    [
      'a default export through a top-level const, with type wrappers',
      "const config = defineConfig({ projectName: 'shop' as const }, () => ({ resources: {} })) satisfies unknown;\nexport default config;",
      { projectName: 'shop' }
    ],
    [
      'an aliased import',
      "import { defineConfig as stacktapeConfig } from 'stacktape';\nexport default stacktapeConfig({ projectName: 'shop' }, () => ({ resources: {} }));",
      { projectName: 'shop' }
    ],
    [
      'a namespace import',
      "import * as stacktape from 'stacktape';\nexport default stacktape.defineConfig({ projectName: 'shop' }, () => ({ resources: {} }));",
      { projectName: 'shop' }
    ],
    ['the one-argument form', 'export default defineConfig(({ stage }) => ({ resources: {} }));', {}],
    [
      'the one-argument form with a function reference',
      'const build = () => ({ resources: {} });\nexport default defineConfig(build);',
      {}
    ],
    ['a file without defineConfig', 'export default { resources: {} };', {}]
  ])('%s', async (_name, source, expected) => {
    expect(await read(source)).toEqual(expected);
  });

  test('reads a CommonJS stacktape.js config', async () => {
    expect(
      await read(
        "const { defineConfig } = require('stacktape');\nmodule.exports = defineConfig({ projectName: 'shop', region: 'eu-west-1' }, () => ({ resources: {} }));",
        '/project/stacktape.js'
      )
    ).toEqual({ projectName: 'shop', region: 'eu-west-1' });
  });

  test.each([
    [
      'a settings variable',
      "const settings = { projectName: 'shop' };\nexport default defineConfig(settings, () => ({ resources: {} }));",
      'the first argument of `defineConfig` must be an object literal written in the config file.'
    ],
    [
      'a computed value',
      "export default defineConfig({ projectName: process.env.NAME ?? 'shop' }, () => ({ resources: {} }));",
      "`projectName` must be a string literal. Received `process.env.NAME ?? 'shop'`, which is computed when the config runs."
    ],
    [
      'an interpolated template',
      'const team = "a";\nexport default defineConfig({ projectName: `shop-${team}` }, () => ({ resources: {} }));',
      'must be a string literal'
    ],
    [
      'a shorthand property',
      "const projectName = 'shop';\nexport default defineConfig({ projectName }, () => ({ resources: {} }));",
      '`projectName` is not supported in the settings object.'
    ],
    [
      'a spread',
      "const base = { projectName: 'shop' };\nexport default defineConfig({ ...base }, () => ({ resources: {} }));",
      '`...base` is not supported in the settings object.'
    ],
    [
      'an unknown setting',
      "export default defineConfig({ projectName: 'shop', stage: 'dev' }, () => ({ resources: {} }));",
      'the settings object accepts only `projectName` and `region`, not `stage`.'
    ],
    [
      'a duplicate setting',
      "export default defineConfig({ region: 'eu-west-1', region: 'us-east-1' }, () => ({ resources: {} }));",
      '`region` is declared twice.'
    ],
    [
      'an unsupported region',
      "export default defineConfig({ region: 'mars-north-1' }, () => ({ resources: {} }));",
      '`region` must be a supported AWS region such as `eu-west-1`. Received `mars-north-1`.'
    ],
    [
      'an invalid project name',
      "export default defineConfig({ projectName: 'My Shop' }, () => ({ resources: {} }));",
      '`projectName` must contain only lowercase letters, numbers and dashes. Received `My Shop`.'
    ],
    [
      'three arguments',
      "export default defineConfig({ projectName: 'shop' }, () => ({ resources: {} }), {});",
      '`defineConfig` takes the settings object and the config function, nothing else.'
    ]
  ])('rejects %s with the supported form', async (_name, source, problem) => {
    const error = await read(source).then(
      () => undefined,
      (caught: unknown) => caught as { code: string; message: string; hints: string[] }
    );
    expect(error?.code).toBe('CONFIG_PROJECT_SETTINGS_INVALID');
    expect(error?.message).toContain(problem);
    expect(error?.hints.join('\n')).toContain(
      "export default defineConfig({ projectName: 'my-app', region: 'eu-west-1' }, ({ stage }) => ({ resources: { ... } }));"
    );
  });

  test('never runs the config: a file that throws and writes a marker on import is only read', async () => {
    const directory = project({});
    const marker = join(directory, 'executed.marker');
    writeFileSync(
      join(directory, 'stacktape.ts'),
      `import { writeFileSync } from 'node:fs';\nwriteFileSync(${JSON.stringify(marker)}, 'ran');\nthrow new Error('project code ran');\nexport default defineConfig({ projectName: 'shop', region: 'eu-west-1' }, () => ({ resources: {} }));\n`
    );

    expect(await readProjectSettingsFile(join(directory, 'stacktape.ts'))).toEqual({
      projectName: 'shop',
      region: 'eu-west-1'
    });
    expect(existsSync(marker)).toBe(false);
  });
});

describe('reading project settings from YAML and JSON', () => {
  test('reads top-level literal strings', async () => {
    const directory = project({
      'stacktape.yml': 'projectName: shop\nregion: eu-west-1\nresources: {}\n',
      'stacktape.json': '{ "projectName": "shop", "resources": {} }'
    });
    expect(await readProjectSettingsFile(join(directory, 'stacktape.yml'))).toEqual({
      projectName: 'shop',
      region: 'eu-west-1'
    });
    expect(await readProjectSettingsFile(join(directory, 'stacktape.json'))).toEqual({ projectName: 'shop' });
  });

  test.each([
    ['a directive', "projectName: $Secret('name')\n", '`projectName` must contain only lowercase letters'],
    ['a number', 'region: 42\n', '`region` must be a string.'],
    ['an object', 'region:\n  name: eu-west-1\n', '`region` must be a string.']
  ])('rejects %s', async (_name, yaml, problem) => {
    const directory = project({ 'stacktape.yml': yaml });
    await expect(readProjectSettingsFile(join(directory, 'stacktape.yml'))).rejects.toThrow(problem);
  });

  test('a format that cannot declare settings statically yields none', async () => {
    const directory = project({ 'stacktape.py': 'def main(): pass\n' });
    expect(await readProjectSettingsFile(join(directory, 'stacktape.py'))).toBeUndefined();
  });
});

describe('where settings come from and which commands take them', () => {
  test('locates the config like the CLI: --config against --cwd, otherwise by file precedence', () => {
    const directory = project({ 'stacktape.yml': 'resources: {}\n', 'stacktape.ts': '' });
    expect(locateConfigFile({ cwd: directory })).toEqual({
      path: join(directory, 'stacktape.ts'),
      candidates: [join(directory, 'stacktape.ts'), join(directory, 'stacktape.yml')],
      explicit: false
    });
    expect(
      locateConfigFile({ cwd: '/', currentWorkingDirectory: directory, configPath: 'infra/stacktape.ts' }).path
    ).toBe(join(directory, 'infra/stacktape.ts'));
  });

  test.each([
    ['deploy', ['projectName', 'region']],
    ['logs', ['projectName', 'region']],
    ['info:stack', ['projectName', 'region']],
    ['secret:set', ['region']],
    ['incidents', []],
    ['info:stacks', ['region']],
    ['init', []],
    ['help', []],
    ['login', []],
    ['mcp', []],
    ['dev:stop', []]
  ] as const)('%s takes %j from the config', (command, expected) => {
    expect(projectSettingsForCommand(command)).toEqual(expected);
  });

  test('a broken config stops only commands that load it', async () => {
    const directory = project({ 'stacktape.ts': 'export default defineConfig({ region: someRegion }, () => ({}));' });
    expect((await readCommandProjectSettings({ command: 'deploy', cwd: directory })).error?.code).toBe(
      'CONFIG_PROJECT_SETTINGS_INVALID'
    );
    expect(await readCommandProjectSettings({ command: 'secret:set', cwd: directory })).toEqual({ settings: {} });
  });
});
