import { expect, test } from 'bun:test';
import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { buildPythonLambda } from '../../src/buildpacks/py-lambda-buildpack';
import { invokeInLambdaImage } from '../e2e-helpers';
import { actions, ensureRuntimeImage, extractArtifact, withProject } from './harness';

test('a zero-config uv project runs its locked native wheel, selected extra and group in Lambda without dev dependencies', async () => {
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
      // No packageManagerFile: the committed uv.lock must win over its pyproject.toml.
      python: { uvOptionalDependencies: ['http'], uvWithGroups: ['prod'] }
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

test('a stale uv lock stops packaging before producing a Lambda artifact', async () => {
  await withProject('python', async (root, project) => {
    const manifest = join(project, 'pyproject.toml');
    await writeFile(
      manifest,
      (await readFile(manifest, 'utf8')).replace('markupsafe>=3.0.2,<3.1', 'markupsafe==3.0.3')
    );
    await expect(
      buildPythonLambda({
        ...actions,
        cwd: project,
        name: 'python-stale-lock',
        entryfilePath: 'app/handler.py',
        distFolderPath: join(root, 'dist'),
        pythonVersion: 3.12,
        python: { packageManagerFile: 'uv.lock' }
      })
    ).rejects.toThrow(/lockfile.*needs to be updated/);
  });
}, 480_000);

test('an empty uv dependency set still produces a runnable Python Lambda ZIP', async () => {
  await withProject('python-empty', async (root, project) => {
    const runtimeImage = 'public.ecr.aws/lambda/python:3.14';
    await ensureRuntimeImage(runtimeImage);
    const output = await buildPythonLambda({
      ...actions,
      cwd: project,
      name: 'python-empty',
      entryfilePath: 'handler.py',
      distFolderPath: join(root, 'dist'),
      pythonVersion: 3.14,
      python: { packageManagerFile: 'uv.lock' }
    });
    expect(
      await invokeInLambdaImage<{ message: string }>({
        functionDirectory: await extractArtifact(output, root),
        runtimeImage,
        handler: 'handler.handler',
        user: '993:990',
        containerLabel: `stacktape.test=python-empty-${process.pid}`,
        event: { message: 'empty-dependencies-ok' }
      })
    ).toEqual({ message: 'empty-dependencies-ok' });
  });
}, 480_000);
