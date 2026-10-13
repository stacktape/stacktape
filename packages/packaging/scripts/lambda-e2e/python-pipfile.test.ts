import { expect, test } from 'bun:test';
import { join } from 'node:path';
import { buildPythonLambda } from '../../src/buildpacks/py-lambda-buildpack';
import { invokeInLambdaImage } from '../e2e-helpers';
import { actions, ensureRuntimeImage, extractArtifact, withProject } from './harness';

test('Pipfile production dependencies run from a Lambda ZIP without dev packages', async () => {
  await withProject('python-pipfile', async (root, project) => {
    const runtimeImage = 'public.ecr.aws/lambda/python:3.12';
    await ensureRuntimeImage(runtimeImage);
    const output = await buildPythonLambda({
      ...actions,
      cwd: project,
      name: 'python-pipfile',
      entryfilePath: 'src/handler.py',
      distFolderPath: join(root, 'dist'),
      pythonVersion: 3.12,
      python: { packageManagerFile: 'Pipfile' }
    });
    const response = await invokeInLambdaImage({
      functionDirectory: await extractArtifact(output, root),
      runtimeImage,
      handler: 'src.handler.handler',
      user: '993:990',
      containerLabel: `stacktape.test=python-pipfile-${process.pid}`,
      event: { domain: 'münich' }
    });
    expect(response).toEqual({ domain: 'xn--mnich-kva', devAbsent: true });
  });
}, 480_000);
