import { afterEach, describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathExists, readJson } from 'fs-extra';
import { parse } from 'yaml';
import { addDefaultTsConfigIfNeeded, starterCommands } from './utils';

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
