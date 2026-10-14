import { expect, test } from 'bun:test';
import { join } from 'node:path';
import { buildPythonLambda } from '../../src/buildpacks/py-lambda-buildpack';
import { invokeInLambdaImage } from '../e2e-helpers';
import { actions, ensureRuntimeImage, extractArtifact, withProject } from './harness';

test('a monorepo Pipfile service runs its locked production dependencies from a Lambda ZIP without dev packages', async () => {
  await withProject(
    'python-pipfile',
    async (root, repository) => {
      const runtimeImage = 'public.ecr.aws/lambda/python:3.12';
      await ensureRuntimeImage(runtimeImage);
      const output = await buildPythonLambda({
        ...actions,
        cwd: repository,
        name: 'python-pipfile',
        entryfilePath: 'services/api/src/handler.py',
        distFolderPath: join(root, 'dist'),
        pythonVersion: 3.12,
        python: { packageManagerFile: 'services/api/Pipfile' }
      });
      const response = await invokeInLambdaImage({
        functionDirectory: await extractArtifact(output, root),
        runtimeImage,
        handler: 'src.handler.handler',
        user: '993:990',
        containerLabel: `stacktape.test=python-pipfile-${process.pid}`,
        event: { domain: 'münich' }
      });
      // The Pipfile allows any idna >= 3.7; only the committed Pipfile.lock pins 3.7.
      expect(response).toEqual({ domain: 'xn--mnich-kva', version: '3.7', devAbsent: true });
    },
    { directory: 'services/api' }
  );
}, 480_000);
