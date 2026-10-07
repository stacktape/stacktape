/**
 * Builds a small project with each Docker-backed buildpack and runs what it produced:
 * - Lambda buildpacks (Go, Go workspace, Python uv.lock and Pipfile, Ruby, Java Maven and Gradle reactors, .NET,
 *   Rust through cargo-lambda) run their artifact in a matching runtime image; the Rust `bootstrap` is invoked through
 *   the runtime interface emulator of `public.ecr.aws/lambda/provided:al2023`;
 * - the `js-bundle` image runs its entry file;
 * - the container `buildpack` (Railpack) builds a FastAPI app and a Node.js app, which must answer HTTP. The Node.js
 *   app's build writes a `buildEnvironment` value that the server returns: the value must reach the build, stay out of
 *   the image configuration and history, and a changed value must change the digest. The Railpack scenarios need a
 *   railpack binary (`STP_RAILPACK_BINARY`, the CLI's tools directory or PATH); without one they are skipped.
 *
 *   bun run scripts/synthetic-docker-smoke.ts
 */
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildDotnetLambda } from '../src/buildpacks/dotnet-lambda-buildpack';
import { buildGoLambda } from '../src/buildpacks/go-lambda-buildpack';
import { buildJavaLambda } from '../src/buildpacks/java-lambda-buildpack';
import { buildJsBundleImage } from '../src/buildpacks/js-bundle-image';
import { buildPythonLambda } from '../src/buildpacks/py-lambda-buildpack';
import { buildRubyLambda } from '../src/buildpacks/rb-lambda-buildpack';
import { buildRustLambda } from '../src/buildpacks/rust-lambda-buildpack';
import { buildUsingRailpack } from '../src/image/railpack';
import type { BuildDockerImage, PackagingOutput, RunRailpackPrepare } from '../src/runtime-contracts';
import {
  archiveItem,
  assertFile,
  assertRunOutput,
  createPackagingError,
  createRailpackPrepare,
  findRailpackBinary,
  invokeInLambdaImage,
  progressLogger,
  RAILPACK_FRONTEND_IMAGE,
  run,
  runDocker,
  write
} from './e2e-helpers';

/** `--only railpack` runs just the Railpack scenarios, for iterating on them. */
const onlyIndex = process.argv.indexOf('--only');
const only = onlyIndex === -1 ? undefined : process.argv[onlyIndex + 1];
if (only !== undefined && only !== 'railpack') throw new Error(`Unknown --only group ${only}; expected railpack.`);
const root = await mkdtemp(join(tmpdir(), 'stacktape-buildpack-smoke-'));
const projectsRoot = join(root, 'projects');
const artifactsRoot = join(root, 'artifacts');
const runId = Date.now();
const containerLabel = `stacktape.test=buildpack-smoke-${runId}`;
const builtImageTags = new Set<string>();

/**
 * Builds as the CLI does: build argument and secret values reach Docker through its environment only
 * (`--build-arg NAME`, `--secret id=NAME,env=NAME`), never on its command line.
 */
