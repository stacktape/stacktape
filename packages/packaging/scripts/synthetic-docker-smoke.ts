/**
 * Builds a small project with each Docker-backed buildpack and runs what it produced:
 * - Lambda buildpacks (Go, Go workspace, .NET,
 *   Rust through cargo-lambda) run their artifact in a matching runtime image; the Go and Rust `bootstrap` are invoked through
 *   the runtime interface emulator of `public.ecr.aws/lambda/provided:al2023`;
 * - Python dependencies, Ruby native gems and Java Lambda reactors live in `lambda-e2e` (test:language-lambdas);
 * - the `js-bundle` image runs its entry file;
 * - the container `buildpack` (Railpack) builds a FastAPI app, a Node.js app and a PHP app, which must answer HTTP. Python
 *   apps are built on the official slim image: pip and uv projects run, a source-only change reuses the installed
 *   dependencies, and a dependency without a wheel is compiled with the fallback build tools. The Node.js
 *   app's build writes a `buildEnvironment` value that the server returns: the value must reach the build, stay out of
 *   the image configuration and history, and a changed value must change the digest. The Railpack scenarios need a
 *   railpack binary (`STP_RAILPACK_BINARY`, the CLI's tools directory or PATH); the lane fails before building when the binary is unavailable.
 *
 *   bun run scripts/synthetic-docker-smoke.ts
 */
import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { buildDotnetLambda } from '../src/buildpacks/dotnet-lambda-buildpack';
import { buildGoLambda } from '../src/buildpacks/go-lambda-buildpack';
import { buildJsBundleImage } from '../src/buildpacks/js-bundle-image';
import { buildRustLambda } from '../src/buildpacks/rust-lambda-buildpack';
import { buildUsingRailpack } from '../src/image/railpack';
import type {
  BuildDockerImage,
  CreatePackagingError,
  PackagingOutput,
  RunDocker,
  RunRailpackPrepare
} from '../src/runtime-contracts';
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

/** Select a family for iteration and fault checks; the default qualifies every family. */
const onlyIndex = process.argv.indexOf('--only');
const only = onlyIndex === -1 ? undefined : process.argv[onlyIndex + 1];
const groups = [
  'go',
  'rust',
  'dotnet',
  'js-bundle',
  'railpack',
  'railpack-node',
  'railpack-php',
  'railpack-python',
  'railpack-diagnostics'
];
if (onlyIndex !== -1 && !groups.includes(only ?? '')) throw new Error(`Unknown --only group ${only}.`);
const railpackBinary = findRailpackBinary();
if ((!only || only.startsWith('railpack')) && !railpackBinary) {
  throw new Error('Railpack qualification needs the pinned binary: set STP_RAILPACK_BINARY or put railpack on PATH.');
}
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
  if (dockerfile && (await Bun.file(dockerfile).text()).startsWith('{')) {
    const fromProject = relative(root, dockerfile);
    assert.ok(
      fromProject.startsWith('..') && !isAbsolute(fromProject),
      'The Railpack plan must stay outside the project tree.'
    );
  }
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

const PROBE_MESSAGE = 'digest probe: the buildpack reached Docker';
/** Refuses every build: a buildpack that gets this far decided its digest changed. */
const probeRunDocker: RunDocker = async () => {
  throw new Error(PROBE_MESSAGE);
};
/** The buildpack must treat the input as changed and attempt a build. */
const expectRebuild = (what: string, build: () => Promise<unknown>) =>
  assert.rejects(
    build,
    (error: unknown) => error instanceof Error && error.message === PROBE_MESSAGE,
    `${what} must change the digest and rebuild`
  );
/** The buildpack must reuse the previous artifact without reaching Docker. */
const expectReuse = async (what: string, build: () => Promise<PackagingOutput>) => {
  assert.equal((await build()).outcome, 'skipped', `${what} must reuse the previous build`);
};

/** The `e_machine` of an ELF executable: 0x3e is x86_64, 0xb7 is aarch64. */
const elfMachine = async (path: string) => {
  const bytes = new Uint8Array(await Bun.file(path).arrayBuffer());
  assert.deepEqual(Array.from(bytes.slice(0, 4)), [0x7f, 0x45, 0x4c, 0x46], `${path} is not an ELF executable`);
  return bytes[18]! | (bytes[19]! << 8);
};

