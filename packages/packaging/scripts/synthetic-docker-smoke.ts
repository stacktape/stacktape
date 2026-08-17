import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildUsingStacktapeDotnetLambdaBuildpack } from '../src/buildpacks/stacktape-dotnet-lambda-buildpack';
import { buildUsingStacktapeEsImageBuildpack } from '../src/buildpacks/stacktape-es-image-buildpack';
import { buildUsingStacktapeGoLambdaBuildpack } from '../src/buildpacks/stacktape-go-lambda-buildpack';
import { buildUsingStacktapeJavaLambdaBuildpack } from '../src/buildpacks/stacktape-java-lambda-buildpack';
import { buildUsingStacktapePhpImageBuildpack } from '../src/buildpacks/stacktape-php-image-buildpack';
import { buildUsingStacktapePyImageBuildpack } from '../src/buildpacks/stacktape-py-image-buildpack';
import { buildUsingStacktapePyLambdaBuildpack } from '../src/buildpacks/stacktape-py-lambda-buildpack';
import { buildUsingStacktapeRbImageBuildpack } from '../src/buildpacks/stacktape-rb-image-buildpack';
import { buildUsingStacktapeRbLambdaBuildpack } from '../src/buildpacks/stacktape-rb-lambda-buildpack';
import type { BuildDockerImage, PackagingOutput } from '../src/runtime-contracts';
import {
  archiveItem,
  assertFile,
  assertRunOutput,
  createPackagingError,
  progressLogger,
  run,
  runDocker,
  write
} from './e2e-helpers';

const root = await mkdtemp(join(tmpdir(), 'stacktape-buildpack-smoke-'));
const projectsRoot = join(root, 'projects');
const artifactsRoot = join(root, 'artifacts');
const smokeImageTag = `stacktape-buildpack-smoke:${Date.now()}`;
const builtImageTags = new Set<string>();

const buildDockerImage: BuildDockerImage = async ({
  buildContextPath,
  dockerfilePath,
  imageTag,
  dockerBuildOutputArchitecture
}) => {
  builtImageTags.add(imageTag);
  const started = Date.now();
  const dockerfile = dockerfilePath ? resolve(buildContextPath, dockerfilePath) : undefined;
  const result = await run('docker', [
    'image',
    'build',
    ...(dockerBuildOutputArchitecture ? ['--platform', dockerBuildOutputArchitecture] : []),
    '-t',
    imageTag,
    ...(dockerfile ? ['--file', dockerfile] : []),
    buildContextPath
  ]);
  const inspection = await run('docker', ['image', 'inspect', imageTag, '--format', '{{json .}}']);
  const details = JSON.parse(inspection.stdout.trim());
  return {
    size: Math.round((details.Size / 1024 / 1024) * 100) / 100,
    id: details.Id,
    created: Date.parse(details.Created),
    dockerOutput: result.stderr,
    duration: Date.now() - started
  };
};

const getDockerImageDetails = async (imageTag: string) => {
  const inspection = await run('docker', ['image', 'inspect', imageTag, '--format', '{{json .}}']);
  const details = JSON.parse(inspection.stdout.trim());
  return {
    size: Math.round((details.Size / 1024 / 1024) * 100) / 100,
    id: details.Id as string,
    created: Date.parse(details.Created)
  };
};

const common = {
  existingDigests: [],
  invocationId: 'synthetic-smoke',
  progressLogger,
  createPackagingError,
  runDocker,
  archiveItem,
  sizeLimit: 250,
  zippedSizeLimit: 50,
  // Lambda wrappers must override this for managed runtimes where musl artifacts are invalid.
  requiresGlibcBinaries: false
};

const assertNoGeneratedDockerfile = async (directory: string) => {
  const names = await readdir(directory);
  if (names.some((name) => name.endsWith('.Dockerfile') || name === 'Dockerfile')) {
    throw new Error(`Generated Dockerfile leaked into ${directory}: ${names.join(', ')}`);
  }
};

const results: {
  buildpack: string;
  sizeMb: number | null;
  zippedSizeMb?: number | undefined;
}[] = [];

const record = (buildpack: string, output: PackagingOutput) => {
  results.push({
    buildpack,
    sizeMb: output.size,
    ...('zippedSize' in output && typeof output.zippedSize === 'number' ? { zippedSizeMb: output.zippedSize } : {})
  });
};

