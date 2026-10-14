import { expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { buildPythonLambda } from '../../src/buildpacks/py-lambda-buildpack';
import { invokeInLambdaImage } from '../e2e-helpers';
import { actions, ensureRuntimeImage, extractArtifact, withProject } from './harness';

// A monorepo service with a committed Pipfile.lock, and a root project whose lock Stacktape must generate.
const layouts = [
  { lock: 'committed', directory: 'services/api' },
  { lock: 'generated', directory: undefined }
] as const;

for (const { lock, directory } of layouts) {
  test(`a Pipfile project with a ${lock} lock runs its production dependencies from a Lambda ZIP without dev packages`, async () => {
    await withProject(
      'python-pipfile',
      async (root, repository, project) => {
        if (lock === 'generated') await rm(join(project, 'Pipfile.lock'));
        const runtimeImage = 'public.ecr.aws/lambda/python:3.12';
        await ensureRuntimeImage(runtimeImage);
        const output = await buildPythonLambda({
          ...actions,
          cwd: repository,
          name: 'python-pipfile',
          entryfilePath: join(directory ?? '', 'src/handler.py'),
          distFolderPath: join(root, 'dist'),
          pythonVersion: 3.12,
          python: { packageManagerFile: join(directory ?? '', 'Pipfile') }
        });
        const response = await invokeInLambdaImage<{ version: string }>({
          functionDirectory: await extractArtifact(output, root),
          runtimeImage,
          handler: 'src.handler.handler',
          user: '993:990',
          containerLabel: `stacktape.test=python-pipfile-${process.pid}`,
          event: { domain: 'münich' }
        });
        expect(response).toMatchObject({ domain: 'xn--mnich-kva', devAbsent: true });
        // The Pipfile allows any idna >= 3.7; only the committed Pipfile.lock pins 3.7.
        if (lock === 'committed') expect(response.version).toBe('3.7');
        else expect(response.version).not.toBe('3.7');
      },
      { directory }
    );
  }, 480_000);
}
