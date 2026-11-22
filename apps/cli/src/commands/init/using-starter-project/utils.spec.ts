import { afterEach, describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathExists, readJson } from 'fs-extra';
import { parse } from 'yaml';
import * as authoring from '@stacktape/config-authoring';
import { stacktapePackageRange } from '@utils/versioning';
import { addDefaultTsConfigIfNeeded, adjustPackageJson, keepConfigInFormat, starterCommands } from './utils';

const temporaryDirectories: string[] = [];
const metadata: Parameters<typeof addDefaultTsConfigIfNeeded>[0]['metadata'] = {
  projectType: 'es',
  hasOwnTsConfig: false,
  hasTypescript: true,
  isWebsite: false,
  hasReact: false,
  hasNextJs: false,
  tags: ['Typescript']
};

const createProjectDirectory = async () => {
  const directoryPath = await mkdtemp(join(tmpdir(), 'stacktape-downloaded-starter-'));
  temporaryDirectories.push(directoryPath);
  return directoryPath;
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directoryPath) => rm(directoryPath, { recursive: true })));
});

describe('downloaded starter TypeScript config', () => {
  test('preserves an authored config even when metadata says the starter does not own one', async () => {
    const projectPath = await createProjectDirectory();
    const authoredConfig = '{\n  "extends": "@framework/tsconfig"\n}\n';
    await writeFile(join(projectPath, 'tsconfig.json'), authoredConfig);

    await addDefaultTsConfigIfNeeded({ absoluteProjectPath: projectPath, metadata });

    expect(await readFile(join(projectPath, 'tsconfig.json'), 'utf8')).toBe(authoredConfig);
  });

  test('generates the default when the downloaded starter has no config', async () => {
    const projectPath = await createProjectDirectory();

    await addDefaultTsConfigIfNeeded({ absoluteProjectPath: projectPath, metadata });

    expect(await pathExists(join(projectPath, 'tsconfig.json'))).toBe(true);
    expect(await readJson(join(projectPath, 'tsconfig.json'))).toEqual(
      expect.objectContaining({
        compilerOptions: expect.objectContaining({
          target: 'ES2022',
          moduleResolution: 'bundler',
          strict: true,
          noEmit: true
        })
      })
    );
  });
});

describe('commands printed after a starter is created', () => {
  const startersDirectory = join(import.meta.dir, '..', '..', '..', '..', 'starter-projects');
  const starterIds = readdirSync(startersDirectory).toSorted();
  // Read from each starter's config by hand. Database and Redis passwords are not here: the deploy generates them.
  const secretsOnlyTheUserHas: Record<string, string[]> = {
    'discord-bot': ['discord-bot-token'],
    'open-webui-self-hosted': ['openai-api-key'],
    'phoenix-api-postgres': ['secret-key-base'],
    'telegram-bot': ['telegram-bot-token']
  };
  const commandsFor = (starterId: string, awsAccount?: string) =>
    starterCommands({
      projectName: starterId,
      region: 'eu-west-1',
      awsAccount,
      resources: parse(readFileSync(join(startersDirectory, starterId, 'stacktape.yml'), 'utf8')).resources
    });

  test('cover every starter', () => {
    expect(starterIds.length).toBeGreaterThan(60);
    expect(starterIds).toEqual(expect.arrayContaining(Object.keys(secretsOnlyTheUserHas)));
  });

  test.each(starterIds)('%s: every command is complete as printed', (starterId) => {
    const { secrets, dev, deploy } = commandsFor(starterId);

    for (const command of [...secrets, dev, deploy]) expect(command).not.toMatch(/[{}<>]/);
    expect(secrets).toEqual(
      (secretsOnlyTheUserHas[starterId] ?? []).map((name) => `stacktape secret set ${name} --region eu-west-1`)
    );
    expect(dev).toBe(`stacktape dev --project ${starterId} --stage local --region eu-west-1`);
    expect(deploy).toBe(`stacktape deploy --project ${starterId} --stage dev --region eu-west-1`);
  });

  test('every command names the AWS account init was given, as one argument', () => {
    const { secrets, dev, deploy } = commandsFor('phoenix-api-postgres', 'Development Account');

    for (const command of [...secrets, dev, deploy]) {
      expect(command.endsWith(" --aws-account 'Development Account'")).toBe(true);
    }
  });
});

