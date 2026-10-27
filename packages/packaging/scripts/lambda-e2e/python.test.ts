import { expect, test } from 'bun:test';
import { join } from 'node:path';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
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
// `Runtime.UserCodeSyntaxError`. A module the handler imports, directly or through other project files, now stops the
// build with the file and line, as an editor shows them. Python files the handler never imports (scripts, test fixtures,
// vendored Python 2 code) used to deploy and must keep deploying: they are only reported, and `excludeFiles` silences
// them. The checker runs in the Python 3.14 build image, so it also proves the script on the newest version.
test('only a syntax error in a module the handler imports stops packaging; other files are reported', async () => {
  await withProject('python-src-layout', async (root, project) => {
    const handlerPath = join(project, 'src', 'handler.py');
    await writeFile(handlerPath, `from src.storage import save\n${await readFile(handlerPath, 'utf8')}`);
    await mkdir(join(project, 'src', 'storage'), { recursive: true });
    await writeFile(join(project, 'src', 'storage', '__init__.py'), 'from .disk import save\n');
    await writeFile(join(project, 'src', 'storage', 'disk.py'), 'def save(:\n    pass\n');
    await mkdir(join(project, 'scripts'), { recursive: true });
    await writeFile(join(project, 'scripts', 'legacy.py'), 'print "python 2"\n');
    await mkdir(join(project, 'tests', 'fixtures'), { recursive: true });
    await writeFile(join(project, 'tests', 'fixtures', 'tabs.py'), 'def f():\n\tif True:\n        return 1\n');
    await writeFile(join(project, 'template.py'), '{% for item in items %}\n');
    const warnings: string[] = [];
    let reportedSourceFiles: string[] = [];
    const build = (excludeFiles?: string[]) =>
      buildPythonLambda({
        ...actions,
        cwd: project,
        name: 'python-compile-check',
        entryfilePath: 'src/handler.py',
        distFolderPath: join(root, 'dist'),
        pythonVersion: 3.14,
        warn: (message) => warnings.push(message),
        reportSourceFiles: (files) => {
          reportedSourceFiles = files.map(({ path }) => path);
        },
        ...(excludeFiles && { excludeFiles })
      });

    const failure = await build().then(
      () => undefined,
      (error: Error) => error
    );
    expect(failure?.message).toBe('src/storage/disk.py, line 1: SyntaxError: invalid syntax\n    def save(:');
    // A failed build still names the files it reads, so dev mode rebuilds the function when the broken module is fixed.
    expect(reportedSourceFiles).toContain(join(project, 'src', 'storage', 'disk.py'));

    await writeFile(join(project, 'src', 'storage', 'disk.py'), 'def save(item):\n    return item\n');
    const output = await build();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toStartWith(
      'Python 3.14 cannot compile 3 packaged files that src/handler.py does not import. '
    );
    for (const file of [
      'scripts/legacy.py, line 1: SyntaxError',
      'template.py',
      'tests/fixtures/tabs.py, line 3: TabError'
    ]) {
      expect(warnings[0]).toContain(file);
    }
    const functionDirectory = await extractArtifact(output, root);
    expect(
      (await readdir(functionDirectory, { recursive: true })).filter((path) =>
        /__pycache__|\.pyc$|stacktape-python-compile/.test(path)
      )
    ).toEqual([]);
    const runtimeImage = 'public.ecr.aws/lambda/python:3.14';
    await ensureRuntimeImage(runtimeImage);
    const response = await invokeInLambdaImage({
      functionDirectory,
      runtimeImage,
      handler: 'src.handler.handler',
      user: '993:990',
      containerLabel: `stacktape.test=python-compile-check-${process.pid}`,
      event: { domain: 'münich' }
    });
    expect(response).toEqual({ module: 'src.handler', domain: 'xn--mnich-kva' });

    warnings.length = 0;
    await build(['scripts/**', 'tests/**', 'template.py']);
    expect(warnings).toEqual([]);
  });
}, 480_000);
