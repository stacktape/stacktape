/**
 * Asset replacer acceptance: the service helper's Next.js asset replacer, as a deployed stack runs it.
 *
 * The production helper packaging builds every helper artifact, the production artifact verifier checks them, and the
 * production artifact reader selects the service helper. Its ZIP is extracted and runs in the official Lambda Node.js
 * 22 image for x86_64, the service Lambda's runtime, as an unprivileged user, with an owned host directory as `/tmp`.
 * The helper uses the AWS SDK the runtime provides.
 *
 * The helper's container has no network of its own: it shares the network namespace of a fixture container, whose
 * server (`asset-replacer-s3-fixture.ts`) is the only thing it can reach. The SDK is pointed at that server through
 * `AWS_ENDPOINT_URL_S3` and `AWS_ENDPOINT_URL`, with inert credentials, before the helper loads. The server serves
 * pristine input ZIPs, decodes and verifies uploads and records CloudFormation responses.
 *
 * One warm helper container receives, in order: two Create events for the same S3 key with different inputs and
 * values, a Create for a key whose name has several dots, an invalid ZIP, ZIPs with escaping links (one with non-ASCII
 * names), a refused download, a refused upload and a Delete. A second helper container, whose `/tmp` is a 10 MiB
 * tmpfs, replaces placeholders in a package with 4 MiB of incompressible data: that fits only if the downloaded ZIP is
 * gone before the new one is written. Each outcome is read from the CloudFormation response, never from the invocation
 * status. Every uploaded ZIP is extracted with Info-ZIP `unzip`, inspected, and run in the Lambda runtime.
 *
 *   pnpm --filter @stacktape/cli run test:asset-replacer -- [--out <dir>] [--helper-lambdas-dir <dir>]
 *
 * Needs Docker and `unzip`; contacts no AWS service. `--helper-lambdas-dir` characterizes already built helper
 * artifacts, such as an older helper, instead of packaging the current source; the report says which it used.
 * `--out` must be new or empty; its evidence stays, extracted trees are removed.
 */