const buildDockerImage: BuildDockerImage = async ({
  buildContextPath,
  dockerfilePath,
  imageTag,
  dockerBuildOutputArchitecture,
  buildArgs = {},
  secrets = {}
}) => {
  builtImageTags.add(imageTag);
  const started = Date.now();
  const dockerfile = dockerfilePath ? resolve(buildContextPath, dockerfilePath) : undefined;
  const result = await run(
    'docker',
    [
      'image',
      'build',
      ...(dockerBuildOutputArchitecture ? ['--platform', dockerBuildOutputArchitecture] : []),
      '-t',
      imageTag,
      ...(dockerfile ? ['--file', dockerfile] : []),
      ...Object.keys(buildArgs).flatMap((name) => ['--build-arg', name]),
      ...Object.keys(secrets).flatMap((name) => ['--secret', `id=${name},env=${name}`]),
      buildContextPath
    ],
    undefined,
    { ...Bun.env, ...buildArgs, ...secrets }
  );
  const details = await getDockerImageDetails(imageTag);
  return { ...details, dockerOutput: result.stderr, duration: Date.now() - started };
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

/** Pulls an image only when it is not local, so repeated runs do not depend on the registry. */
const ensureImage = async (image: string) => {
  const present = await run('docker', ['image', 'inspect', image]).then(
    () => true,
    () => false
  );
  if (!present) await run('docker', ['pull', image]);
};

/** Starts an image with `PORT` set, waits until it answers `GET /` and returns the body. The container is removed. */
const fetchFromContainer = async (image: string, port = 8080): Promise<string> => {
  const name = `stacktape-buildpack-smoke-${runId}-${Math.random().toString(36).slice(2, 8)}`;
  await run('docker', [
    'run',
    '--detach',
    '--rm',
    '--name',
    name,
    '--label',
    containerLabel,
    '--env',
    `PORT=${port}`,
    '--publish',
    `127.0.0.1::${port}`,
    image
  ]);
  try {
    let lastError: unknown;
    for (let attempt = 0; attempt < 240; attempt += 1) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- Polls the server until it answers.
        const published = (await run('docker', ['port', name, `${port}/tcp`])).stdout.trim().match(/:(\d+)$/m)?.[1];
        if (published) {
          // oxlint-disable-next-line no-await-in-loop -- Polls the server until it answers.
          const response = await fetch(`http://127.0.0.1:${published}/`);
          // oxlint-disable-next-line no-await-in-loop -- Polls the server until it answers.
          const body = await response.text();
          if (response.ok) return body;
          lastError = new Error(`HTTP ${response.status}: ${body}`);
        }
      } catch (error) {
        lastError = error;
      }
      // oxlint-disable-next-line no-await-in-loop -- Polls the server until it answers.
      await Bun.sleep(250);
    }
    const logs = await run('docker', ['logs', name]).then(
      ({ stdout, stderr }) => `${stdout}${stderr}`,
      (error: unknown) => String(error)
    );
    throw new Error(`${image} did not answer HTTP on port ${port}: ${String(lastError)}\n${logs}`);
  } finally {
    await run('docker', ['rm', '--force', name]).catch(() => undefined);
  }
};

const common = {
  existingDigests: [],
  invocationId: 'synthetic-smoke',
  progressLogger,
  createPackagingError,
  runDocker,
  archiveItem,
  sizeLimit: 250,
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
  detection?: string | undefined;
}[] = [];
const skipped: string[] = [];

const record = (buildpack: string, output: PackagingOutput) => {
  results.push({
    buildpack,
    sizeMb: output.size ?? null,
    ...('zippedSize' in output && typeof output.zippedSize === 'number' ? { zippedSizeMb: output.zippedSize } : {}),
    ...(typeof output.details?.detection === 'string' ? { detection: output.details.detection } : {})
  });
};

/** `composer.lock` of the PHP Railpack fixture: one locked dependency, `psr/log` 3.0.2. */
const PHP_COMPOSER_LOCK = {
  _readme: [
    'This file locks the dependencies of your project to a known state',
    'Read more about it at https://getcomposer.org/doc/01-basic-usage.md#installing-dependencies',
    'This file is @generated automatically'
  ],
  'content-hash': 'b164dcc3b5d03c5541d1f415817252cc',
  packages: [
    {
      name: 'psr/log',
      version: '3.0.2',
      source: {
        type: 'git',
        url: 'https://github.com/php-fig/log.git',
        reference: 'f16e1d5863e37f8d8c2a01719f5b34baa2b714d3'
      },
      dist: {
        type: 'zip',
        url: 'https://api.github.com/repos/php-fig/log/zipball/f16e1d5863e37f8d8c2a01719f5b34baa2b714d3',
        reference: 'f16e1d5863e37f8d8c2a01719f5b34baa2b714d3',
        shasum: ''
      },
      require: {
        php: '>=8.0.0'
      },
      type: 'library',
      extra: {
        'branch-alias': {
          'dev-master': '3.x-dev'
        }
      },
      autoload: {
        'psr-4': {
          'Psr\\Log\\': 'src'
        }
      },
      'notification-url': 'https://packagist.org/downloads/',
      license: ['MIT'],
      authors: [
        {
          name: 'PHP-FIG',
          homepage: 'https://www.php-fig.org/'
        }
      ],
      description: 'Common interface for logging libraries',
      homepage: 'https://github.com/php-fig/log',
      keywords: ['log', 'psr', 'psr-3'],
      support: {
        source: 'https://github.com/php-fig/log/tree/3.0.2'
      },
      time: '2024-09-11T13:17:53+00:00'
    }
  ],
  'packages-dev': [],
  aliases: [],
  'minimum-stability': 'stable',
  'stability-flags': {},
  'prefer-stable': false,
  'prefer-lowest': false,
  platform: {
    php: '>=8.2'
  },
  'platform-dev': {},
  'plugin-api-version': '2.9.0'
};

