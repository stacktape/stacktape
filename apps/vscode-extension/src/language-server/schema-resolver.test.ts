import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { URI } from 'vscode-uri';
import { StacktapeSchemaResolver } from './schema-resolver';

const temporaryDirectories: string[] = [];

const makeDirectory = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-vscode-extension-'));
  temporaryDirectories.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('StacktapeSchemaResolver', () => {
  test('uses the schema belonging to the nearest project install', async () => {
    const root = await makeDirectory();
    const extensionPath = join(root, 'extension');
    const projectPath = join(root, 'project');
    const packagePath = join(projectPath, 'node_modules', 'stacktape');
    await mkdir(join(extensionPath, 'dist'), { recursive: true });
    await mkdir(join(packagePath, 'bin'), { recursive: true });
    await writeFile(join(extensionPath, 'dist', 'config-schema.json'), '{"title":"bundled"}');
    await writeFile(join(packagePath, 'package.json'), '{"version":"3.7.0"}');
    await writeFile(join(packagePath, 'bin', 'config-schema.json'), '{"title":"local"}');

    const resolver = new StacktapeSchemaResolver({ extensionPath, extensionVersion: '1.0.0' });
    const result = await resolver.resolve(URI.file(join(projectPath, 'app.stacktape.yml')).toString());

    expect(result.label).toBe('Stacktape 3.7.0 (project)');
    expect(JSON.parse(await resolver.read(result.uri))).toEqual({ title: 'local' });
  });

  test('falls back to the bundled schema without using the network', async () => {
    const root = await makeDirectory();
    const extensionPath = join(root, 'extension');
    await mkdir(join(extensionPath, 'dist'), { recursive: true });
    await writeFile(join(extensionPath, 'dist', 'config-schema.json'), '{"title":"bundled"}');
    let fetched = false;
    const fetchSchema = (() => {
      fetched = true;
      throw new Error('unexpected network request');
    }) as unknown as typeof fetch;

    const resolver = new StacktapeSchemaResolver({
      extensionPath,
      extensionVersion: '1.0.0',
      fetchSchema,
      homeDirectory: join(root, 'empty-home')
    });
    const result = await resolver.resolve(URI.file(join(root, 'project', 'app.stacktape.yml')).toString());

    expect(result.label).toBe('bundled with extension 1.0.0');
    expect(fetched).toBe(false);
    expect(JSON.parse(await resolver.read(result.uri))).toEqual({ title: 'bundled' });
  });
});