import type { FixtureRequestRecord, FixtureScenario } from './asset-replacer-s3-fixture';
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { chmod, lstat, mkdir, readdir, readFile, readlink, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { getStacktapeServiceLambdaEnvironment } from '@domain-services/config-manager/utils/lambdas';
import { loadHelperLambdaDetailsFromDir } from '@utils/helper-lambdas';
import { createArchive } from '@utils/zip';
import { ZipArchive } from 'archiver';
import { HELPER_LAMBDAS_FOLDER_NAME } from 'src/config/project-paths';
import yargsParser from 'yargs-parser';
import { claimOutputDirectory } from '../perf/measurement-context';
import { packageHelperLambdas } from '../package-helper-lambdas';
import { verifyHelperLambdaArtifacts } from '../verify-helper-lambda-artifacts';
import { FIXTURE_PORT, FIXTURE_SERVER_FILE } from './asset-replacer-s3-fixture';
import {
  CONTAINER_LABEL,
  ensureLambdaImage,
  extractZip,
  invokeInLambdaRuntime,
  LAMBDA_USER,
  listLeftoverContainers,
  removeContainer
} from './lambda-runtime';

const CLI_ROOT = resolve(import.meta.dir, '..', '..');
/** The service helper's runtime: `nodejs22.x`, and x86_64 because synthesis sets no architecture for it. */
const HELPER_IMAGE = 'public.ecr.aws/lambda/nodejs:22';
const HELPER_PLATFORM = 'linux/amd64';
const BUCKET = 'stp-deployment-bucket-acceptance';
const ENDPOINT = `http://127.0.0.1:${FIXTURE_PORT}`;
const INVOCATION_TIMEOUT_SECONDS = 120;
/** The real deployment key form, `<function>/<version>-<digest>.zip`. */
const PRODUCTION_KEY = `nextjs-server/v000002-${'4f2a9c'.repeat(6)}abcd.zip`;
const MULTI_DOT_KEY = 'nextjs-server/v000003-build.2026.09.24.zip';
/** A scaled-down Lambda /tmp: room for two copies of the large package, not three. */
const DISK_BUDGET_TMPFS = 'size=10m';
const DISK_BUDGET_PAYLOAD_BYTES = 4 * 1024 * 1024;

type Result = { check: string; ok: boolean; detail?: string | undefined };
const results: Result[] = [];

const check = async (name: string, body: () => Promise<string | void>) => {
  try {
    const detail = await body();
    results.push({ check: name, ok: true, ...(detail ? { detail } : {}) });
    console.info(`ok      ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ check: name, ok: false, detail });
    console.error(`FAILED  ${name}\n        ${detail.split('\n').join('\n        ')}`);
  }
};

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

const file = async (path: string, contents: string | Buffer, mode = 0o644) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
  await chmod(path, mode);
};

/** Runs a command to completion within `timeoutMs`, killing it at the deadline. */
const runCommand = (command: string[], { stdin, timeoutMs = 60_000 }: { stdin?: Buffer; timeoutMs?: number } = {}) => {
  const result = Bun.spawnSync(command, {
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: timeoutMs,
    ...(stdin ? { stdin } : {})
  });
  return { exitCode: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
};

const runOrThrow = (command: string[], options?: Parameters<typeof runCommand>[1]) => {
  const result = runCommand(command, options);
  if (result.exitCode !== 0) {
    throw new Error(`${command.slice(0, 3).join(' ')} failed (${result.exitCode}): ${result.stderr || result.stdout}`);
  }
  return result.stdout;
};

// ---------------------------------------------------------------------------------------------------------------------
// Inputs: Next.js server function trees, zipped by the production archiver

/** Values unique to one run, so their absence from logs means something. */
const sentinel = (label: string) => `${label}${randomBytes(12).toString('hex')}`;

type Values = { searchBucket: string; searchRegion: string; bucket: string; region: string; token: string };

const createValues = (): Values => ({
  searchBucket: `{{ ${sentinel('STP_SEARCH_BUCKET_')} }}`,
  searchRegion: `{{ ${sentinel('STP_SEARCH_REGION_')} }}`,
  // JavaScript replacement patterns must stay literal: `$&` is the match, `$$` a dollar, `$'` and `` $` `` context.
  bucket: `${sentinel('stp-value-bucket-')}-$&-$$-$1-$'-$\``,
  region: `${sentinel('stp-value-region-')}-$&`,
  // Replaced by itself plus a suffix: applied twice to one file, it would show twice.
  token: sentinel('STP_TOKEN_')
});

const replacementsFor = (values: Values) => [
  { includeFilesPattern: '**/*.@(*js|json|html)', searchString: values.searchBucket, replaceString: values.bucket },
  { includeFilesPattern: '**/*.@(*js|json|html)', searchString: values.searchRegion, replaceString: values.region },
  {
    includeFilesPattern: '**/*.@(*js|json|html)',
    searchString: values.token,
    replaceString: `${values.token}-expanded`
  }
];

/** Every value of `values` and its random part alone, which must not reach any log. */
const secretsOf = (values: Values) =>
  Object.values(values).flatMap((value) => [value, value.match(/[0-9a-f]{24}/)![0]]);

/** Bytes that are not UTF-8, so decoding and re-encoding a file would change them. */
const binaryBytes = (seed: string) =>
  Buffer.concat([Buffer.from([0xff, 0xfe, 0x00, 0xc3, 0x28, 0xa0, 0xa1]), createHash('sha512').update(seed).digest()]);

const HANDLER = `import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const task = (path) => \`/var/task/\${path}\`;
const read = (path) => readFileSync(task(path), 'utf8');

export const handler = async () => ({
  uid: process.getuid(),
  config: JSON.parse(read('config/runtime.config.json')),
  tokenThroughFileLink: JSON.parse(read('config/settings-alias.json')).token,
  tokenThroughDirectoryLink: JSON.parse(read('linked-config/settings.json')).token,
  tokenThroughRootLink: JSON.parse(read('.next/server/root/config/settings.json')).token,
  linkedTool: execFileSync(task('bin/tool-link')).toString().trim(),
  hidden: read('.next/.hidden-settings').trim()
});
`;

type Tree = {
  label: string;
  values: Values;
  files: Record<string, { contents: string | Buffer; mode?: number }>;
  links: Record<string, string>;
};

/**
 * A server function as the Next.js packaging emits it: handler, config, hidden files, an executable, binary assets,
 * a name with several dots, and links: to the executable, to a `.json` file, to a directory and back to the root.
 */
const serverFunctionTree = (label: string, values: Values, extraFiles: Tree['files'] = {}): Tree => ({
  label,
  values,
  files: {
    'index.mjs': { contents: HANDLER },
    'config/runtime.config.json': {
      contents: `${JSON.stringify({ label, bucket: values.searchBucket, region: values.searchRegion, untouched: 'keeps $& and $1' })}\n`
    },
    'config/settings.json': { contents: `${JSON.stringify({ token: values.token })}\n` },
    '.next/.hidden-settings': { contents: `hidden-${label}\n` },
    '.next/server/app.page.runtime.prod.js': {
      contents: `export const bucket = "${values.searchBucket}"; export const label = "${label}";\n`
    },
    'bin/tool': { contents: `#!/bin/sh\necho linked-tool-ran-${label}\n`, mode: 0o755 },
    // Selected by the replacement pattern, but without a placeholder: its bytes must not change.
    'static/chunk.min.js': { contents: binaryBytes(`${label}-chunk`) },
    // Selected and with a placeholder between non-UTF-8 bytes: only the placeholder may change.
    'static/mixed.min.js': {
      contents: Buffer.concat([
        binaryBytes(`${label}-mixed-a`),
        Buffer.from(values.searchRegion),
        binaryBytes(`${label}-mixed-b`)
      ])
    },
    'assets/logo.bin': { contents: binaryBytes(`${label}-logo`) },
    ...extraFiles
  },
  links: {
    'bin/tool-link': 'tool',
    'config/settings-alias.json': 'settings.json',
    'linked-config': 'config',
    '.next/server/root': '../..'
  }
});

const writeTree = async (root: string, tree: Tree) => {
  await rm(root, { recursive: true, force: true });
  for (const [path, { contents, mode }] of Object.entries(tree.files)) {
    await file(join(root, path), contents, mode);
  }
  for (const [path, target] of Object.entries(tree.links)) {
    await symlink(target, join(root, path));
  }
};

/** What the replacer must return for `tree`: every file, with each rule applied once, literally. */
const expectedContents = (tree: Tree) => {
  const expected = new Map<string, Buffer>();
  for (const [path, { contents }] of Object.entries(tree.files)) {
    let bytes = Buffer.from(contents);
    if (/\.(\w*js|json|html)$/.test(path)) {
      for (const { searchString, replaceString } of replacementsFor(tree.values)) {
        const [search, replacement] = [searchString, replaceString].map((value) =>
          Buffer.from(value).toString('latin1')
        );
        bytes = Buffer.from(bytes.toString('latin1').split(search!).join(replacement), 'latin1');
      }
    }
    expected.set(path, bytes);
  }
  return expected;
};

/** A ZIP with links the production archiver refuses to write, so it is made here. */
const writeCraftedZip = (outputPath: string, links: Record<string, string>) =>
  new Promise<void>((resolvePromise, reject) => {
    const archive = new ZipArchive({ zlib: { level: 1 } });
    const output = createWriteStream(outputPath);
    output.on('close', () => resolvePromise());
    output.on('error', reject);
    archive.on('error', reject);
    archive.pipe(output);
    archive.append(HANDLER, { name: 'index.mjs', mode: 0o644 });
    for (const [path, target] of Object.entries(links)) archive.symlink(path, target, 0o777);
    archive.finalize().catch(reject);
  });

// ---------------------------------------------------------------------------------------------------------------------
// Containers

/** Every container name, recorded before the container is created, so a failure at any point still removes it. */
const ownedContainers: string[] = [];

const containerName = (role: string) => {
  const name = `stp-asset-replacer-${role}-${randomUUID().slice(0, 12)}`;
  ownedContainers.push(name);
  return name;
};

/** Removes every owned container, each independently, and reports all that could not be removed. */
const removeOwnedContainers = () => {
  const failures: string[] = [];
  for (const name of ownedContainers.splice(0).reverse()) {
    try {
      removeContainer(name);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (failures.length > 0) throw new Error(failures.join('\n'));
};

const startFixture = async (fixtureDirectory: string) => {
  const name = containerName('fixture');
  runOrThrow([
    'docker',
    'run',
    '--detach',
    '--name',
    name,
    '--label',
    CONTAINER_LABEL,
    '--platform',
    HELPER_PLATFORM,
    // No network at all: only helpers, which join this namespace, can reach the server.
    '--network',
    'none',
    '--user',
    `${process.getuid!()}:${process.getgid!()}`,
    '--mount',
    `type=bind,source=${fixtureDirectory},target=/fixture`,
    '--entrypoint',
    'node',
    HELPER_IMAGE,
    `/fixture/${FIXTURE_SERVER_FILE}`,
    '/fixture'
  ]);
  const deadline = Date.now() + 20_000;
  while (!runCommand(['docker', 'logs', name]).stdout.includes('fixture listening')) {
    if (Date.now() > deadline) throw new Error('The fixture server did not start within 20 s.');
    await Bun.sleep(200);
  }
  return name;
};

const helperEnvironment = () => {
  const service = getStacktapeServiceLambdaEnvironment({
    projectName: 'asset-replacer-acceptance',
    stackName: 'asset-replacer-acceptance-test',
    globallyUniqueStackHash: 'acceptx1',
    stage: 'test'
  }).map(({ name, value }) => {
    // Intrinsics resolve during deployment; these are the values they would take.
    const resolved =
      typeof value === 'string'
        ? value
        : ({ AWS_PARTITION: 'aws', AWS_ACCOUNT_ID: '123456789012' } as Record<string, string>)[name]!;
    return `${name}=${resolved}`;
  });
  return [
    ...service,
    `AWS_ENDPOINT_URL_S3=${ENDPOINT}`,
    // Any other AWS client would also reach the fixture, which refuses and records it.
    `AWS_ENDPOINT_URL=${ENDPOINT}`,
    'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
    'AWS_SECRET_ACCESS_KEY=asset-replacer-acceptance-inert-secret',
    'AWS_SESSION_TOKEN=asset-replacer-acceptance-inert-token',
    'AWS_REGION=eu-west-1',
    'AWS_DEFAULT_REGION=eu-west-1',
    `AWS_LAMBDA_FUNCTION_TIMEOUT=${INVOCATION_TIMEOUT_SECONDS - 10}`,
    'AWS_LAMBDA_FUNCTION_MEMORY_SIZE=2048',
    'AWS_LAMBDA_FUNCTION_NAME=asset-replacer-acceptance-test-stpServiceLambda'
  ];
};

/** A helper container in the fixture's network namespace, with `/tmp` either an owned host directory or a tmpfs. */
const startHelper = ({
  fixture,
  helperTask,
  tmp
}: {
  fixture: string;
  helperTask: string;
  tmp: { hostDirectory: string } | { tmpfs: string };
}) => {
  const name = containerName('helper');
  runOrThrow([
    'docker',
    'run',
    '--detach',
    '--name',
    name,
    '--label',
    CONTAINER_LABEL,
    '--platform',
    HELPER_PLATFORM,
    '--network',
    `container:${fixture}`,
    '--user',
    LAMBDA_USER,
    '--mount',
    `type=bind,source=${helperTask},target=/var/task,readonly`,
    ...('hostDirectory' in tmp
      ? ['--mount', `type=bind,source=${tmp.hostDirectory},target=/tmp`]
      : ['--tmpfs', `/tmp:rw,mode=1777,${tmp.tmpfs}`]),
    ...helperEnvironment().flatMap((entry) => ['--env', entry]),
    HELPER_IMAGE,
    'index.default'
  ]);
  return name;
};

/** Sends one event to a helper's emulator from inside its network namespace, bounded by `INVOCATION_TIMEOUT_SECONDS`. */
const invokeHelper = (helper: string, event: object) =>
  runOrThrow(
    [
      'docker',
      'exec',
      '--interactive',
      helper,
      'curl',
      '--silent',
      '--show-error',
      '--max-time',
      String(INVOCATION_TIMEOUT_SECONDS),
      '--retry',
      '20',
      '--retry-connrefused',
      '--retry-delay',
      '1',
      '--request',
      'POST',
      '--header',
      'content-type: application/json',
      '--data-binary',
      '@-',
      'http://127.0.0.1:8080/2015-03-31/functions/function/invocations'
    ],
    { stdin: Buffer.from(JSON.stringify(event)), timeoutMs: (INVOCATION_TIMEOUT_SECONDS + 30) * 1000 }
  );

/** A container's complete stdout and stderr; failing to collect them is an error, never an empty log. */
const collectLogs = (name: string) => {
  const logs = runCommand(['docker', 'logs', name]);
  if (logs.exitCode !== 0) throw new Error(`docker logs ${name} failed (${logs.exitCode}): ${logs.stderr}`);
  if (!logs.stdout.includes('START RequestId')) throw new Error(`docker logs ${name} holds no invocation.`);
  return { stdout: logs.stdout, stderr: logs.stderr };
};

// ---------------------------------------------------------------------------------------------------------------------
// Scenarios

type Scenario = {
  name: string;
  requestType: 'Create' | 'Delete';
  key: string;
  object?: string | undefined;
  values: Values;
  getStatus?: 200 | 403 | undefined;
  putStatus?: 200 | 403 | undefined;
};

type Outcome = {
  response: { Status?: string; Reason?: string } | null;
  requests: FixtureRequestRecord[];
  tmpBefore: string[];
  tmpAfter: string[];
};

const runScenario = async ({
  scenario,
  helper,
  fixtureDirectory,
  listTmp
}: {
  scenario: Scenario;
  helper: string;
  fixtureDirectory: string;
  listTmp: () => Promise<string[]>;
}): Promise<Outcome> => {
  const fixtureScenario: FixtureScenario = {
    name: scenario.name,
    bucket: BUCKET,
    objects: scenario.object ? { [scenario.key]: scenario.object } : {},
    getStatus: scenario.getStatus,
    putStatus: scenario.putStatus
  };
  await writeFile(join(fixtureDirectory, 'scenario.json'), `${JSON.stringify(fixtureScenario, null, 2)}\n`);
  const tmpBefore = await listTmp();
  const properties = {
    ServiceToken: 'arn:aws:lambda:eu-west-1:123456789012:function:asset-replacer-acceptance-test-stpServiceLambda',
    assetReplacer: { bucketName: BUCKET, zipFileS3Key: scenario.key, replacements: replacementsFor(scenario.values) }
  };
  invokeHelper(helper, {
    RequestType: scenario.requestType,
    ServiceToken: properties.ServiceToken,
    ResponseURL: `${ENDPOINT}/cfn/${scenario.name}`,
    StackId:
      'arn:aws:cloudformation:eu-west-1:123456789012:stack/asset-replacer-acceptance-test/00000000-0000-4000-8000-000000000000',
    RequestId: `request-${scenario.name}`,
    LogicalResourceId: 'NextjsWebAssetReplacerCustomResource',
    ResourceType: 'Custom::StpServiceCustomResource',
    ResourceProperties: properties,
    ...(scenario.requestType === 'Delete' ? { PhysicalResourceId: 'stpservicecustomresource' } : {})
  });
  // A response that arrived incomplete does not parse, and counts as no response.
  const response = await readFile(join(fixtureDirectory, 'cfn', `${scenario.name}-${scenario.name}.json`), 'utf8').then(
    (text) => JSON.parse(text) as Outcome['response'],
    () => null
  );
  const requests = (await readFile(join(fixtureDirectory, 'requests.jsonl'), 'utf8').catch(() => ''))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as FixtureRequestRecord)
    .filter((record) => record.scenario === scenario.name);
  return { response, requests, tmpBefore, tmpAfter: await listTmp() };
};

const s3Requests = (outcome: Outcome, route: FixtureRequestRecord['route']) =>
  outcome.requests.filter((request) => request.route === route);

const expectFailed = (outcome: Outcome, { downloads }: { downloads: number }) => {
  assert.equal(outcome.response?.Status, 'FAILED', `CloudFormation response: ${JSON.stringify(outcome.response)}`);
  assert.equal(s3Requests(outcome, 'get-object').length, downloads);
  assert.equal(
    s3Requests(outcome, 'put-object').filter((request) => request.status === 200).length,
    0,
    'nothing may be published'
  );
  assert.deepEqual(outcome.tmpAfter, outcome.tmpBefore, 'the invocation must leave /tmp as it found it');
};

const expectSucceeded = (outcome: Outcome, key: string) => {
  assert.equal(outcome.response?.Status, 'SUCCESS', `CloudFormation response: ${JSON.stringify(outcome.response)}`);
  const gets = s3Requests(outcome, 'get-object');
  const puts = s3Requests(outcome, 'put-object');
  assert.deepEqual(
    [...gets, ...puts].map(({ method, key: requestKey, status }) => [method, requestKey, status]),
    [
      ['GET', key, 200],
      ['PUT', key, 200]
    ]
  );
  const upload = puts[0]!.upload!;
  assert.ok(
    upload.checksums.some(({ verified }) => verified),
    'the upload carried a verified checksum'
  );
  assert.deepEqual(outcome.tmpAfter, outcome.tmpBefore, 'the invocation must leave /tmp as it found it');
  return `path-style /${BUCKET}/…; ${upload.framing}, ${upload.decodedBytes} bytes; checksums ${upload.checksums.map(({ algorithm, source }) => `${algorithm} ${source}`).join(', ')}`;
};

// ---------------------------------------------------------------------------------------------------------------------
// Returned ZIPs

const modeOf = async (path: string) => ((await lstat(path)).mode & 0o777).toString(8);

const listTree = async (root: string, prefix = ''): Promise<string[]> =>
  (
    await Promise.all(
      (
        await readdir(join(root, prefix), { withFileTypes: true })
      ).map(async (entry) => {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        return entry.isDirectory() ? [path, ...(await listTree(root, path))] : [path];
      })
    )
  )
    .flat()
    .toSorted();

/** Extracts an uploaded ZIP independently, checks every entry against `tree`, and runs the function in Lambda. */
const verifyReturnedZip = async ({ zipPath, tree }: { zipPath: string; tree: Tree }) => {
  const extracted = await extractZip(zipPath);
  try {
    const expected = expectedContents(tree);
    const expectedEntries = [...expected.keys(), ...Object.keys(tree.links)]
      .flatMap((path) => path.split('/').map((_, index, parts) => parts.slice(0, index + 1).join('/')))
      .filter((path, index, all) => all.indexOf(path) === index)
      .toSorted();
    assert.deepEqual(await listTree(extracted), expectedEntries, 'the ZIP holds exactly the input entries');
    for (const [path, bytes] of expected) {
      assert.equal(sha256(await readFile(join(extracted, path))), sha256(bytes), `${path}: content`);
      assert.equal(await modeOf(join(extracted, path)), path === 'bin/tool' ? '755' : '644', `${path}: mode`);
    }
    for (const [path, target] of Object.entries(tree.links)) {
      assert.ok((await lstat(join(extracted, path))).isSymbolicLink(), `${path} stays a link`);
      assert.equal(await readlink(join(extracted, path)), target, `${path}: target`);
    }
    for (const directory of expectedEntries.filter((path) => !expected.has(path) && !(path in tree.links))) {
      assert.equal(await modeOf(join(extracted, directory)), '755', `${directory}: mode`);
    }
    const invocation = await invokeInLambdaRuntime({
      functionDirectory: extracted,
      handler: 'index.handler',
      image: HELPER_IMAGE
    });
    assert.equal(invocation.status, 200, invocation.body);
    const token = `${tree.values.token}-expanded`;
    assert.deepEqual(JSON.parse(invocation.body), {
      uid: 993,
      config: {
        label: tree.label,
        bucket: tree.values.bucket,
        region: tree.values.region,
        untouched: 'keeps $& and $1'
      },
      tokenThroughFileLink: token,
      tokenThroughDirectoryLink: token,
      tokenThroughRootLink: token,
      linkedTool: `linked-tool-ran-${tree.label}`,
      hidden: `hidden-${tree.label}`
    });
  } finally {
    await rm(extracted, { recursive: true, force: true });
  }
};

// ---------------------------------------------------------------------------------------------------------------------

const SOURCE_FILES = [
  'helper-lambdas/stacktapeServiceLambda/custom-resources/resolvers/asset-replacer.ts',
  'helper-lambdas/stacktapeServiceLambda/custom-resources/resolvers/asset-replacer-archive.ts',
  'helper-lambdas/stacktapeServiceLambda/custom-resources/index.ts',
  'src/aws/cloudformation.ts',
  'src/utils/zip.ts',
  'src/utils/helper-lambdas.ts',
  'scripts/package-helper-lambdas.ts',
  'scripts/packaging-archives/asset-replacer-acceptance.ts',
  'scripts/packaging-archives/asset-replacer-s3-fixture.ts',
  'scripts/packaging-archives/lambda-runtime.ts',
  '../../packages/packaging/src/artifact/archive-entries.ts'
];

const sourceIdentity = async () =>
  Object.fromEntries(
    await Promise.all(
      SOURCE_FILES.map(async (path) => [
        path,
        sha256(await readFile(join(CLI_ROOT, path)).catch(() => Buffer.from('missing')))
      ])
    )
  );

const main = async () => {
  const args = yargsParser(process.argv.slice(2), { string: ['out', 'helper-lambdas-dir'] });
  const outDirectory = resolve(
    args.out ??
      join(CLI_ROOT, '.stacktape', 'asset-replacer-acceptance', new Date().toISOString().replace(/[:.]/g, '-'))
  );
  await claimOutputDirectory(outDirectory);
  const sourcesBefore = await sourceIdentity();
  const helperImage = ensureLambdaImage(HELPER_IMAGE);
  console.info(`Lambda image ${helperImage}; output in ${outDirectory}`);

  // 1. The helper as a release builds it, or supplied artifacts to characterize.
  const suppliedHelperDirectory = args['helper-lambdas-dir'] ? resolve(args['helper-lambdas-dir']) : null;
  const helperLambdasDir = suppliedHelperDirectory ?? join(outDirectory, 'helper-build', HELPER_LAMBDAS_FOLDER_NAME);
  if (!suppliedHelperDirectory) {
    await packageHelperLambdas({ distFolderPath: join(outDirectory, 'helper-build') });
  }
  const verified = await verifyHelperLambdaArtifacts({ helperLambdasDir });
  const service = (await loadHelperLambdaDetailsFromDir({ helperLambdasDir })).stacktapeServiceLambda;
  const serviceZip = await readFile(service.artifactPath);
  const helperArtifact = {
    // Supplied artifacts were not built from the sources hashed in this report.
    origin: suppliedHelperDirectory ? 'supplied' : 'built from the sources below',
    path: service.artifactPath,
    digest: service.digest,
    handler: service.handler,
    sha256: sha256(serviceZip),
    bytes: serviceZip.length,
    verifiedArtifacts: verified
  };
  console.info(`Service helper ${service.digest} (${serviceZip.length} bytes, ${helperArtifact.origin})`);

  // 2. Inputs, fixture and mounts.
  const inputs = join(outDirectory, 'inputs');
  const fixtureDirectory = join(outDirectory, 'fixture');
  const helperTmp = join(outDirectory, 'helper-tmp');
  await mkdir(join(fixtureDirectory, 'objects'), { recursive: true });
  await mkdir(helperTmp, { recursive: true });
  // Like Lambda's /tmp: writable by the function's user, which owns none of the host's files.
  await chmod(helperTmp, 0o1777);
  const built = await Bun.build({
    entrypoints: [join(import.meta.dir, 'asset-replacer-s3-fixture.ts')],
    target: 'node',
    format: 'esm',
    outdir: fixtureDirectory,
    naming: FIXTURE_SERVER_FILE
  });
  assert.ok(built.success, built.logs.join('\n'));

  const trees = {
    first: serverFunctionTree('first', createValues(), { 'first-only.txt': { contents: 'only in the first input\n' } }),
    second: serverFunctionTree('second', createValues()),
    multiDot: serverFunctionTree('multi-dot', createValues()),
    diskBudget: serverFunctionTree('disk-budget', createValues(), {
      'assets/large.bin': { contents: randomBytes(DISK_BUDGET_PAYLOAD_BYTES) }
    })
  };
  for (const [name, tree] of Object.entries(trees)) {
    await writeTree(join(inputs, name), tree);
    const { path } = await createArchive({
      absoluteSourcePath: join(inputs, name),
      absoluteDestDirPath: join(fixtureDirectory, 'objects'),
      fileNameBase: name,
      format: 'zip',
      useNativeZip: true
    });
    assert.equal(path, join(fixtureDirectory, 'objects', `${name}.zip`));
  }
  await writeFile(join(fixtureDirectory, 'objects', 'invalid.zip'), 'this is not a ZIP archive\n');
  await writeCraftedZip(join(fixtureDirectory, 'objects', 'escaping-link.zip'), {
    'bin/escape': '../../../etc/passwd'
  });
  await writeCraftedZip(join(fixtureDirectory, 'objects', 'escaping-link-unicode.zip'), {
    'bin/é-escape': '../../../日本-outside'
  });

  const failureValues = createValues();
  const scenarios: Scenario[] = [
    {
      name: 'first',
      requestType: 'Create',
      key: PRODUCTION_KEY,
      object: 'objects/first.zip',
      values: trees.first.values
    },
    {
      name: 'second',
      requestType: 'Create',
      key: PRODUCTION_KEY,
      object: 'objects/second.zip',
      values: trees.second.values
    },
    {
      name: 'multi-dot-key',
      requestType: 'Create',
      key: MULTI_DOT_KEY,
      object: 'objects/multiDot.zip',
      values: trees.multiDot.values
    },
    {
      name: 'invalid-zip',
      requestType: 'Create',
      key: PRODUCTION_KEY,
      object: 'objects/invalid.zip',
      values: failureValues
    },
    {
      name: 'escaping-link',
      requestType: 'Create',
      key: PRODUCTION_KEY,
      object: 'objects/escaping-link.zip',
      values: failureValues
    },
    {
      name: 'escaping-link-unicode',
      requestType: 'Create',
      key: PRODUCTION_KEY,
      object: 'objects/escaping-link-unicode.zip',
      values: failureValues
    },
    {
      name: 'download-refused',
      requestType: 'Create',
      key: PRODUCTION_KEY,
      object: 'objects/first.zip',
      values: failureValues,
      getStatus: 403
    },
    {
      name: 'upload-refused',
      requestType: 'Create',
      key: PRODUCTION_KEY,
      object: 'objects/first.zip',
      values: failureValues,
      putStatus: 403
    },
    { name: 'delete', requestType: 'Delete', key: PRODUCTION_KEY, object: 'objects/first.zip', values: failureValues }
  ];
  const diskBudgetScenario: Scenario = {
    name: 'disk-budget',
    requestType: 'Create',
    key: PRODUCTION_KEY,
    object: 'objects/diskBudget.zip',
    values: trees.diskBudget.values
  };

  // 3. Every invocation, in two helper containers that share the fixture's network namespace.
  const helperTask = await extractZip(service.artifactPath);
  const outcomes: Record<string, Outcome> = {};
  const runtime: { node?: string; nodePath?: string; sdk?: string[]; tmpfs?: string } = {};
  const logs: { stdout: string; stderr: string }[] = [];
  let leftoverTmp = '';
  let cleanupFailure = '';
  try {
    const fixture = await startFixture(fixtureDirectory);
    const helper = startHelper({ fixture, helperTask, tmp: { hostDirectory: helperTmp } });
    const listHostTmp = async () => (await readdir(helperTmp)).toSorted();
    for (const scenario of scenarios) {
      outcomes[scenario.name] = await runScenario({ scenario, helper, fixtureDirectory, listTmp: listHostTmp });
    }
    // The SDK the running helper resolved: the runtime's own, through the NODE_PATH its bootstrap exported to the
    // runtime process, which stays alive between invocations.
    runtime.node = runOrThrow(['docker', 'exec', helper, 'node', '--version']).trim();
    runtime.nodePath = runOrThrow([
      'docker',
      'exec',
      helper,
      'sh',
      '-c',
      'for environ in /proc/[0-9]*/environ; do tr "\\000" "\\n" < "$environ" 2>/dev/null | grep "^NODE_PATH="; done | head -n 1'
    ])
      .trim()
      .replace(/^NODE_PATH=/, '');
    runtime.sdk = runOrThrow([
      'docker',
      'exec',
      '--env',
      `NODE_PATH=${runtime.nodePath}`,
      helper,
      'node',
      '--eval',
      "for (const name of ['@aws-sdk/client-s3', '@aws-sdk/lib-storage']) { const path = require.resolve(`${name}/package.json`); console.log(`${name} ${require(path).version} ${path}`); }"
    ])
      .trim()
      .split('\n');
    logs.push(collectLogs(helper));
    removeContainer(helper);

    // A second helper whose /tmp is a small tmpfs, in the same network namespace; the first one's emulator port is free.
    const budgetHelper = startHelper({ fixture, helperTask, tmp: { tmpfs: DISK_BUDGET_TMPFS } });
    const listContainerTmp = async () =>
      runOrThrow(['docker', 'exec', budgetHelper, 'ls', '-A', '/tmp']).split('\n').filter(Boolean).toSorted();
    runtime.tmpfs = runOrThrow(['docker', 'exec', budgetHelper, 'df', '-k', '/tmp']).trim().split('\n').at(-1);
    outcomes[diskBudgetScenario.name] = await runScenario({
      scenario: diskBudgetScenario,
      helper: budgetHelper,
      fixtureDirectory,
      listTmp: listContainerTmp
    });
    logs.push(collectLogs(budgetHelper));
  } finally {
    // What the helper left in /tmp is evidence: it is recorded, and fails the acceptance, before it is removed. The
    // helper's user owns it, so an owned container running as that user removes it.
    const leftovers = (await readdir(helperTmp)).toSorted();
    if (leftovers.length > 0) {
      leftoverTmp = leftovers.join('\n');
      const cleaner = containerName('tmp-cleanup');
      const cleanup = runCommand(
        [
          'docker',
          'run',
          '--name',
          cleaner,
          '--label',
          CONTAINER_LABEL,
          '--network',
          'none',
          '--user',
          LAMBDA_USER,
          '--mount',
          `type=bind,source=${helperTmp},target=/tmp`,
          '--entrypoint',
          '/bin/sh',
          HELPER_IMAGE,
          '-c',
          'ls -AlR /tmp && rm -rf /tmp/* /tmp/.[!.]*'
        ],
        { timeoutMs: 60_000 }
      );
      await writeFile(join(outDirectory, 'helper-tmp-leftovers.txt'), `${cleanup.stdout}${cleanup.stderr}`);
      if (cleanup.exitCode !== 0 || (await readdir(helperTmp)).length > 0) {
        cleanupFailure = `The /tmp cleanup did not empty ${helperTmp} (exit ${cleanup.exitCode}).`;
      }
    }
    try {
      removeOwnedContainers();
    } catch (error) {
      cleanupFailure = `${cleanupFailure}\n${error instanceof Error ? error.message : String(error)}`.trim();
    }
    await rm(helperTask, { recursive: true, force: true });
  }
  await writeFile(join(outDirectory, 'helper-stdout.log'), logs.map(({ stdout }) => stdout).join('\n'));
  await writeFile(join(outDirectory, 'helper-stderr.log'), logs.map(({ stderr }) => stderr).join('\n'));

  await check('helper: production packaging builds all helper artifacts and the verifier accepts them', async () => {
    assert.equal(verified, 5);
    return `service helper ${service.digest}, ${serviceZip.length} bytes, ${helperArtifact.origin}`;
  });

  await check("runtime: the helper runs on Node.js 22 with the runtime's own AWS SDK", async () => {
    assert.match(String(runtime.node), /^v22\./);
    assert.equal(runtime.sdk?.length, 2, runtime.sdk?.join('\n'));
    for (const line of runtime.sdk!) assert.match(line, / \/var\/runtime\/node_modules\/@aws-sdk\//);
    return `${runtime.node}; ${runtime.sdk!.map((line) => line.split(' ').slice(0, 2).join(' ')).join(', ')}`;
  });

  const capturedZip = (outcome: Outcome) =>
    join(fixtureDirectory, s3Requests(outcome, 'put-object')[0]!.upload!.capture!);

  for (const [name, tree, key] of [
    ['first', trees.first, PRODUCTION_KEY],
    ['second', trees.second, PRODUCTION_KEY],
    ['multi-dot-key', trees.multiDot, MULTI_DOT_KEY]
  ] as const) {
    const outcome = outcomes[name]!;
    await check(`${name}: Create succeeds and uploads one verified object under the same key`, async () =>
      expectSucceeded(outcome, key)
    );
    await check(`${name}: the returned ZIP holds exactly the replaced input and runs in Lambda`, async () => {
      await verifyReturnedZip({ zipPath: capturedZip(outcome), tree });
      return name === 'second'
        ? 'links kept, each file replaced once per rule, no entry of the first input remains'
        : 'links kept, each file replaced once per rule';
    });
  }

  await check('invalid ZIP: FAILED, nothing uploaded, /tmp as before', async () => {
    expectFailed(outcomes['invalid-zip']!, { downloads: 1 });
    return outcomes['invalid-zip']!.response?.Reason?.trim().split('\n')[0];
  });
  await check('escaping link: FAILED, nothing uploaded, /tmp as before', async () => {
    expectFailed(outcomes['escaping-link']!, { downloads: 1 });
    return outcomes['escaping-link']!.response?.Reason?.trim().split('\n')[0]?.slice(0, 160);
  });
  await check('escaping link with non-ASCII names: a complete FAILED response names it', async () => {
    const outcome = outcomes['escaping-link-unicode']!;
    expectFailed(outcome, { downloads: 1 });
    assert.match(outcome.response?.Reason ?? '', /bin\/é-escape points to \.\.\/\.\.\/\.\.\/日本-outside/);
    const [response] = s3Requests(outcome, 'cloudformation-response');
    return `${response?.bodyBytes} bytes delivered`;
  });
  await check('refused download: FAILED, nothing uploaded, /tmp as before', async () => {
    expectFailed(outcomes['download-refused']!, { downloads: 1 });
  });
  await check('refused upload: FAILED, nothing published, /tmp as before', async () => {
    expectFailed(outcomes['upload-refused']!, { downloads: 1 });
    assert.equal(s3Requests(outcomes['upload-refused']!, 'put-object').length, 1, 'the upload was attempted');
  });
  await check('Delete: SUCCESS without reading or writing the object', async () => {
    const outcome = outcomes.delete!;
    assert.equal(outcome.response?.Status, 'SUCCESS', `CloudFormation response: ${JSON.stringify(outcome.response)}`);
    assert.deepEqual(
      outcome.requests.filter(({ route }) => route !== 'cloudformation-response'),
      [],
      'Delete must not touch S3'
    );
    assert.deepEqual(outcome.tmpAfter, outcome.tmpBefore);
  });
  await check('disk budget: a package too large for three copies in /tmp is replaced within two', async () => {
    const outcome = outcomes[diskBudgetScenario.name]!;
    const detail = expectSucceeded(outcome, PRODUCTION_KEY);
    const uploaded = await extractZip(capturedZip(outcome));
    try {
      assert.equal(
        sha256(await readFile(join(uploaded, 'assets', 'large.bin'))),
        sha256(Buffer.from(trees.diskBudget.files['assets/large.bin']!.contents))
      );
    } finally {
      await rm(uploaded, { recursive: true, force: true });
    }
    return `/tmp tmpfs (df -k: ${runtime.tmpfs}); ${detail}`;
  });

  await check('the helper made no request the fixture does not serve', async () => {
    const unexpected = Object.values(outcomes).flatMap(({ requests }) =>
      requests.filter(({ route }) => route === 'unexpected')
    );
    assert.deepEqual(unexpected, []);
  });

  await check('no search or replacement value reaches the helper logs or CloudFormation responses', async () => {
    assert.equal(logs.length, 2, 'both helpers must have collected logs');
    const secrets = [...Object.values(trees).map((tree) => tree.values), failureValues].flatMap(secretsOf);
    const reasons = Object.values(outcomes).map(({ response }) => JSON.stringify(response));
    for (const [where, text] of [
      ['stdout', logs.map(({ stdout }) => stdout).join('\n')],
      ['stderr', logs.map(({ stderr }) => stderr).join('\n')],
      ['CloudFormation responses', reasons.join('\n')]
    ] as const) {
      assert.deepEqual(
        secrets.filter((secret) => text.includes(secret)),
        [],
        `values in ${where}`
      );
    }
    return `${secrets.length} values checked in ${logs.reduce((total, { stdout, stderr }) => total + stdout.length + stderr.length, 0)} bytes of logs`;
  });

  await check('no helper left anything in /tmp, and every container was removed', async () => {
    assert.equal(leftoverTmp, '', `left in /tmp:\n${leftoverTmp}`);
    assert.equal(cleanupFailure, '');
    assert.deepEqual(listLeftoverContainers(), []);
  });

  const sourcesAfter = await sourceIdentity();
  const failed = results.filter(({ ok }) => !ok);
  const report = {
    kind: 'stacktape-asset-replacer-acceptance',
    schemaVersion: 2,
    createdAt: new Date().toISOString(),
    helperImage,
    helperPlatform: HELPER_PLATFORM,
    helperArtifact,
    runtime,
    sources: { before: sourcesBefore, unchanged: JSON.stringify(sourcesBefore) === JSON.stringify(sourcesAfter) },
    scenarios: Object.fromEntries(
      Object.entries(outcomes).map(([name, outcome]) => [
        name,
        {
          status: outcome.response?.Status ?? null,
          reason: outcome.response?.Reason ?? null,
          requests: outcome.requests,
          tmpLeftovers: outcome.tmpAfter.filter((entry) => !outcome.tmpBefore.includes(entry))
        }
      ])
    ),
    results
  };
  await writeFile(join(outDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.info(
    `\n${results.length - failed.length} of ${results.length} checks passed. Sources unchanged: ${report.sources.unchanged}.`
  );
  if (failed.length > 0 || !report.sources.unchanged) process.exitCode = 1;
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    try {
      removeOwnedContainers();
    } catch (cleanupError) {
      console.error(cleanupError);
    }
    process.exitCode = 1;
  });
}
