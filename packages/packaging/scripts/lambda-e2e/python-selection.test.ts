import { expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { buildPythonLambda } from '../../src/buildpacks/py-lambda-buildpack';
import { invokeInLambdaImage } from '../e2e-helpers';
import { actions, ensureRuntimeImage, extractArtifact, withProject } from './harness';

for (const manifest of ['pyproject.toml', 'uv.lock'] as const) {
  for (const selection of ['with', 'only', 'excluded-only'] as const) {
    const onlyGroup = selection !== 'with';
    test(`Python 3.14 ${manifest} ${selection} selects runnable dependencies`, async () => {
      await withProject('python-selection', async (root, project) => {
        if (manifest === 'pyproject.toml') await rm(join(project, 'uv.lock'));
        const runtimeImage = 'public.ecr.aws/lambda/python:3.14';
        await ensureRuntimeImage(runtimeImage);
        const output = await buildPythonLambda({
          ...actions,
          cwd: project,
          name: 'python-selection',
          entryfilePath: 'handler.py',
          distFolderPath: join(root, 'dist'),
          pythonVersion: 3.14,
          python: {
            packageManagerFile: manifest,
            ...(onlyGroup
              ? { uvOnlyGroups: ['prod'], ...(selection === 'excluded-only' && { uvWithoutGroups: ['prod'] }) }
              : {
                  uvOptionalDependencies: ['native'],
                  uvWithGroups: ['prod', 'excluded'],
                  uvWithoutGroups: ['excluded']
                })
          }
        });
        const response = await invokeInLambdaImage({
          functionDirectory: await extractArtifact(output, root),
          runtimeImage,
          handler: 'handler.handler',
          user: '993:990',
          containerLabel: `stacktape.test=python-selection-${process.pid}`
        });
        expect(response).toEqual({
          idna: !onlyGroup,
          markupsafe: !onlyGroup,
          sniffio: selection !== 'excluded-only',
          charset_normalizer: false,
          ...(!onlyGroup && { native: true })
        });
      });
    }, 480_000);
  }
}
