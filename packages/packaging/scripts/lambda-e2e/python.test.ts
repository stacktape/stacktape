import { expect, test } from 'bun:test';
import { join } from 'node:path';
import { buildPythonLambda } from '../../src/buildpacks/py-lambda-buildpack';
import { invokeInLambdaImage } from '../e2e-helpers';
import { actions, ensureRuntimeImage, extractArtifact, withProject } from './harness';

test('locked Python native wheel, selected extra and group run in Lambda without dev dependencies', async () => {
  await withProject('python', async (root, project) => {
    const runtimeImage = 'public.ecr.aws/lambda/python:3.12';
    await ensureRuntimeImage(runtimeImage);
    const output = await buildPythonLambda({
      ...actions,
      cwd: project,
      name: 'python-native',
      entryfilePath: 'app/handler.py',
      distFolderPath: join(root, 'dist'),
      pythonVersion: 3.12,
      python: { packageManagerFile: 'uv.lock', uvOptionalDependencies: ['http'], uvWithGroups: ['prod'] }
    });
    const response = await invokeInLambdaImage({
      functionDirectory: await extractArtifact(output, root),
      runtimeImage,
      handler: 'app.handler.handler',
      user: '993:990',
      containerLabel: `stacktape.test=python-native-${process.pid}`,
      event: { text: '<stacktape>' }
    });
    expect(response).toEqual({
      escaped: '&lt;stacktape&gt;',
      domain: 'xn--mnich-kva',
      native: true,
      version: '3.0.2',
      group: '1.3.1',
      devAbsent: true,
      resource: 'python-resource-ok'
    });
  });
}, 480_000);
