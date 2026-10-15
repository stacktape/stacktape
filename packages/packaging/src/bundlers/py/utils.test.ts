import { afterEach, describe, expect, test } from 'bun:test';
import type { PackagingProgressLogger } from '../../runtime-contracts';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPythonLambda } from '../../buildpacks/py-lambda-buildpack';
import { getPythonUvDependencySelectorBuildArgs } from './utils';

const createPackagingError = ({ message }: { message: string }) => new Error(message);

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

const progressLogger: PackagingProgressLogger = {
  eventContext: {},
  startEvent: () => {},
  updateEvent: () => {},
  finishEvent: () => {}
};

describe('Python uv dependency selectors', () => {
  test('rejects selector names that cannot be safely expanded by the Dockerfile shell', () => {
    expect(() =>
      getPythonUvDependencySelectorBuildArgs(
        {
          uvWithGroups: ['prod; rm -rf /']
        },
        createPackagingError
      )
    ).toThrow('Invalid Python uv dependency selector');
  });

  test('rejects selectors on an explicit monorepo requirements file instead of silently ignoring them', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-python-selectors-'));
    temporaryDirectories.push(root);
    // The explicit file has no default name, so the selector check is only reached if it resolves from cwd.
    await mkdir(join(root, 'services/api/requirements'), { recursive: true });
    await writeFile(join(root, 'services/api/requirements/prod.txt'), 'idna==3.10\n');
    await writeFile(join(root, 'services/api/handler.py'), 'def handler(event, context):\n    return event\n');

    await expect(
      buildPythonLambda({
        name: 'handler',
        cwd: root,
        entryfilePath: 'services/api/handler.py',
        distFolderPath: join(root, 'dist'),
        invocationId: 'test',
        existingDigests: [],
        python: { packageManagerFile: 'services/api/requirements/prod.txt', uvWithGroups: ['prod'] },
        progressLogger,
        createPackagingError,
        runDocker: async () => {
          throw new Error('Docker must not run for a rejected configuration');
        },
        archiveItem: async () => {
          throw new Error('Nothing must be archived for a rejected configuration');
        }
      })
    ).rejects.toThrow('require pyproject.toml or uv.lock');
  });
});