/** The Node.js Railpack app's build writes this variable into the file its server returns. */
const buildMessage = (value: string) => [{ name: 'BUILD_MESSAGE', value }];

const railpackScenarios = async (runRailpackPrepare: RunRailpackPrepare) => {
  const railpack = {
    cwd: projectsRoot,
    progressLogger,
    existingDigests: [] as string[],
    railpackFrontendImage: RAILPACK_FRONTEND_IMAGE,
    buildDockerImage,
    runRailpackPrepare,
    createPackagingError
  };

  console.log('Building and serving a FastAPI app with the Railpack buildpack...');
  const fastapiRoot = join(projectsRoot, 'railpack-fastapi');
  await write(join(fastapiRoot, 'requirements.txt'), 'fastapi==0.118.0\nuvicorn==0.37.0\n');
  await write(
    join(fastapiRoot, 'main.py'),
    'from fastapi import FastAPI\n\napp = FastAPI()\n\n\n@app.get("/")\ndef root():\n    return {"message": "railpack-fastapi-ok"}\n'
  );
  const fastapiTag = `stacktape-buildpack-smoke-railpack-fastapi:${runId}`;
  const fastapiOutput = await buildUsingRailpack({
    ...railpack,
    name: fastapiTag,
    sourceDirectoryPath: 'railpack-fastapi'
  });
  const fastapiBody = await fetchFromContainer(fastapiTag);
  if (!fastapiBody.includes('railpack-fastapi-ok')) {
    throw new Error(`Unexpected FastAPI response: ${fastapiBody}`);
  }
  record('railpack-fastapi-image', fastapiOutput);

  console.log('Building and serving a Node.js app with a build variable through the Railpack buildpack...');
  const nodeRoot = join(projectsRoot, 'railpack-node');
  await write(
    join(nodeRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'railpack-smoke',
        version: '1.0.0',
        private: true,
        scripts: { build: 'node build.js', start: 'node server.js' }
      },
      null,
      2
    )}\n`
  );
  await write(
    join(nodeRoot, 'build.js'),
    "require('node:fs').writeFileSync('build-output.txt', process.env.BUILD_MESSAGE ?? 'BUILD_MESSAGE is missing');\n"
  );
  await write(
    join(nodeRoot, 'server.js'),
    [
      "const { createServer } = require('node:http');",
      "const { readFileSync } = require('node:fs');",
      "const message = readFileSync(`${__dirname}/build-output.txt`, 'utf8');",
      'createServer((request, response) => response.end(`railpack-node-ok:${message}`)).listen(process.env.PORT || 3000);',
      ''
    ].join('\n')
  );
  const firstValue = `first-build-value-${runId}`;
  const nodeTag = `stacktape-buildpack-smoke-railpack-node:${runId}`;
  const nodeOutput = await buildUsingRailpack({
    ...railpack,
    name: nodeTag,
    sourceDirectoryPath: 'railpack-node',
    buildEnvironment: buildMessage(firstValue)
  });
  const nodeBody = await fetchFromContainer(nodeTag);
  if (nodeBody !== `railpack-node-ok:${firstValue}`) {
    throw new Error(`The build variable did not reach the Railpack build: ${nodeBody}`);
  }
  const imageMetadata = [
    (await run('docker', ['image', 'inspect', nodeTag, '--format', '{{json .Config}}'])).stdout,
    (await run('docker', ['image', 'history', '--no-trunc', '--format', '{{.CreatedBy}}', nodeTag])).stdout
  ].join('\n');
  if (imageMetadata.includes(firstValue)) {
    throw new Error('The build variable value appears in the image configuration or history.');
  }
  record('railpack-node-image', nodeOutput);

  const repeat = await buildUsingRailpack({
    ...railpack,
    name: `stacktape-buildpack-smoke-railpack-node-repeat:${runId}`,
    existingDigests: [nodeOutput.digest],
    sourceDirectoryPath: 'railpack-node',
    buildEnvironment: buildMessage(firstValue)
  });
  if (repeat.outcome !== 'skipped' || repeat.digest !== nodeOutput.digest) {
    throw new Error(`An unchanged Railpack build was not reused: ${repeat.outcome} ${repeat.digest}`);
  }

  const secondValue = `second-build-value-${runId}`;
  const changedTag = `stacktape-buildpack-smoke-railpack-node-changed:${runId}`;
  const changedOutput = await buildUsingRailpack({
    ...railpack,
    name: changedTag,
    existingDigests: [nodeOutput.digest],
    sourceDirectoryPath: 'railpack-node',
    buildEnvironment: buildMessage(secondValue)
  });
  if (changedOutput.outcome !== 'bundled' || changedOutput.digest === nodeOutput.digest) {
    throw new Error(`A changed build variable did not change the digest: ${changedOutput.digest}`);
  }
  const changedBody = await fetchFromContainer(changedTag);
  if (changedBody !== `railpack-node-ok:${secondValue}`) {
    throw new Error(`The changed build variable did not reach the rebuilt image: ${changedBody}`);
  }
  record('railpack-node-image-changed-build-variable', changedOutput);

  console.log('Building and serving a PHP app with Composer dependencies through the Railpack buildpack...');
  const phpRoot = join(projectsRoot, 'railpack-php');
  await write(
    join(phpRoot, 'composer.json'),
    `${JSON.stringify(
      {
        name: 'stacktape/smoke-php',
        type: 'project',
        require: { php: '>=8.2', 'psr/log': '3.0.2' },
        autoload: { 'psr-4': { 'Smoke\\': 'src/' } }
      },
      null,
      2
    )}\n`
  );
  // Generated by `composer update --no-install` for exactly the manifest above; Railpack's `composer install`
  // installs this lock without resolving, so the build is pinned.
  await write(join(phpRoot, 'composer.lock'), `${JSON.stringify(PHP_COMPOSER_LOCK, null, 2)}\n`);
  await write(
    join(phpRoot, 'src', 'Greeting.php'),
    '<?php\nnamespace Smoke;\n\nfinal class Greeting\n{\n    public static function text(): string\n    {\n        return "railpack-php-ok";\n    }\n}\n'
  );
  // A plain PHP app with its front controller at the project root, which Railpack's PHP image serves as the document
  // root; the Composer autoloader must resolve both the project's own PSR-4 class and the locked dependency.
  await write(
    join(phpRoot, 'index.php'),
    [
      '<?php',
      "require __DIR__ . '/vendor/autoload.php';",
      '$logger = new \\Psr\\Log\\NullLogger();',
      "$logger->info('smoke');",
      "echo \\Smoke\\Greeting::text() . ':' . (class_exists(\\Psr\\Log\\NullLogger::class) ? 'composer' : 'no-composer');",
      ''
    ].join('\n')
  );
  const phpTag = `stacktape-buildpack-smoke-railpack-php:${runId}`;
  const phpOutput = await buildUsingRailpack({
    ...railpack,
    name: phpTag,
    sourceDirectoryPath: 'railpack-php'
  });
  const phpBody = await fetchFromContainer(phpTag);
  if (phpBody !== 'railpack-php-ok:composer') {
    throw new Error(`The PHP app did not answer through Composer's autoloader: ${phpBody}`);
  }
  if (typeof phpOutput.details?.detection !== 'string' || !phpOutput.details.detection.includes('php')) {
    throw new Error(`Railpack did not report the PHP provider: ${JSON.stringify(phpOutput.details)}`);
  }
  record('railpack-php-composer-image', phpOutput);
};