/** Runs an emitted `stacktape.ts` against the real authoring classes and returns the config it defines. */
const evaluateTypeScriptConfig = (source: string): Record<string, unknown> => {
  const injected = Object.entries(authoring);
  const factory = new Function(
    'exports',
    ...injected.map(([name]) => name),
    source
      .replace(/^import\s*\{[\s\S]*?\}\s*from\s*['"]stacktape['"];?\s*/m, '')
      .replace('export default', 'exports.default =')
  ) as (exports: { default?: unknown }, ...injected: unknown[]) => void;
  const module: { default?: (params: Record<string, unknown>) => { config: Record<string, unknown> } } = {};
  factory(module, ...injected.map(([, value]) => value));
  return module.default!({ stage: 'dev', region: 'eu-west-1', cliArgs: {}, command: 'deploy', awsProfile: 'default' })
    .config;
};

describe('the config format chosen for a starter', () => {
  const startersDirectory = join(import.meta.dir, '..', '..', '..', '..', 'starter-projects');
  const yamlOnlyStarters = readdirSync(startersDirectory)
    .filter((starterId) => !existsSync(join(startersDirectory, starterId, 'stacktape.ts')))
    .toSorted();

  const starterWithConfigs = async (starterId: string, files: string[]) => {
    const projectPath = await createProjectDirectory();
    for (const file of files) await copyFile(join(startersDirectory, starterId, file), join(projectPath, file));
    return projectPath;
  };

  test('the YAML-only starters are the ones this protects', () => {
    expect(yamlOnlyStarters).toEqual([
      'convex-nextjs',
      'dynamodb-streams-audit',
      'kinesis-realtime-analytics',
      's3-image-processor',
      'scheduled-health-checker',
      'sns-notification-fanout'
    ]);
  });

  test.each(yamlOnlyStarters)('%s: TypeScript converts the only config instead of deleting it', async (starterId) => {
    const projectPath = await starterWithConfigs(starterId, ['stacktape.yml']);
    const yaml = parse(await readFile(join(projectPath, 'stacktape.yml'), 'utf8'));

    await keepConfigInFormat({ absoluteProjectPath: projectPath, chosenFormat: 'typescript' });

    expect(await pathExists(join(projectPath, 'stacktape.yml'))).toBe(false);
    const fromTypeScript = evaluateTypeScriptConfig(await readFile(join(projectPath, 'stacktape.ts'), 'utf8'));
    // A class constructed with no options carries `properties: {}`, which means the same as no properties.
    const withoutEmptyProperties = Object.fromEntries(
      Object.entries(fromTypeScript.resources as Record<string, { properties?: object }>).map(([name, resource]) => [
        name,
        resource.properties && Object.keys(resource.properties).length === 0
          ? { ...resource, properties: undefined }
          : resource
      ])
    );
    expect(withoutEmptyProperties).toEqual(yaml.resources);
  });

  test('YAML keeps the YAML-only starter as it is', async () => {
    const projectPath = await starterWithConfigs('s3-image-processor', ['stacktape.yml']);

    await keepConfigInFormat({ absoluteProjectPath: projectPath, chosenFormat: 'yaml' });

    expect(readdirSync(projectPath)).toEqual(['stacktape.yml']);
  });

  test.each(['typescript', 'yaml'] as const)('a starter with both configs keeps only the %s one', async (format) => {
    const projectPath = await starterWithConfigs('hono-api', ['stacktape.yml', 'stacktape.ts']);
    const authored = await readFile(join(startersDirectory, 'hono-api', 'stacktape.ts'), 'utf8');

    await keepConfigInFormat({ absoluteProjectPath: projectPath, chosenFormat: format });

    expect(readdirSync(projectPath)).toEqual([format === 'typescript' ? 'stacktape.ts' : 'stacktape.yml']);
    if (format === 'typescript') expect(await readFile(join(projectPath, 'stacktape.ts'), 'utf8')).toBe(authored);
  });
});

describe('the stacktape package a starter depends on', () => {
  test.each([
    ['4.1.0', '^4.1.0'],
    ['4.0.0-preview.12', '^4.0.0-preview.12'],
    // Never published, so the project gets any release of the major version, previews included.
    ['4.0.0-dev.0', '^4.0.0-0'],
    ['dev', '^4.0.0-0'],
    [undefined, '^4.0.0-0']
  ])('a CLI built as %s writes %s', (version, range) => {
    expect(stacktapePackageRange(version)).toBe(range);
  });

  test("replaces the v3 range a published starter's manifest names", async () => {
    const projectPath = await createProjectDirectory();
    await writeFile(
      join(projectPath, 'package.json'),
      JSON.stringify({ devDependencies: { stacktape: '^3.4.0', typescript: '^5.8.0' } })
    );

    await adjustPackageJson({
      absoluteProjectPath: projectPath,
      metadata: { ...metadata, starterProjectId: 'hono-api', hasPrisma: false } as Parameters<
        typeof adjustPackageJson
      >[0]['metadata'],
      stacktapeRange: '^4.1.0'
    });

    expect((await readJson(join(projectPath, 'package.json'))).devDependencies).toEqual({
      stacktape: '^4.1.0',
      typescript: '^5.8.0'
    });
  });
});
