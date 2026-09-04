import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  findDotnetBuildRoot,
  findGoProjectRoots,
  findJavaProjectRoots,
  findNearestProjectRoot,
  resolveExplicitProjectRoot
} from './project-root';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { force: true, recursive: true })));
  roots.length = 0;
});

describe('buildpack project roots', () => {
  test('uses the nearest ancestor language manifest', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-project-root-'));
    roots.push(root);
    const moduleRoot = join(root, 'services', 'api');
    const entryfilePath = join(moduleRoot, 'cmd', 'handler', 'main.go');
    await mkdir(join(moduleRoot, 'cmd', 'handler'), { recursive: true });
    await Promise.all([
      writeFile(join(root, 'go.work'), 'go 1.24'),
      writeFile(join(moduleRoot, 'go.mod'), 'module api')
    ]);

    expect(findNearestProjectRoot({ cwd: root, entryfilePath, markerFiles: ['go.mod', 'go.work'] })).toBe(moduleRoot);
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
    expect(resolveExplicitProjectRoot({ cwd: '/repo', projectFile: 'services/api/pom.xml' })).toBe(
      join('/repo', 'services', 'api')
    );
  });

  test('falls back without throwing when the configured entry directory does not exist yet', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-project-root-missing-'));
    roots.push(root);
    const entryfilePath = join(root, 'missing', 'src', 'Program.cs');

    expect(
      findNearestProjectRoot({ cwd: root, entryfilePath, markerFiles: [], markerFileExtensions: ['.csproj'] })
    ).toBe(join(root, 'missing', 'src'));
  });

  test('uses an applicable go.work context but keeps the selected module as the artifact boundary', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-go-work-root-'));
    roots.push(root);
    const moduleRoot = join(root, 'services', 'api');
    const entryfilePath = join(moduleRoot, 'cmd', 'main.go');
    await mkdir(join(moduleRoot, 'cmd'), { recursive: true });
    await Promise.all([
      writeFile(join(root, 'go.work'), 'go 1.24\nuse (\n  ./services/api\n  ./libs/shared\n)\n'),
      writeFile(join(moduleRoot, 'go.mod'), 'module example.com/api\n'),
      writeFile(entryfilePath, 'package main\n')
    ]);

    expect(findGoProjectRoots({ cwd: root, entryfilePath })).toEqual({ buildRoot: root, moduleRoot });
  });

  test('includes recursive .NET ProjectReference siblings in the Docker build context', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-dotnet-project-root-'));
    roots.push(root);
    const appProject = join(root, 'services', 'App', 'App.csproj');
    const sharedProject = join(root, 'libs', 'Shared', 'Shared.csproj');
    await mkdir(join(root, 'services', 'App'), { recursive: true });
    await mkdir(join(root, 'libs', 'Shared'), { recursive: true });
    await Promise.all([
      writeFile(
        appProject,
        '<Project><ItemGroup><ProjectReference Include="../../libs/Shared/Shared.csproj" /></ItemGroup></Project>'
      ),
      writeFile(sharedProject, '<Project />')
    ]);

    expect(findDotnetBuildRoot({ cwd: root, projectFile: appProject })).toBe(root);
  });

  test('includes ancestor .NET build and central-package configuration', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-dotnet-ancestor-root-'));
    roots.push(root);
    const projectRoot = join(root, 'services', 'App');
    await mkdir(projectRoot, { recursive: true });
    await writeFile(join(root, 'Directory.Build.props'), '<Project><PropertyGroup /></Project>');
    await writeFile(join(root, 'Directory.Packages.props'), '<Project />');
    const projectFile = join(projectRoot, 'App.csproj');
    await writeFile(projectFile, '<Project />');

    expect(findDotnetBuildRoot({ cwd: root, projectFile })).toBe(root);
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
