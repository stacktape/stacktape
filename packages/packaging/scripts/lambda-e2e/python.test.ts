import { expect, test } from 'bun:test';
import { join } from 'node:path';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { buildPythonLambda, getPythonLambdaHandlerModule } from '../../src/buildpacks/py-lambda-buildpack';
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

// The dependency file sits at the project root and the handler in `src/`, so the ZIP keeps `src/`. The handler is the one
// the CLI configures for the function, not a string written for this test.
test('a Python handler below its pyproject.toml runs in Lambda under the handler the CLI configures', async () => {
  await withProject('python-src-layout', async (root, project) => {
    const runtimeImage = 'public.ecr.aws/lambda/python:3.12';
    await ensureRuntimeImage(runtimeImage);
    const entryfilePath = 'src/handler.py';
    const handler = `${getPythonLambdaHandlerModule({ cwd: project, entryfilePath })}.handler`;
    expect(handler).toBe('src.handler.handler');
    const output = await buildPythonLambda({
      ...actions,
      cwd: project,
      name: 'python-src-layout',
      entryfilePath,
      distFolderPath: join(root, 'dist'),
      pythonVersion: 3.12
    });
    const functionDirectory = await extractArtifact(output, root);
    // The build compiles the sources to check them, but its bytecode stays out of the artifact.
    expect(
      (await readdir(functionDirectory, { recursive: true })).filter((path) => /__pycache__|\.pyc$/.test(path))
    ).toEqual([]);
    const response = await invokeInLambdaImage({
      functionDirectory,
      runtimeImage,
      handler,
      user: '993:990',
      containerLabel: `stacktape.test=python-src-layout-${process.pid}`,
      event: { domain: 'münich' }
    });
    expect(response).toEqual({ module: 'src.handler', domain: 'xn--mnich-kva' });
  });
}, 480_000);

// Packaging used to succeed for code Lambda could not import: the function then failed every request with
// `Runtime.UserCodeSyntaxError`. Python 3.14's own compiler checks the sources, and the error names the file and line
// relative to the project, as an editor shows them.
test('a syntax error in a Python Lambda module stops packaging with the file and line', async () => {
  await withProject('python-src-layout', async (root, project) => {
    await writeFile(join(project, 'src', 'helpers.py'), 'def ok():\n    return 1\n\n\ndef broken(:\n    pass\n');
    await writeFile(join(project, 'src', 'tabs.py'), 'def f():\n\tif True:\n        return 1\n');
    const failure = await buildPythonLambda({
      ...actions,
      cwd: project,
      name: 'python-syntax-error',
      entryfilePath: 'src/handler.py',
      distFolderPath: join(root, 'dist'),
      pythonVersion: 3.14
    }).then(
      () => undefined,
      (error: Error) => error
    );
    expect(failure?.message).toBe(
      [
        'src/helpers.py, line 5: SyntaxError: invalid syntax',
        '    def broken(:',
        'src/tabs.py, line 3: TabError: inconsistent use of tabs and spaces in indentation'
      ].join('\n')
    );
  });
}, 480_000);