try {
  await mkdir(projectsRoot, { recursive: true });
  await mkdir(artifactsRoot, { recursive: true });
  await run('docker', ['version', '--format', '{{.Server.Version}}']);

  if (only !== 'railpack') await buildpackScenarios();

  const railpackBinary = findRailpackBinary();
  if (railpackBinary) {
    console.log(`Using railpack at ${railpackBinary}.`);
    await railpackScenarios(createRailpackPrepare(railpackBinary));
  } else {
    skipped.push(
      'Railpack buildpack (FastAPI, Node.js with build variable, PHP with Composer): no railpack binary. Set STP_RAILPACK_BINARY, run a CLI Railpack build once to download it, or put railpack on PATH.'
    );
  }

  console.table(results);
  for (const reason of skipped) console.log(`SKIPPED  ${reason}`);
  console.log(
    `Synthetic buildpack smoke passed (${results.length} real Docker builds${skipped.length > 0 ? `, ${skipped.length} scenario group skipped` : ''}).`
  );
} finally {
  const containers = (
    await run('docker', ['ps', '-aq', '--filter', `label=${containerLabel}`]).catch(() => undefined)
  )?.stdout
    .split('\n')
    .filter(Boolean);
  if (containers && containers.length > 0) {
    await run('docker', ['rm', '--force', ...containers]).catch(() => undefined);
  }
  await Promise.all(
    [...builtImageTags].map((imageTag) => run('docker', ['image', 'rm', '--force', imageTag]).catch(() => undefined))
  );
  await rm(root, { force: true, recursive: true });
}

