import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findJavaProjectRoots, findNearestProjectRoot, resolveExplicitProjectRoot, usesMaven } from './project-root';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { force: true, recursive: true })));
  roots.length = 0;
});

describe('buildpack project roots', () => {
  test('a Java project is built with Maven when its nearest build file is a pom.xml', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-project-root-java-tool-'));
    roots.push(root);
    const entry = (project: string) => join(root, project, 'src', 'main', 'java', 'Handler.java');
    await Promise.all(
      ['maven', 'gradle', 'both', 'none', join('nested', 'module')].map((project) =>
        mkdir(join(root, project, 'src', 'main', 'java'), { recursive: true })
      )
    );
    await Promise.all([
      writeFile(join(root, 'maven', 'pom.xml'), '<project/>'),
      writeFile(join(root, 'gradle', 'build.gradle.kts'), ''),
      writeFile(join(root, 'both', 'pom.xml'), '<project/>'),
      writeFile(join(root, 'both', 'build.gradle'), ''),
      // The module's own pom.xml wins over a Gradle file further up.
      writeFile(join(root, 'nested', 'build.gradle'), ''),
      writeFile(join(root, 'nested', 'module', 'pom.xml'), '<project/>')
    ]);

    expect(usesMaven({ cwd: root, entryfilePath: entry('maven') })).toBe(true);
    expect(usesMaven({ cwd: root, entryfilePath: entry('gradle') })).toBe(false);
    expect(usesMaven({ cwd: root, entryfilePath: entry('both') })).toBe(false);
    expect(usesMaven({ cwd: root, entryfilePath: entry('none') })).toBe(false);
    expect(usesMaven({ cwd: root, entryfilePath: entry(join('nested', 'module')) })).toBe(true);
  });

  test('does not select a marker above the configured working directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-project-root-boundary-'));
    roots.push(root);
    const cwd = join(root, 'application');
    const entryfilePath = join(cwd, 'src', 'main.php');
    await mkdir(join(cwd, 'src'), { recursive: true });
    await writeFile(join(root, 'composer.json'), '{}');

    expect(findNearestProjectRoot({ cwd, entryfilePath, markerFiles: ['composer.json'] })).toBe(join(cwd, 'src'));
  });

  test('resolves an explicit project file relative to cwd', () => {
    const cwd = join(tmpdir(), 'stacktape-explicit-project');
    expect(resolveExplicitProjectRoot({ cwd, projectFile: 'services/api/pom.xml' })).toBe(join(cwd, 'services', 'api'));
  });

  test('discovers Maven and Gradle reactor roots without an explicit package-manager file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-java-reactor-root-'));
    roots.push(root);
    const mavenRoot = join(root, 'maven');
    const mavenModule = join(mavenRoot, 'app');
    await mkdir(join(mavenModule, 'src', 'main', 'java'), { recursive: true });
    await writeFile(join(mavenRoot, 'pom.xml'), '<project><modules><module>app</module></modules></project>');
    await writeFile(join(mavenModule, 'pom.xml'), '<project />');
    const mavenEntry = join(mavenModule, 'src', 'main', 'java', 'Main.java');
    await writeFile(mavenEntry, 'class Main {}');

    const gradleRoot = join(root, 'gradle');
    const gradleModule = join(gradleRoot, 'app');
    await mkdir(join(gradleModule, 'src', 'main', 'java'), { recursive: true });
    await writeFile(join(gradleRoot, 'settings.gradle.kts'), 'include(":app")');
    await writeFile(join(gradleModule, 'build.gradle.kts'), 'plugins { java }');
    const gradleEntry = join(gradleModule, 'src', 'main', 'java', 'Main.java');
    await writeFile(gradleEntry, 'class Main {}');

    expect(findJavaProjectRoots({ cwd: mavenRoot, entryfilePath: mavenEntry, useMaven: true })).toEqual({
      buildRoot: mavenRoot,
      moduleRoot: mavenModule
    });
    expect(findJavaProjectRoots({ cwd: gradleRoot, entryfilePath: gradleEntry, useMaven: false })).toEqual({
      buildRoot: gradleRoot,
      moduleRoot: gradleModule
    });
  });
});