try {
  await mkdir(projectsRoot, { recursive: true });
  await mkdir(artifactsRoot, { recursive: true });
  await run('docker', ['version', '--format', '{{.Server.Version}}']);

  console.log('Building synthetic Go Lambda artifact...');
  const goRoot = join(projectsRoot, 'go');
  await write(join(goRoot, 'go.mod'), 'module example.com/stacktape-smoke\n\ngo 1.23\n');
  await write(
    join(goRoot, 'cmd', 'worker', 'main.go'),
    'package main\n\nimport _ "embed"\n\n//go:embed message.txt\nvar message string\n\nfunc main() { println(message) }\n'
  );
  await write(join(goRoot, 'cmd', 'worker', 'message.txt'), 'embedded-runtime-asset');
  const goDist = join(artifactsRoot, 'go');
  const goOutput = await buildUsingStacktapeGoLambdaBuildpack({
    ...common,
    cwd: goRoot,
    name: 'synthetic-go',
    entryfilePath: 'cmd/worker/main.go',
    distFolderPath: goDist
  });
  await assertFile(join(goDist, 'bootstrap'));
  await assertFile(join(goDist, 'cmd', 'worker', 'message.txt'));
  if (await Bun.file(join(goDist, 'cmd', 'worker', 'main.go')).exists()) {
    throw new Error('Go compile-only source leaked into the Lambda artifact.');
  }
  await assertRunOutput({
    dockerArgs: [
      '--mount',
      `type=bind,source=${goDist},target=/artifact,readonly`,
      'debian:bookworm-slim',
      '/artifact/bootstrap'
    ],
    expected: 'embedded-runtime-asset'
  });
  record('go-lambda', goOutput);

  console.log('Building and executing a synthetic Go workspace Lambda artifact...');
  const goWorkspaceRoot = join(projectsRoot, 'go-workspace');
  await write(join(goWorkspaceRoot, 'go.work'), 'go 1.23\n\nuse (\n  ./services/api\n  ./libs/shared\n)\n');
  await write(
    join(goWorkspaceRoot, 'services', 'api', 'go.mod'),
    'module example.com/api\n\ngo 1.23\n\nrequire example.com/shared v0.0.0\n'
  );
  await write(join(goWorkspaceRoot, 'libs', 'shared', 'go.mod'), 'module example.com/shared\n\ngo 1.23\n');
  await write(
    join(goWorkspaceRoot, 'libs', 'shared', 'shared.go'),
    'package shared\n\nfunc Message() string { return "go-work-runtime-ok" }\n'
  );
  await write(
    join(goWorkspaceRoot, 'services', 'api', 'cmd', 'main.go'),
    'package main\n\nimport ("fmt"; "example.com/shared")\n\nfunc main() { fmt.Println(shared.Message()) }\n'
  );
  const goWorkspaceDist = join(artifactsRoot, 'go-workspace');
  const goWorkspaceOutput = await buildUsingStacktapeGoLambdaBuildpack({
    ...common,
    cwd: goWorkspaceRoot,
    name: 'synthetic-go-workspace',
    entryfilePath: 'services/api/cmd/main.go',
    distFolderPath: goWorkspaceDist
  });
  await assertRunOutput({
    dockerArgs: [
      '--mount',
      `type=bind,source=${goWorkspaceDist},target=/artifact,readonly`,
      'debian:bookworm-slim',
      '/artifact/bootstrap'
    ],
    expected: 'go-work-runtime-ok'
  });
  if (await Bun.file(join(goWorkspaceDist, 'libs', 'shared', 'shared.go')).exists()) {
    throw new Error('Go workspace sibling compile-only source leaked into the Lambda artifact.');
  }
  record('go-workspace-lambda', goWorkspaceOutput);

  console.log('Building synthetic Python uv.lock Lambda artifact...');
  const pythonRoot = join(projectsRoot, 'python');
  await write(
    join(pythonRoot, 'pyproject.toml'),
    '[project]\nname = "stacktape-smoke"\nversion = "0.1.0"\nrequires-python = ">=3.14"\ndependencies = []\n'
  );
  await write(
    join(pythonRoot, 'uv.lock'),
    'version = 1\nrevision = 3\nrequires-python = ">=3.14"\n\n[[package]]\nname = "stacktape-smoke"\nversion = "0.1.0"\nsource = { virtual = "." }\n'
  );
  await write(join(pythonRoot, 'app', 'handler.py'), 'def handler(event, context):\n    return {"ok": True}\n');
  await write(join(pythonRoot, 'app', 'template.txt'), 'runtime-template');
  const pythonDist = join(artifactsRoot, 'python');
  const pythonOutput = await buildUsingStacktapePyLambdaBuildpack({
    ...common,
    cwd: pythonRoot,
    name: 'synthetic-python',
    entryfilePath: 'app/handler.py',
    distFolderPath: pythonDist,
    languageSpecificConfig: {
      pythonVersion: 3.14,
      packageManager: 'uv',
      packageManagerFile: 'uv.lock'
    }
  });
  await assertFile(join(pythonDist, 'app', 'handler.py'));
  await assertFile(join(pythonDist, 'app', 'template.txt'));
  await assertNoGeneratedDockerfile(pythonDist);
  await assertRunOutput({
    dockerArgs: [
      '--mount',
      `type=bind,source=${pythonDist},target=/artifact,readonly`,
      'python:3.14-slim',
      'python',
      '-c',
      "import sys; sys.path.insert(0, '/artifact'); from app.handler import handler; print(handler({}, None))"
    ],
    expected: "{'ok': True}"
  });
  record('python-lambda-uv-lock', pythonOutput);

  console.log('Building and executing a synthetic Python Pipfile Lambda artifact...');
  const pipfileRoot = join(projectsRoot, 'python-pipfile');
  await write(
    join(pipfileRoot, 'Pipfile'),
    '[[source]]\nurl = "https://pypi.org/simple"\nverify_ssl = true\nname = "pypi"\n\n[packages]\nidna = "==3.10"\n\n[dev-packages]\npytest = "*"\n\n[requires]\npython_version = "3.12"\n'
  );
  await write(
    join(pipfileRoot, 'src', 'handler.py'),
    'import idna\n\ndef handler(event, context):\n    return idna.encode("münich").decode()\n'
  );
  const pipfileDist = join(artifactsRoot, 'python-pipfile');
  const pipfileOutput = await buildUsingStacktapePyLambdaBuildpack({
    ...common,
    cwd: pipfileRoot,
    name: 'synthetic-python-pipfile',
    entryfilePath: 'src/handler.py',
    distFolderPath: pipfileDist,
    languageSpecificConfig: {
      pythonVersion: 3.12,
      packageManagerFile: 'Pipfile'
    }
  });
  await assertRunOutput({
    dockerArgs: [
      '--mount',
      `type=bind,source=${pipfileDist},target=/artifact,readonly`,
      'python:3.12-slim',
      'python',
      '-c',
      "import sys; sys.path.insert(0, '/artifact'); from src.handler import handler; print(handler({}, None))"
    ],
    expected: 'xn--mnich-kva'
  });
  if (await Bun.file(join(pipfileDist, 'pytest')).exists()) {
    throw new Error('Pipfile dev dependency leaked into the Lambda artifact.');
  }
  record('python-lambda-pipfile', pipfileOutput);

  console.log('Building and executing a synthetic Alpine Python image with a native dependency...');
  const pythonImageRoot = join(projectsRoot, 'python-image');
  await write(join(pythonImageRoot, 'requirements.txt'), 'orjson==3.10.15\n');
  await write(
    join(pythonImageRoot, 'src', 'runner.py'),
    'import orjson\nprint(orjson.dumps({"message": "python-native-runtime-ok"}).decode())\n'
  );
  const pythonImageDist = join(artifactsRoot, 'python-image');
  const pythonImageTag = `stacktape-python-smoke:${Date.now()}`;
  const pythonImageOutput = await buildUsingStacktapePyImageBuildpack({
    ...common,
    cwd: pythonImageRoot,
    name: pythonImageTag,
    entryfilePath: 'src/runner.py',
    distFolderPath: pythonImageDist,
    languageSpecificConfig: {
      pythonVersion: 3.13,
      packageManagerFile: 'requirements.txt'
    },
    buildDockerImage,
    requiresGlibcBinaries: false
  });
  await assertRunOutput({
    dockerArgs: [pythonImageTag],
    expected: 'python-native-runtime-ok'
  });
  record('python313-alpine-native-image', pythonImageOutput);

  console.log('Building synthetic Ruby Lambda artifact...');
  const rubyRoot = join(projectsRoot, 'ruby');
  await write(join(rubyRoot, 'gems.rb'), 'source "https://rubygems.org"\ngem "base64", "0.3.0"\n');
  await write(
    join(rubyRoot, 'src', 'handler.rb'),
    'require "base64"\ndef handler(event:, context:)\n  { value: Base64.strict_encode64("ruby-runtime-ok") }\nend\n'
  );
  const rubyDist = join(artifactsRoot, 'ruby');
  const rubyOutput = await buildUsingStacktapeRbLambdaBuildpack({
    ...common,
    cwd: rubyRoot,
    name: 'synthetic-ruby',
    entryfilePath: 'src/handler.rb',
    distFolderPath: rubyDist,
    languageSpecificConfig: { rubyVersion: 4 }
  });
  await assertFile(join(rubyDist, 'src', 'handler.rb'));
  await assertFile(join(rubyDist, 'vendor', 'bundle', 'ruby', '4.0.0', 'specifications', 'base64-0.3.0.gemspec'));
  await assertNoGeneratedDockerfile(rubyDist);
  await assertRunOutput({
    dockerArgs: [
      '--mount',
      `type=bind,source=${rubyDist},target=/artifact,readonly`,
      '--env',
      'GEM_HOME=/artifact/vendor/bundle/ruby/4.0.0',
      '--env',
      'GEM_PATH=/artifact/vendor/bundle/ruby/4.0.0',
      'ruby:4.0-slim',
      'ruby',
      '-e',
      "require '/artifact/src/handler'; puts handler(event: {}, context: nil)[:value]"
    ],
    expected: 'cnVieS1ydW50aW1lLW9r'
  });
  record('ruby-lambda', rubyOutput);

  await write(
    join(rubyRoot, 'src', 'runner.rb'),
    'require "base64"\nputs Base64.strict_encode64("ruby-image-runtime-ok")\n'
  );
  const rubyImageTag = `stacktape-ruby-smoke:${Date.now()}`;
  const rubyImageOutput = await buildUsingStacktapeRbImageBuildpack({
    ...common,
    cwd: rubyRoot,
    name: rubyImageTag,
    entryfilePath: 'src/runner.rb',
    distFolderPath: join(artifactsRoot, 'ruby-image'),
    languageSpecificConfig: { rubyVersion: 4 },
    buildDockerImage
  });
  await assertRunOutput({
    dockerArgs: [rubyImageTag],
    expected: 'cnVieS1pbWFnZS1ydW50aW1lLW9r'
  });
  record('ruby4-gem-image', rubyImageOutput);

  console.log('Building and executing a synthetic zero-config Maven reactor Lambda artifact...');
  const javaRoot = join(projectsRoot, 'java');
  await write(
    join(javaRoot, 'pom.xml'),
    '<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion><groupId>smoke</groupId><artifactId>parent</artifactId><version>1.0.0</version><packaging>pom</packaging><modules><module>lib</module><module>app</module></modules><properties><maven.compiler.release>21</maven.compiler.release></properties></project>\n'
  );
  await write(
    join(javaRoot, 'lib', 'pom.xml'),
    '<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion><parent><groupId>smoke</groupId><artifactId>parent</artifactId><version>1.0.0</version></parent><artifactId>lib</artifactId></project>\n'
  );
  await write(
    join(javaRoot, 'lib', 'src', 'main', 'java', 'smoke', 'Shared.java'),
    'package smoke; public final class Shared { public static String message() { return "maven-reactor-runtime-ok"; } }\n'
  );
  await write(
    join(javaRoot, 'app', 'pom.xml'),
    '<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion><parent><groupId>smoke</groupId><artifactId>parent</artifactId><version>1.0.0</version></parent><artifactId>app</artifactId><dependencies><dependency><groupId>smoke</groupId><artifactId>lib</artifactId><version>${project.version}</version></dependency></dependencies></project>\n'
  );
  await write(
    join(javaRoot, 'app', 'src', 'main', 'java', 'smoke', 'Handler.java'),
    'package smoke; public final class Handler { public String handleRequest() { return Shared.message(); } public static void main(String[] args) { System.out.println(Shared.message()); } }\n'
  );
  await write(join(javaRoot, 'app', 'src', 'main', 'resources', 'message.txt'), 'java-runtime-resource');
  const javaDist = join(artifactsRoot, 'java');
  const javaOutput = await buildUsingStacktapeJavaLambdaBuildpack({
    ...common,
    cwd: javaRoot,
    name: 'synthetic-java',
    entryfilePath: 'app/src/main/java/smoke/Handler.java',
    distFolderPath: javaDist,
    languageSpecificConfig: { javaVersion: 21, useMaven: true }
  });
  await assertFile(join(javaDist, 'smoke', 'Handler.class'));
  await assertFile(join(javaDist, 'message.txt'));
  await assertNoGeneratedDockerfile(javaDist);
  await assertRunOutput({
    dockerArgs: [
      '--mount',
      `type=bind,source=${javaDist},target=/artifact,readonly`,
      'amazoncorretto:21',
      'java',
      '-cp',
      '/artifact:/artifact/lib/*',
      'smoke.Handler'
    ],
    expected: 'maven-reactor-runtime-ok'
  });
  record('java21-lambda-maven-reactor', javaOutput);

  console.log('Building and executing a synthetic zero-config Gradle reactor Lambda artifact...');
  const gradleRoot = join(projectsRoot, 'java-gradle');
  await write(join(gradleRoot, 'settings.gradle'), "rootProject.name = 'stacktape-smoke'\ninclude 'lib', 'app'\n");
  await write(
    join(gradleRoot, 'build.gradle'),
    "subprojects { apply plugin: 'java'; repositories { mavenCentral() } }\n"
  );
  await write(join(gradleRoot, 'app', 'build.gradle'), "dependencies { implementation project(':lib') }\n");
  await write(
    join(gradleRoot, 'lib', 'src', 'main', 'java', 'smoke', 'Shared.java'),
    'package smoke; public final class Shared { public static String message() { return "gradle-reactor-runtime-ok"; } }\n'
  );
  await write(
    join(gradleRoot, 'app', 'src', 'main', 'java', 'smoke', 'Handler.java'),
    'package smoke; public final class Handler { public String handleRequest() { return Shared.message(); } public static void main(String[] args) { System.out.println(Shared.message()); } }\n'
  );
  const gradleDist = join(artifactsRoot, 'java-gradle');
  const gradleOutput = await buildUsingStacktapeJavaLambdaBuildpack({
    ...common,
    cwd: gradleRoot,
    name: 'synthetic-java-gradle',
    entryfilePath: 'app/src/main/java/smoke/Handler.java',
    distFolderPath: gradleDist,
    languageSpecificConfig: { javaVersion: 21, useMaven: false }
  });
  await assertRunOutput({
    dockerArgs: [
      '--mount',
      `type=bind,source=${gradleDist},target=/artifact,readonly`,
      'amazoncorretto:21',
      'java',
      '-cp',
      '/artifact:/artifact/lib/*',
      'smoke.Handler'
    ],
    expected: 'gradle-reactor-runtime-ok'
  });
  record('java21-lambda-gradle-reactor', gradleOutput);

  console.log('Building and executing a synthetic .NET ancestor-config and ProjectReference Lambda artifact...');
  const dotnetRoot = join(projectsRoot, 'dotnet');
  await write(
    join(dotnetRoot, 'Directory.Build.props'),
    '<Project><PropertyGroup><TargetFramework>net8.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings></PropertyGroup></Project>\n'
  );
  await write(
    join(dotnetRoot, 'Directory.Packages.props'),
    '<Project><PropertyGroup><ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally></PropertyGroup><ItemGroup><PackageVersion Include="Newtonsoft.Json" Version="13.0.3" /></ItemGroup></Project>\n'
  );
  await write(join(dotnetRoot, 'libs', 'Shared', 'Shared.csproj'), '<Project Sdk="Microsoft.NET.Sdk" />\n');
  await write(
    join(dotnetRoot, 'libs', 'Shared', 'Shared.cs'),
    'namespace Shared; public static class Value { public static int Number => 7; }\n'
  );
  await write(
    join(dotnetRoot, 'services', 'App', 'App.csproj'),
    '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><AssemblyName>Smoke</AssemblyName></PropertyGroup><ItemGroup><ProjectReference Include="../../libs/Shared/Shared.csproj" /><PackageReference Include="Newtonsoft.Json" /></ItemGroup></Project>\n'
  );
  await write(
    join(dotnetRoot, 'services', 'App', 'Program.cs'),
    'using Newtonsoft.Json; using Shared; Console.WriteLine("dotnet-runtime-ok:" + JsonConvert.SerializeObject(new { value = Value.Number }));\n'
  );
  const dotnetDist = join(artifactsRoot, 'dotnet');
  const dotnetOutput = await buildUsingStacktapeDotnetLambdaBuildpack({
    ...common,
    cwd: dotnetRoot,
    name: 'synthetic-dotnet',
    entryfilePath: 'services/App/Program.cs',
    distFolderPath: dotnetDist,
    languageSpecificConfig: {
      dotnetVersion: 8,
      projectFile: 'services/App/App.csproj'
    }
  });
  await assertFile(join(dotnetDist, 'Smoke.dll'));
  await assertNoGeneratedDockerfile(dotnetDist);
  await assertRunOutput({
    dockerArgs: [
      '--mount',
      `type=bind,source=${dotnetDist},target=/artifact,readonly`,
      'mcr.microsoft.com/dotnet/runtime:8.0',
      'dotnet',
      '/artifact/Smoke.dll'
    ],
    expected: 'dotnet-runtime-ok:{"value":7}'
  });
  record('dotnet8-lambda-project-reference', dotnetOutput);

  console.log('Building and executing a synthetic glibc Node image without external dependencies...');
  const esRoot = join(projectsRoot, 'es-image');
  await write(join(esRoot, 'src', 'index.ts'), 'console.log("es-glibc-runtime-ok");\n');
  const esImageTag = `stacktape-es-smoke:${Date.now()}`;
  const esImageOutput = await buildUsingStacktapeEsImageBuildpack({
    ...common,
    cwd: esRoot,
    name: esImageTag,
    entryfilePath: join(esRoot, 'src', 'index.ts'),
    distFolderPath: join(artifactsRoot, 'es-image'),
    languageSpecificConfig: { nodeVersion: 24, outputModuleFormat: 'esm' },
    buildDockerImage,
    checkDockerImageExists: async () => false,
    getDockerImageDetails,
    installDependencies: async () => undefined,
    nativeDependencyInstallationRootPath: join(artifactsRoot, 'es-native-install'),
    minify: true,
    nodeTarget: '24',
    requiresGlibcBinaries: true
  });
  await assertRunOutput({
    dockerArgs: [esImageTag],
    expected: 'es-glibc-runtime-ok'
  });
  record('es-node24-glibc-image', esImageOutput);

  console.log('Building and starting synthetic PHP image artifact...');
  const phpRoot = join(projectsRoot, 'php');
  await write(join(phpRoot, 'composer.json'), '{"name":"stacktape/smoke","require":{"psr/log":"3.0.2"}}\n');
  await write(
    join(phpRoot, 'public', 'index.php'),
    '<?php require __DIR__ . "/../vendor/autoload.php"; echo interface_exists("Psr\\\\Log\\\\LoggerInterface") ? "php-runtime-ok" : "missing-dependency";\n'
  );
  const phpDist = join(artifactsRoot, 'php');
  const phpOutput = await buildUsingStacktapePhpImageBuildpack({
    ...common,
    cwd: phpRoot,
    name: smokeImageTag,
    entryfilePath: 'public/index.php',
    distFolderPath: phpDist,
    languageSpecificConfig: { phpVersion: 8.3 },
    buildDockerImage
  });
  await assertNoGeneratedDockerfile(phpDist);
  const phpRun = await run('docker', ['run', '--rm', smokeImageTag]);
  if (phpRun.stdout.trim() !== 'php-runtime-ok') {
    throw new Error(`Unexpected PHP image output: ${phpRun.stdout}`);
  }
  const dockerfileLeak = await run('docker', [
    'run',
    '--rm',
    '--entrypoint',
    'sh',
    smokeImageTag,
    '-c',
    'test ! -e /app/Dockerfile && ! find /app -name "*.Dockerfile" -print -quit | grep -q .'
  ]);
  if (dockerfileLeak.exitCode !== 0) {
    throw new Error('A generated Dockerfile leaked into the PHP image.');
  }
  record('php-image', phpOutput);

  console.table(results);
  console.log(`Synthetic buildpack smoke passed (${results.length} real Docker builds).`);
} finally {
  await Promise.all(
    [...builtImageTags].map((imageTag) => run('docker', ['image', 'rm', '--force', imageTag]).catch(() => undefined))
  );
  await rm(root, { force: true, recursive: true });
}