/** Every Docker-backed Lambda buildpack and the js-bundle image, in order; one Docker build at a time. */
async function buildpackScenarios() {
  console.log('Building synthetic Go Lambda artifact...');
  const goRoot = join(projectsRoot, 'go');
  await write(join(goRoot, 'go.mod'), 'module example.com/stacktape-smoke\n\ngo 1.23\n');
  await write(
    join(goRoot, 'cmd', 'worker', 'main.go'),
    'package main\n\nimport _ "embed"\n\n//go:embed message.txt\nvar message string\n\nfunc main() { println(message) }\n'
  );
  await write(join(goRoot, 'cmd', 'worker', 'message.txt'), 'embedded-runtime-asset');
  const goDist = join(artifactsRoot, 'go');
  const goOutput = await buildGoLambda({
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
  const goWorkspaceOutput = await buildGoLambda({
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

  console.log('Building and invoking a synthetic Rust Lambda artifact...');
  const rustRoot = join(projectsRoot, 'rust');
  await write(
    join(rustRoot, 'Cargo.toml'),
    '[package]\nname = "stacktape-smoke"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\nlambda_runtime = "0.14"\nserde_json = "1"\ntokio = { version = "1", features = ["macros"] }\n'
  );
  await write(
    join(rustRoot, 'src', 'main.rs'),
    [
      'use lambda_runtime::{run, service_fn, Error, LambdaEvent};',
      'use serde_json::{json, Value};',
      '',
      'async fn handler(event: LambdaEvent<Value>) -> Result<Value, Error> {',
      '    let name = event.payload.get("name").and_then(Value::as_str).unwrap_or("nobody");',
      '    Ok(json!({ "message": format!("rust-runtime-ok:{name}") }))',
      '}',
      '',
      '#[tokio::main]',
      'async fn main() -> Result<(), Error> {',
      '    run(service_fn(handler)).await',
      '}',
      ''
    ].join('\n')
  );
  const rustDist = join(artifactsRoot, 'rust');
  const rustOutput = await buildRustLambda({
    ...common,
    cwd: rustRoot,
    name: 'synthetic-rust',
    entryfilePath: 'src/main.rs',
    distFolderPath: rustDist
  });
  await assertFile(join(rustDist, 'bootstrap'));
  await assertNoGeneratedDockerfile(rustDist);
  await ensureImage('public.ecr.aws/lambda/provided:al2023');
  const rustResponse = await invokeInLambdaImage<{ message?: string }>({
    functionDirectory: rustDist,
    event: { name: 'stacktape' },
    containerLabel,
    runtimeImage: 'public.ecr.aws/lambda/provided:al2023',
    handler: 'bootstrap'
  });
  if (rustResponse.message !== 'rust-runtime-ok:stacktape') {
    throw new Error(`Unexpected Rust Lambda response: ${JSON.stringify(rustResponse)}`);
  }
  record('rust-lambda-provided-al2023', rustOutput);

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
  const pythonOutput = await buildPythonLambda({
    ...common,
    cwd: pythonRoot,
    name: 'synthetic-python',
    entryfilePath: 'app/handler.py',
    distFolderPath: pythonDist,
    pythonVersion: 3.14,
    python: { packageManagerFile: 'uv.lock' }
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
  const pipfileOutput = await buildPythonLambda({
    ...common,
    cwd: pipfileRoot,
    name: 'synthetic-python-pipfile',
    entryfilePath: 'src/handler.py',
    distFolderPath: pipfileDist,
    pythonVersion: 3.12,
    python: { packageManagerFile: 'Pipfile' }
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

  console.log('Building synthetic Ruby Lambda artifact...');
  const rubyRoot = join(projectsRoot, 'ruby');
  await write(join(rubyRoot, 'gems.rb'), 'source "https://rubygems.org"\ngem "base64", "0.3.0"\n');
  await write(
    join(rubyRoot, 'src', 'handler.rb'),
    'require "base64"\ndef handler(event:, context:)\n  { value: Base64.strict_encode64("ruby-runtime-ok") }\nend\n'
  );
  const rubyDist = join(artifactsRoot, 'ruby');
  const rubyOutput = await buildRubyLambda({
    ...common,
    cwd: rubyRoot,
    name: 'synthetic-ruby',
    entryfilePath: 'src/handler.rb',
    distFolderPath: rubyDist,
    rubyVersion: 4
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
  const javaOutput = await buildJavaLambda({
    ...common,
    cwd: javaRoot,
    name: 'synthetic-java',
    entryfilePath: 'app/src/main/java/smoke/Handler.java',
    distFolderPath: javaDist,
    javaVersion: 21,
    java: { useMaven: true }
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
  const gradleOutput = await buildJavaLambda({
    ...common,
    cwd: gradleRoot,
    name: 'synthetic-java-gradle',
    entryfilePath: 'app/src/main/java/smoke/Handler.java',
    distFolderPath: gradleDist,
    javaVersion: 21,
    java: { useMaven: false }
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
  const dotnetOutput = await buildDotnetLambda({
    ...common,
    cwd: dotnetRoot,
    name: 'synthetic-dotnet',
    entryfilePath: 'services/App/Program.cs',
    distFolderPath: dotnetDist,
    dotnetVersion: 8,
    dotnet: { projectFile: 'services/App/App.csproj' }
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

  console.log('Building and executing a synthetic glibc js-bundle image without external dependencies...');
  const esRoot = join(projectsRoot, 'es-image');
  await write(join(esRoot, 'src', 'index.ts'), 'console.log("es-glibc-runtime-ok");\n');
  const esImageTag = `stacktape-buildpack-smoke-js-bundle:${runId}`;
  const esImageOutput = await buildJsBundleImage({
    ...common,
    cwd: esRoot,
    name: esImageTag,
    entryfilePath: join(esRoot, 'src', 'index.ts'),
    distFolderPath: join(artifactsRoot, 'es-image'),
    nodeVersion: 24,
    outputModuleFormat: 'esm',
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
  record('js-bundle-node24-glibc-image', esImageOutput);

  for (const runtime of ['bun', 'deno'] as const) {
    console.log(`Building and executing a synthetic js-bundle image on the ${runtime} runtime...`);
    const runtimeRoot = join(projectsRoot, `es-image-${runtime}`);
    // oxlint-disable-next-line no-await-in-loop -- one Docker build at a time keeps the daemon load bounded.
    await write(
      join(runtimeRoot, 'src', 'index.ts'),
      [
        "import { createHash } from 'node:crypto';",
        "const digest = createHash('sha256').update('stacktape').digest('hex').slice(0, 8);",
        'console.log(`es-' + runtime + '-runtime-ok:${digest}`);',
        ''
      ].join('\n')
    );
    const runtimeImageTag = `stacktape-buildpack-smoke-js-bundle-${runtime}:${runId}`;
    // oxlint-disable-next-line no-await-in-loop -- one Docker build at a time keeps the daemon load bounded.
    const runtimeOutput = await buildJsBundleImage({
      ...common,
      cwd: runtimeRoot,
      name: runtimeImageTag,
      entryfilePath: join(runtimeRoot, 'src', 'index.ts'),
      distFolderPath: join(artifactsRoot, `es-image-${runtime}`),
      nodeVersion: 24,
      outputModuleFormat: 'esm',
      runtime,
      buildDockerImage,
      checkDockerImageExists: async () => false,
      getDockerImageDetails,
      installDependencies: async () => undefined,
      nativeDependencyInstallationRootPath: join(artifactsRoot, `es-native-install-${runtime}`),
      minify: true,
      nodeTarget: '24',
      requiresGlibcBinaries: true
    });
    // oxlint-disable-next-line no-await-in-loop -- one Docker build at a time keeps the daemon load bounded.
    await assertRunOutput({ dockerArgs: [runtimeImageTag], expected: `es-${runtime}-runtime-ok:8fd1032d` });
    record(`js-bundle-${runtime}-image`, runtimeOutput);
  }
}