// Generated Dockerfiles are written alone in an stp-image-/stp-artifact- directory and removed with it.
const isGeneratedBuildFile = (name: string) =>
  name.endsWith('.Dockerfile') || name === 'Dockerfile' || /^stp-(image|artifact)-/.test(name);

const assertNoGeneratedDockerfile = async (directory: string) => {
  const names = await readdir(directory);
  if (names.some(isGeneratedBuildFile)) {
    throw new Error(`Generated Dockerfile leaked into ${directory}: ${names.join(', ')}`);
  }
};

const results: {
  buildpack: string;
  sizeMb: number | null;
  zippedSizeMb?: number | undefined;
  detection?: string | undefined;
}[] = [];

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

/** Whether BuildKit reused the step Railpack named `stepName` (`#12 uv pip install ...` followed by `#12 CACHED`). */
const stepWasCached = (output: PackagingOutput, stepName: string) => {
  const dockerOutput = String(output.details?.dockerOutput ?? '');
  const lines = dockerOutput.split('\n');
  const id = lines.find((line) => line.endsWith(` ${stepName}`) && /^#\d+ /.test(line))?.split(' ')[0];
  return id !== undefined && lines.includes(`${id} CACHED`);
};

/** A Python HTTP server on the standard library that answers `GET /` with `body`, a Python expression. */
const pythonServer = (body: string) =>
  [
    'import os',
    'from http.server import BaseHTTPRequestHandler, HTTPServer',
    '',
    '',
    'class Handler(BaseHTTPRequestHandler):',
    '    def do_GET(self):',
    `        payload = (${body}).encode()`,
    '        self.send_response(200)',
    '        self.send_header("content-length", str(len(payload)))',
    '        self.end_headers()',
    '        self.wfile.write(payload)',
    '',
    '',
    'HTTPServer(("0.0.0.0", int(os.environ["PORT"])), Handler).serve_forever()',
    ''
  ].join('\n');

/** `uv lock` output for the uv project: it depends on `idna==3.10` and is itself a package (`editable`). */
const UV_LOCK = `version = 1
revision = 5
requires-python = ">=3.12"

[[package]]
name = "idna"
version = "3.10"
source = { registry = "https://pypi.org/simple" }
sdist = { url = "https://files.pythonhosted.org/packages/f1/70/7703c29685631f5a7590aa73f1f1d3fa9a380e654b86af429e0934a32f7d/idna-3.10.tar.gz", hash = "sha256:12f65c9b470abda6dc35cf8e63cc574b1c52b11df2c86030af0ac09b01b13ea9", size = 190490, upload-time = "2024-09-15T18:07:39.745Z" }
wheels = [
    { url = "https://files.pythonhosted.org/packages/76/c6/c88e154df9c4e1a2a66ccf0005a88dfb2650c1dffb6f5ce603dfbd452ce3/idna-3.10-py3-none-any.whl", hash = "sha256:946d195a0d259cbba61165e88e65941f16e9b36ea6ddb97f00452bae8b1287d3", size = 70442, upload-time = "2024-09-15T18:07:37.964Z" },
]

[[package]]
name = "railpack-uv"
version = "0.1.0"
source = { editable = "." }
dependencies = [
    { name = "idna" },
]

[package.metadata]
requires-dist = [{ name = "idna", specifier = "==3.10" }]
`;

const railpackPackagingError: CreatePackagingError = ({ message, type, cause }) =>
  Object.assign(new Error(message, { cause }), { type });

const railpackScenarios = async (runRailpackPrepare: RunRailpackPrepare) => {
  const previousProjects = new Set(await readdir(projectsRoot));
  const railpack = {
    cwd: projectsRoot,
    progressLogger,
    existingDigests: [] as string[],
    railpackFrontendImage: RAILPACK_FRONTEND_IMAGE,
    buildDockerImage,
    runRailpackPrepare,
    createPackagingError: railpackPackagingError
  };

  await assert.rejects(
    buildUsingRailpack({ ...railpack, name: 'missing', sourceDirectoryPath: 'missing' }),
    (error: unknown) =>
      error instanceof Error &&
      'type' in error &&
      error.type === 'PACKAGING' &&
      error.message.includes('does not exist')
  );
  await write(join(projectsRoot, 'unsupported', 'notes.txt'), 'no language manifest');
  await assert.rejects(
    buildUsingRailpack({ ...railpack, name: 'unsupported', sourceDirectoryPath: 'unsupported' }),
    (error: unknown) =>
      error instanceof Error &&
      'type' in error &&
      error.type === 'RAILPACK' &&
      error.message.includes('unsupported') &&
      error.message.includes('Railpack could not determine how to build the app')
  );

  if (only === 'railpack-diagnostics') return;
  if (only !== 'railpack-node' && only !== 'railpack-php') {
    console.log('Building and serving a FastAPI app on the official Python image...');
    const fastapiRoot = join(projectsRoot, 'railpack-fastapi');
    await write(join(fastapiRoot, 'requirements.txt'), 'fastapi==0.118.0\nuvicorn==0.37.0\n');
    await write(
      join(fastapiRoot, 'main.py'),
      'from fastapi import FastAPI\n\napp = FastAPI()\n\n\n@app.get("/")\ndef root():\n    return {"message": "railpack-fastapi-ok"}\n'
    );
    // Stacktape's own output directory in the project must stay out of the image and the digest.
    await write(join(fastapiRoot, '.stacktape', 'invocation.log'), 'first invocation\n');
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
    assert.match(String(fastapiOutput.details?.detection), /built on python:\d+\.\d+\.\d+-slim/);
    // Neither mise nor its interpreter, nor the project's .stacktape directory, is in the image.
    await run('docker', [
      'run',
      '--rm',
      '--entrypoint',
      'sh',
      fastapiTag,
      '-c',
      'test ! -e /mise && test ! -e /usr/local/bin/mise && test ! -e /app/.stacktape && test -x /app/.venv/bin/pip'
    ]);
    record('railpack-fastapi-image', fastapiOutput);

    await write(join(fastapiRoot, '.stacktape', 'invocation.log'), 'second invocation\n');
    const unchanged = await buildUsingRailpack({
      ...railpack,
      name: `stacktape-buildpack-smoke-railpack-fastapi-unchanged:${runId}`,
      existingDigests: [fastapiOutput.digest],
      sourceDirectoryPath: 'railpack-fastapi'
    });
    assert.equal(unchanged.outcome, 'skipped', 'A new .stacktape file must not rebuild an unchanged project.');

    await write(
      join(fastapiRoot, 'main.py'),
      'from fastapi import FastAPI\n\napp = FastAPI()\n\n\n@app.get("/")\ndef root():\n    return {"message": "railpack-fastapi-changed"}\n'
    );
    const fastapiChangedTag = `stacktape-buildpack-smoke-railpack-fastapi-changed:${runId}`;
    const fastapiChanged = await buildUsingRailpack({
      ...railpack,
      name: fastapiChangedTag,
      existingDigests: [fastapiOutput.digest],
      sourceDirectoryPath: 'railpack-fastapi'
    });
    assert.ok(
      stepWasCached(fastapiChanged, 'uv pip install -r requirements.txt'),
      `A source-only change must reuse the installed dependencies:\n${String(fastapiChanged.details?.dockerOutput)}`
    );
    assert.match(await fetchFromContainer(fastapiChangedTag), /railpack-fastapi-changed/);
    record('railpack-fastapi-source-change', fastapiChanged);
  }
  if (only === 'railpack-python') {
    await pythonRailpackScenarios(railpack);
    return;
  }
  if (only !== 'railpack-php') {
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
      "const fs = require('node:fs'); fs.writeFileSync('build-output.txt', (process.env.BUILD_MESSAGE ?? 'BUILD_MESSAGE is missing') + ':' + fs.readFileSync('generated/config.json', 'utf8').trim());\n"
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
    await write(join(nodeRoot, '.dockerignore'), '*.log\ngenerated\n!generated/config.json\n');
    await write(join(nodeRoot, 'notes.log'), 'ignored-one\n');
    await write(join(nodeRoot, 'generated', 'config.json'), 'selected\n');
    const firstValue = `first-build-value-${runId}`;
    const nodeTag = `stacktape-buildpack-smoke-railpack-node:${runId}`;
    const nodeOutput = await buildUsingRailpack({
      ...railpack,
      name: nodeTag,
      sourceDirectoryPath: 'railpack-node',
      buildEnvironment: buildMessage(firstValue)
    });
    const nodeBody = await fetchFromContainer(nodeTag);
    if (nodeBody !== `railpack-node-ok:${firstValue}:selected`) {
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

    await write(join(nodeRoot, 'notes.log'), 'ignored-two\n');
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
    if (changedBody !== `railpack-node-ok:${secondValue}:selected`) {
      throw new Error(`The changed build variable did not reach the rebuilt image: ${changedBody}`);
    }
    record('railpack-node-image-changed-build-variable', changedOutput);
    await write(join(nodeRoot, 'generated', 'config.json'), 'changed-selection\n');
    const selectedTag = `stacktape-buildpack-smoke-railpack-selected:${runId}`;
    const selectedOutput = await buildUsingRailpack({
      ...railpack,
      name: selectedTag,
      existingDigests: [changedOutput.digest],
      sourceDirectoryPath: 'railpack-node',
      buildEnvironment: buildMessage(secondValue)
    });
    assert.equal(selectedOutput.outcome, 'bundled', 'a negated exclusion must invalidate the image');
    assert.equal(await fetchFromContainer(selectedTag), `railpack-node-ok:${secondValue}:changed-selection`);
    record('railpack-node-selected-context', selectedOutput);
    const planChangedTag = `stacktape-buildpack-smoke-railpack-plan:${runId}`;
    const planChanged = await buildUsingRailpack({
      ...railpack,
      name: planChangedTag,
      existingDigests: [selectedOutput.digest],
      sourceDirectoryPath: 'railpack-node',
      buildEnvironment: buildMessage(secondValue),
      installCommand:
        "mkdir -p node_modules && node -e \"require('node:fs').writeFileSync('install-proof.txt', 'install-ok')\"",
      buildCommand:
        "node -e \"const fs = require('node:fs'); fs.writeFileSync('build-output.txt', 'new-plan:' + fs.readFileSync('install-proof.txt', 'utf8'))\""
    });
    assert.equal(planChanged.outcome, 'bundled', 'changed build instructions must invalidate the image');
    assert.equal(await fetchFromContainer(planChangedTag), 'railpack-node-ok:new-plan:install-ok');
    assert.deepEqual((await readdir(projectsRoot)).filter((name) => !previousProjects.has(name)).toSorted(), [
      ...(only === 'railpack-node' ? [] : ['railpack-fastapi']),
      'railpack-node',
      'unsupported'
    ]);
    await assertNoGeneratedDockerfile(nodeRoot);
    record('railpack-node-plan-and-selected-context', planChanged);
  }
  if (only !== 'railpack-node') {
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
        "echo \\Smoke\\Greeting::text() . ':' . (class_exists(\\Psr\\Log\\NullLogger::class) ? 'composer' : 'no-composer') . ':' . PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION;",
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
    if (!/^railpack-php-ok:composer:8\.\d+$/.test(phpBody)) {
      throw new Error(`The PHP app did not answer through Composer's autoloader: ${phpBody}`);
    }
    if (typeof phpOutput.details?.detection !== 'string' || !phpOutput.details.detection.includes('php')) {
      throw new Error(`Railpack did not report the PHP provider: ${JSON.stringify(phpOutput.details)}`);
    }
    record('railpack-php-composer-image', phpOutput);

    // The same app with its own start command and a system package it shells out to at runtime.
    await write(
      join(phpRoot, 'router.php'),
      [
        '<?php',
        "require __DIR__ . '/vendor/autoload.php';",
        "$jq = trim((string) shell_exec('jq --version 2>/dev/null'));",
        "echo 'custom-start:' . \\Smoke\\Greeting::text() . ':' . ($jq === '' ? 'no-jq' : 'jq') . ':' . PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION;",
        ''
      ].join('\n')
    );
    const phpCustomTag = `stacktape-buildpack-smoke-railpack-php-custom:${runId}`;
    const phpCustomOutput = await buildUsingRailpack({
      ...railpack,
      name: phpCustomTag,
      existingDigests: [phpOutput.digest],
      sourceDirectoryPath: 'railpack-php',
      aptPackages: ['jq'],
      startCommand: 'php -S 0.0.0.0:$PORT router.php'
    });
    assert.equal(phpCustomOutput.outcome, 'bundled', 'a start command and apt packages must change the image');
    assert.match(await fetchFromContainer(phpCustomTag), /^custom-start:railpack-php-ok:jq:8\.\d+$/);
    record('railpack-php-custom-start-image', phpCustomOutput);
  }
  if (!only || only === 'railpack') await pythonRailpackScenarios(railpack);
};

/**
 * A uv project, and a pip project with a dependency that has no wheel, on the official Python image. The uv project
 * compiles its own C extension when Railpack's build step installs it, and starts through `uv run`, so the compiler
 * fallback must cover that step and uv must be in the runtime image.
 */
async function pythonRailpackScenarios(railpack: Omit<Parameters<typeof buildUsingRailpack>[0], 'name'>) {
  console.log('Building and serving a uv project with its own C extension on the official Python image...');
  const uvRoot = join(projectsRoot, 'railpack-uv');
  await write(
    join(uvRoot, 'pyproject.toml'),
    [
      '[project]',
      'name = "railpack-uv"',
      'version = "0.1.0"',
      'requires-python = ">=3.12"',
      'dependencies = ["idna==3.10"]',
      '',
      '[build-system]',
      'requires = ["setuptools>=75"]',
      'build-backend = "setuptools.build_meta"',
      '',
      '[tool.setuptools]',
      'py-modules = []',
      'ext-modules = [{ name = "railpack_native", sources = ["native.c"] }]',
      ''
    ].join('\n')
  );
  await write(join(uvRoot, 'uv.lock'), UV_LOCK);
  await write(
    join(uvRoot, 'native.c'),
    [
      '#include <Python.h>',
      'static PyObject *answer(PyObject *self, PyObject *args) { return PyUnicode_FromString("native-ok"); }',
      'static PyMethodDef methods[] = {{"answer", answer, METH_NOARGS, NULL}, {NULL, NULL, 0, NULL}};',
      'static struct PyModuleDef module = {PyModuleDef_HEAD_INIT, "railpack_native", NULL, -1, methods};',
      'PyMODINIT_FUNC PyInit_railpack_native(void) { return PyModule_Create(&module); }',
      ''
    ].join('\n')
  );
  await write(
    join(uvRoot, 'main.py'),
    pythonServer(
      '"railpack-uv-ok:" + __import__("idna").encode("münich").decode() + ":" + __import__("railpack_native").answer()'
    )
  );
  const uvTag = `stacktape-buildpack-smoke-railpack-uv:${runId}`;
  const uvOutput = await buildUsingRailpack({
    ...railpack,
    name: uvTag,
    sourceDirectoryPath: 'railpack-uv',
    startCommand: 'uv run --no-sync python main.py'
  });
  assert.equal(await fetchFromContainer(uvTag), 'railpack-uv-ok:xn--mnich-kva:native-ok');
  assert.match(String(uvOutput.details?.detection), /built on python:/);
  record('railpack-uv-image', uvOutput);

  // psycopg2 publishes only a source distribution. Railpack adds libpq-dev for the build and libpq5 for the runtime;
  // the compiler comes from the install's fallback.
  console.log('Building and serving a pip project that compiles a dependency on the official Python image...');
  const sdistRoot = join(projectsRoot, 'railpack-python-sdist');
  // The run ID keeps the install step out of BuildKit's cache, so the fallback runs in every run.
  await write(join(sdistRoot, 'requirements.txt'), `# smoke run ${runId}\npsycopg2==2.9.10\n`);
  await write(
    join(sdistRoot, 'main.py'),
    pythonServer('"railpack-sdist-ok:" + str(__import__("psycopg2").extensions.libpq_version() > 0)')
  );
  const sdistTag = `stacktape-buildpack-smoke-railpack-python-sdist:${runId}`;
  const sdistOutput = await buildUsingRailpack({
    ...railpack,
    name: sdistTag,
    sourceDirectoryPath: 'railpack-python-sdist'
  });
  assert.match(
    String(sdistOutput.details?.dockerOutput),
    /Installing build tools to compile what has no prebuilt wheel/
  );
  assert.equal(await fetchFromContainer(sdistTag), 'railpack-sdist-ok:True');
  record('railpack-python-sdist-image', sdistOutput);
}

try {
  await mkdir(projectsRoot, { recursive: true });
  await mkdir(artifactsRoot, { recursive: true });
  await run('docker', ['version', '--format', '{{.Server.Version}}']);

  if (!only || !only.startsWith('railpack')) await buildpackScenarios();

  if ((!only || only.startsWith('railpack')) && railpackBinary) {
    console.log(`Using railpack at ${railpackBinary}.`);
    await railpackScenarios(createRailpackPrepare(railpackBinary));
  }

  console.table(results);
  console.log(`Synthetic buildpack smoke passed (${results.length} real Docker builds).`);
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
  if (!only || only === 'go') {
    console.log('Building synthetic Go Lambda artifact...');
    const goRoot = join(projectsRoot, 'go');
    await write(
      join(goRoot, 'go.mod'),
      'module example.com/stacktape-smoke\n\ngo 1.23\n\nrequire github.com/aws/aws-lambda-go v1.47.0\n'
    );
    await write(
      join(goRoot, 'go.sum'),
      'github.com/aws/aws-lambda-go v1.47.0 h1:0H8s0vumYx/YKs4sE7YM0ktwL2eWse+kfopsRI1sXVI=\ngithub.com/aws/aws-lambda-go v1.47.0/go.mod h1:dpMpZgvWx5vuQJfBt0zqBha60q7Dd7RfgJv23DymV8A=\n'
    );
    await write(
      join(goRoot, 'cmd', 'worker', 'main.go'),
      'package main\n\nimport _ "embed"\nimport "github.com/aws/aws-lambda-go/lambda"\n\n//go:embed message.txt\nvar message string\n\nfunc main() { lambda.Start(func() (string, error) { return message, nil }) }\n'
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
    await ensureImage('public.ecr.aws/lambda/provided:al2023');
    const goResponse = await invokeInLambdaImage<string>({
      functionDirectory: goDist,
      event: {},
      containerLabel,
      runtimeImage: 'public.ecr.aws/lambda/provided:al2023',
      handler: 'bootstrap'
    });
    assert.equal(goResponse, 'embedded-runtime-asset');
    const goProbe = { ...common, cwd: goRoot, name: 'synthetic-go', entryfilePath: 'cmd/worker/main.go' };
    await expectReuse('an unchanged Go project', () =>
      buildGoLambda({
        ...goProbe,
        distFolderPath: `${goDist}-probe`,
        existingDigests: [goOutput.digest],
        runDocker: probeRunDocker
      })
    );
    await expectRebuild('switching the Go function to arm64', () =>
      buildGoLambda({
        ...goProbe,
        distFolderPath: `${goDist}-probe`,
        existingDigests: [goOutput.digest],
        dockerBuildOutputArchitecture: 'linux/arm64',
        runDocker: probeRunDocker
      })
    );
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
      [
        'package main',
        'import ("fmt"; "os"; "example.com/shared")',
        '// Lambda starts the bootstrap in the function directory: assets ship beside it, not under the module path.',
        'func main() {',
        '  asset, err := os.ReadFile("assets/greeting.txt")',
        '  if err != nil { fmt.Println("asset-missing:", err); os.Exit(1) }',
        '  fmt.Println(shared.Message() + ":" + string(asset))',
        '}',
        ''
      ].join('\n')
    );
    await write(join(goWorkspaceRoot, 'services', 'api', 'assets', 'greeting.txt'), 'asset-beside-bootstrap');
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
        '--workdir',
        '/artifact',
        'debian:bookworm-slim',
        '/artifact/bootstrap'
      ],
      expected: 'go-work-runtime-ok:asset-beside-bootstrap'
    });
    if (await Bun.file(join(goWorkspaceDist, 'libs', 'shared', 'shared.go')).exists()) {
      throw new Error('Go workspace sibling compile-only source leaked into the Lambda artifact.');
    }
    record('go-workspace-lambda', goWorkspaceOutput);
  }
  if (!only || only === 'rust') {
    console.log('Building and invoking a synthetic Rust Lambda artifact...');
    const rustRoot = join(projectsRoot, 'rust');
    await write(
      join(rustRoot, 'crates', 'api', 'Cargo.toml'),
      '[package]\nname = "stacktape-smoke"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\nshared = { path = "../../libs/shared" }\nlambda_runtime = "0.14"\nserde_json = "1"\ntokio = { version = "1", features = ["macros"] }\n'
    );
    await write(
      join(rustRoot, 'crates', 'api', 'src', 'bin', 'worker.rs'),
      [
        'use lambda_runtime::{run, service_fn, Error, LambdaEvent};',
        'use serde_json::{json, Value};',
        '',
        'async fn handler(event: LambdaEvent<Value>) -> Result<Value, Error> {',
        '    let name = event.payload.get("name").and_then(Value::as_str).unwrap_or("nobody");',
        '    Ok(json!({ "message": format!("{}:{name}", shared::message()) }))',
        '}',
        '',
        '#[tokio::main]',
        'async fn main() -> Result<(), Error> {',
        '    run(service_fn(handler)).await',
        '}',
        ''
      ].join('\n')
    );
    // `default-members` leaves the Lambda crate out, as a workspace centred on another member would.
    await write(
      join(rustRoot, 'Cargo.toml'),
      '[workspace]\nmembers = ["crates/*", "libs/shared"]\ndefault-members = ["libs/shared"]\nresolver = "2"\n'
    );
    await write(
      join(rustRoot, 'libs', 'shared', 'Cargo.toml'),
      '[package]\nname = "shared"\nversion = "0.1.0"\nedition = "2021"\n'
    );
    await write(
      join(rustRoot, 'libs', 'shared', 'src', 'lib.rs'),
      `pub fn message() -> &'static str { include_str!("message.txt").trim() }\n`
    );
    await write(join(rustRoot, 'libs', 'shared', 'src', 'message.txt'), 'rust-runtime-ok\n');
    const rustDist = join(artifactsRoot, 'rust');
    const rustOutput = await buildRustLambda({
      ...common,
      cwd: rustRoot,
      name: 'synthetic-rust',
      entryfilePath: 'crates/api/src/bin/worker.rs',
      distFolderPath: rustDist
    });
    await assertFile(join(rustDist, 'bootstrap'));
    // The function's architecture decides the target, not the machine that builds: x86_64 unless the function is arm64.
    assert.equal(
      await elfMachine(join(rustDist, 'bootstrap')),
      0x3e,
      'the Rust bootstrap must be an x86_64 executable'
    );
    await assertNoGeneratedDockerfile(rustDist);
    const rustProbe = {
      ...common,
      cwd: rustRoot,
      name: 'synthetic-rust',
      entryfilePath: 'crates/api/src/bin/worker.rs'
    };
    await write(join(rustRoot, 'target', 'debug', 'deps', 'local-build.d'), 'written by a local cargo build\n');
    await expectReuse('a local cargo build output', () =>
      buildRustLambda({
        ...rustProbe,
        distFolderPath: `${rustDist}-probe`,
        existingDigests: [rustOutput.digest],
        runDocker: probeRunDocker
      })
    );
    // An arm64 function cross-compiles on this machine (cargo-lambda never emulates); only the header is checked,
    // since running it needs an emulator this scenario does not assume.
    const rustArmDist = `${rustDist}-arm64`;
    const rustArmOutput = await buildRustLambda({
      ...rustProbe,
      name: 'synthetic-rust-arm64',
      distFolderPath: rustArmDist,
      existingDigests: [rustOutput.digest],
      dockerBuildOutputArchitecture: 'linux/arm64'
    });
    assert.equal(rustArmOutput.outcome, 'bundled', 'switching the Rust function to arm64 must rebuild');
    assert.equal(
      await elfMachine(join(rustArmDist, 'bootstrap')),
      0xb7,
      'the arm64 Rust bootstrap must be an aarch64 executable'
    );
    record('rust-workspace-binary-lambda-arm64', rustArmOutput);
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
    if (rustOutput.details?.binaryName !== 'worker') throw new Error('The selected Rust binary was lost.');
    record('rust-workspace-binary-lambda-provided-al2023', rustOutput);
  }
  if (!only || only === 'dotnet') {
    console.log('Building and executing a synthetic .NET ancestor-config and ProjectReference Lambda artifact...');
    const dotnetRoot = join(projectsRoot, 'dotnet');
    await write(
      join(dotnetRoot, 'services', 'Directory.Build.props'),
      '<Project><PropertyGroup><TargetFramework>net8.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings></PropertyGroup></Project>\n'
    );
    await write(
      join(dotnetRoot, 'services', 'Directory.Packages.props'),
      '<Project><PropertyGroup><ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally></PropertyGroup><ItemGroup><PackageVersion Include="Newtonsoft.Json" Version="13.0.3" /></ItemGroup></Project>\n'
    );
    await write(
      join(dotnetRoot, 'services', 'Shared', 'Shared.csproj'),
      '<Project Sdk="Microsoft.NET.Sdk"><ItemGroup><ProjectReference Include="../../libs/Numbers/Numbers.csproj" /></ItemGroup></Project>\n'
    );
    await write(
      join(dotnetRoot, 'services', 'Shared', 'Shared.cs'),
      'namespace Shared; public static class Value { public static int Number => Numbers.Value.Number; }\n'
    );
    await write(
      join(dotnetRoot, 'services', 'App', 'App.csproj'),
      // Visual Studio writes reference paths with backslashes; MSBuild on Linux accepts them, so Stacktape must too.
      '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><AssemblyName>Smoke</AssemblyName></PropertyGroup><ItemGroup><ProjectReference Include="..\\Shared\\Shared.csproj" /><PackageReference Include="Newtonsoft.Json" /></ItemGroup></Project>\n'
    );
    await write(
      join(dotnetRoot, 'services', 'App', 'Program.cs'),
      'using Newtonsoft.Json; using Shared; Console.WriteLine("dotnet-runtime-ok:" + JsonConvert.SerializeObject(new { value = Value.Number }));\n'
    );
    await write(
      join(dotnetRoot, 'libs', 'Numbers', 'Numbers.csproj'),
      '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>\n'
    );
    await write(
      join(dotnetRoot, 'libs', 'Numbers', 'Value.cs'),
      'namespace Numbers; public static class Value { public static int Number => 7; }\n'
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
    if (await Bun.file(join(dotnetDist, '.stacktape-assembly-name')).exists()) {
      throw new Error('The assembly-name marker leaked into the .NET Lambda artifact.');
    }
    const dotnetProbe = {
      ...common,
      cwd: dotnetRoot,
      name: 'synthetic-dotnet',
      entryfilePath: 'services/App/Program.cs',
      distFolderPath: `${dotnetDist}-probe`,
      existingDigests: [dotnetOutput.digest],
      dotnet: { projectFile: 'services/App/App.csproj' },
      runDocker: probeRunDocker
    };
    await expectReuse('an unchanged .NET project', () => buildDotnetLambda({ ...dotnetProbe, dotnetVersion: 8 }));
    await expectRebuild('bumping the .NET runtime', () => buildDotnetLambda({ ...dotnetProbe, dotnetVersion: 10 }));
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

    // A reference graph already widens the context. A separate project without references proves ancestor
    // configuration discovery independently, rather than letting the reference case hide its regression.
    await write(
      join(dotnetRoot, 'services', 'ConfigOnly', 'App.csproj'),
      '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><AssemblyName>ConfigOnly</AssemblyName></PropertyGroup><ItemGroup><PackageReference Include="Newtonsoft.Json" /></ItemGroup></Project>\n'
    );
    await write(
      join(dotnetRoot, 'services', 'ConfigOnly', 'Program.cs'),
      'using Newtonsoft.Json; Console.WriteLine("dotnet-ancestor-config-ok:" + JsonConvert.SerializeObject(new { value = 8 }));\n'
    );
    const configDist = join(artifactsRoot, 'dotnet-config');
    const configOutput = await buildDotnetLambda({
      ...common,
      cwd: dotnetRoot,
      name: 'synthetic-dotnet-config',
      entryfilePath: 'services/ConfigOnly/Program.cs',
      distFolderPath: configDist,
      // No projectFile: the project beside the entry file is discovered, as most configurations rely on.
      dotnetVersion: 8
    });
    await assertRunOutput({
      dockerArgs: [
        '--mount',
        `type=bind,source=${configDist},target=/artifact,readonly`,
        'mcr.microsoft.com/dotnet/runtime:8.0',
        'dotnet',
        '/artifact/ConfigOnly.dll'
      ],
      expected: 'dotnet-ancestor-config-ok:{"value":8}'
    });
    record('dotnet8-lambda-ancestor-configuration', configOutput);
  }
  if (!only || only === 'js-bundle') {
    console.log('Building and executing a synthetic glibc js-bundle image without external dependencies...');
    const esRoot = join(projectsRoot, 'es-image');
    await write(
      join(esRoot, 'src', 'index.ts'),
      [
        "import { execFileSync } from 'node:child_process';",
        "const libc = execFileSync('getconf', ['GNU_LIBC_VERSION'], { encoding: 'utf8' }).trim();",
        "if (!libc.startsWith('glibc ')) throw new Error('The image must supply GNU libc: ' + libc);",
        "const init = execFileSync('curl', ['--fail', '--silent', 'file:///proc/1/comm'], { encoding: 'utf8' }).trim();",
        "if (init !== 'tini') throw new Error('The image must run tini as PID 1: ' + init);",
        "const digest = execFileSync('openssl', ['dgst', '-sha256'], { input: 'abc', encoding: 'utf8' }).trim();",
        "if (!digest.endsWith('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')) throw new Error('OpenSSL must hash runtime input');",
        'console.log("es-glibc-runtime-ok");',
        ''
      ].join('\n')
    );
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
}
