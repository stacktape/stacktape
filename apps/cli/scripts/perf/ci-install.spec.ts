import type { ArtifactManifest, PayloadEntry } from './artifact-inspection';
import type { CiInstallSampleEvidence } from './ci-install';
import type { SampleRecord } from './cli-report';
import type { TimingAnalysis } from './cli-timing-analysis';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { link, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalPayloadDigest, INVOCATION_PLACEHOLDER } from './artifact-inspection';
import {
  checkCiInstallSample,
  DEPENDENCY,
  dependencyFiles,
  evaluateCiInstall,
  expectedInstallCommand,
  FUNCTION_NAME,
  INSTALL_LOCK,
  INSTALL_MARKER,
  invokeExtractedHandler,
  managerEnvironment,
  managerLayout,
  preparedProblems,
  projectFiles,
  readProjectState,
  restoreSeed,
  sha256Bytes,
  writeFiles
} from './ci-install';
import { getCliEnvironment } from './cli-environment';

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stacktape-ci-install-'));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('the fixture', () => {
  test('gives each project workspaces: [], the local tarball dependency, and pnpm alone an exact packageManager', () => {
    const npm = JSON.parse(projectFiles({ manager: 'npm', pnpmVersion: '11.17.0' })['package.json']!);
    const pnpm = JSON.parse(projectFiles({ manager: 'pnpm', pnpmVersion: '11.17.0' })['package.json']!);
    expect(npm).toMatchObject({ workspaces: [], dependencies: { 'fixture-dep': 'file:vendor/fixture-dep-1.0.0.tgz' } });
    expect(npm).not.toHaveProperty('packageManager');
    expect(pnpm).toMatchObject({ workspaces: [], packageManager: 'pnpm@11.17.0' });
    expect(projectFiles({ manager: 'npm', pnpmVersion: '11.17.0' })['src/handler.js']).toContain(
      "import { sentinel } from 'fixture-dep';"
    );
    expect(projectFiles({ manager: 'npm', pnpmVersion: '11.17.0' })['stacktape.yml']).toContain(`  ${FUNCTION_NAME}:`);
  });

  test('packs a dependency without lifecycle scripts', () => {
    const manifest = JSON.parse(dependencyFiles()['package.json']!);
    expect(manifest).not.toHaveProperty('scripts');
    expect(dependencyFiles()['index.js']).toContain(DEPENDENCY.sentinel);
  });

  test('expects the exact commands the CLI table gives CI', () => {
    expect(expectedInstallCommand({ manager: 'npm', pnpmVersion: '11.17.0' })).toBe(
      'npm ci --no-audit --no-update-notifier'
    );
    expect(expectedInstallCommand({ manager: 'pnpm', pnpmVersion: '11.17.0' })).toBe(
      'pnpm dlx pnpm@11.17.0 install --frozen-lockfile'
    );
  });

  test('gives the managers only environment keys the measured environment accepts', () => {
    for (const manager of ['npm', 'pnpm'] as const) {
      const extra = { CI: '1', ...managerEnvironment({ manager, state: '/owned/state' }) };
      expect(getCliEnvironment({ home: '/owned/home', path: ['/owned/tools'], extra })).toMatchObject(extra);
    }
  });
});

// The CI-install suite is Linux: it restores seeds with `/usr/bin/cp` and extracts with `unzip` (these fixtures zip with
// `python3`), inside the harness's Linux sandbox.
const linux = process.platform === 'linux';

describe.skipIf(!linux)('the prepared state', () => {
  const lock = 'lockfileVersion: 3\n';
  const lockSha256 = sha256Bytes(lock);

  const writeProject = async (name: string) => {
    const project = join(root, name);
    await writeFiles(project, {
      ...projectFiles({ manager: 'npm', pnpmVersion: '11.17.0' }),
      'package-lock.json': lock,
      [`vendor/${DEPENDENCY.tarball}`]: 'tarball bytes',
      'node_modules/fixture-dep/index.js': 'exports.sentinel = 1;\n'
    });
    return project;
  };

  test('reads the marker as absent, matching or other, and flags a lock, extra lockfiles and changed inputs', async () => {
    const project = await writeProject('state');
    const expectedInputs = (
      await readProjectState({ project, manager: 'npm', expectedInputs: {}, expectedMarker: lockSha256 })
    ).inputs;
    const read = () => readProjectState({ project, manager: 'npm', expectedInputs, expectedMarker: lockSha256 });

    expect(
      preparedProblems({ state: await read(), manager: 'npm', wanted: 'markerless', sentinel: DEPENDENCY.sentinel })
    ).toEqual([]);
    expect(
      preparedProblems({ state: await read(), manager: 'npm', wanted: 'marker', sentinel: DEPENDENCY.sentinel })
    ).toEqual(['the install marker is not the valid one']);

    await writeFile(join(project, INSTALL_MARKER), lockSha256);
    expect((await read()).marker).toBe('matches');
    await writeFile(join(project, INSTALL_MARKER), `${lockSha256}\n`);
    expect((await read()).marker).toBe('other');

    await writeFile(join(project, INSTALL_LOCK), '{}');
    await writeFile(join(project, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
    await writeFile(join(project, 'src/handler.js'), 'export const handler = () => 1;\n');
    expect(preparedProblems({ state: await read(), manager: 'npm', wanted: 'markerless', sentinel: null })).toEqual([
      'inputs differ from the seed: src/handler.js',
      'the dependency sentinel did not resolve (null)',
      'a Stacktape install lock is present',
      'an install marker is present',
      'lockfiles present: package-lock.json, pnpm-lock.yaml'
    ]);
  });

  test('restores the seed with its hard links, at the same paths, without touching the seed', async () => {
    const layout = managerLayout(join(root, 'restore'), 'pnpm');
    await mkdir(join(layout.seed, 'state', 'store'), { recursive: true });
    await mkdir(join(layout.seed, 'project', 'node_modules'), { recursive: true });
    await writeFile(join(layout.seed, 'state', 'store', 'file'), 'content');
    await link(join(layout.seed, 'state', 'store', 'file'), join(layout.seed, 'project', 'node_modules', 'file'));

    const restore = await restoreSeed({ layout, env: { PATH: '/usr/bin:/bin' } });
    expect(restore.exitCode).toBe(0);
    const [store, linked] = await Promise.all([
      stat(join(layout.state, 'store', 'file')),
      stat(join(layout.project, 'node_modules', 'file'))
    ]);
    expect(linked.ino).toBe(store.ino);
    expect(store.nlink).toBe(2);

    await writeFile(join(layout.project, 'node_modules', 'marker'), 'x');
    const again = await restoreSeed({ layout, env: { PATH: '/usr/bin:/bin' } });
    expect(again.exitCode).toBe(0);
    expect(await readFile(join(layout.project, 'node_modules', 'marker')).catch(() => null)).toBeNull();
    expect(await readFile(join(layout.seed, 'project', 'node_modules', 'file'), 'utf8')).toBe('content');
  });
});

describe.skipIf(!linux)('invokeExtractedHandler', () => {
  const zipDirectory = async (name: string, handler: string) => {
    const source = join(root, name);
    await writeFiles(source, { 'index.js': handler, 'package.json': '{"type":"module"}' });
    const zip = join(root, `${name}.zip`);
    const zipped = Bun.spawnSync({
      cmd: [
        'python3',
        '-c',
        'import sys, zipfile\nwith zipfile.ZipFile(sys.argv[1], "w") as z:\n  z.write(sys.argv[2] + "/index.js", "index.js")\n  z.write(sys.argv[2] + "/package.json", "package.json")',
        zip,
        source
      ]
    });
    expect(zipped.exitCode).toBe(0);
    return zip;
  };
  const env = { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: tmpdir() };
  const node = Bun.which('node')!;

  test('extracts with unzip, imports index.js and reads the sentinel from the handler', async () => {
    const zip = await zipDirectory(
      'good',
      `export const handler = async () => ({ statusCode: 200, body: '${DEPENDENCY.sentinel}' });\n`
    );
    const invocation = await invokeExtractedHandler({ zipPath: zip, directory: join(root, 'good-out'), env, node });
    expect(invocation.extract.exitCode).toBe(0);
    expect(invocation.sentinelMatched).toBe(true);
    expect(invocation.result).toEqual({ statusCode: 200, body: DEPENDENCY.sentinel });
  });

  test('does not match another answer or a broken handler', async () => {
    const other = await zipDirectory(
      'other',
      "export const handler = async () => ({ statusCode: 200, body: 'other' });\n"
    );
    expect(
      (await invokeExtractedHandler({ zipPath: other, directory: join(root, 'other-out'), env, node })).sentinelMatched
    ).toBe(false);
    const broken = await zipDirectory('broken', 'export const handler = async () => { throw new Error("no"); };\n');
    const invocation = await invokeExtractedHandler({
      zipPath: broken,
      directory: join(root, 'broken-out'),
      env,
      node
    });
    expect(invocation.invoke?.exitCode).not.toBe(0);
    expect(invocation.sentinelMatched).toBe(false);
  });
});

describe('checkCiInstallSample', () => {
  const HELPERS = [{ file: 'stacktapeServiceLambda-426e5d54.zip', sha256: 'installed-service' }];
  const LOCK_SHA = 'a'.repeat(64);
  const file = (path: string, sha256: string): PayloadEntry => ({ path, kind: 'file', mode: 0o644, bytes: 10, sha256 });
  const handler = file(`${INVOCATION_PLACEHOLDER}/build/lambdas/${FUNCTION_NAME}/index.js`, 'bundle');

  /** A manifest meeting the contract: the helper snapshot, and a ZIP holding exactly its folder. */
  const artifacts = (canonical = canonicalPayloadDigest([{ ...handler, path: 'index.js' }])): ArtifactManifest => {
    const zip = `${INVOCATION_PLACEHOLDER}/build/lambdas/${FUNCTION_NAME}-d1.zip`;
    const helper = `${INVOCATION_PLACEHOLDER}/helper-lambdas/${HELPERS[0]!.file}`;
    const files = [file(zip, 'zip-bytes'), handler, file(helper, 'installed-service')];
    const directories = new Set<string>();
    for (const { path } of files) {
      const segments = path.split('/');
      for (let index = 1; index < segments.length; index++) directories.add(segments.slice(0, index).join('/'));
    }
    const archive = (path: string, canonicalSha256: string, sha256: string) => ({
      path,
      bytes: 100,
      sha256,
      timestampNormalizedSha256: null,
      entryOrderSha256: null,
      entrywiseNormalizedSha256: null,
      entries: 1,
      files: 1,
      uncompressedBytes: 10,
      canonicalSha256,
      modes: { '644': 1 },
      modificationTimes: { distinct: 1, earliest: null, latest: null },
      entryList: [],
      entryListTruncated: false
    });
    return {
      schema: 1,
      state: 'present',
      invocationDirectories: [],
      entries: [
        ...[...directories].map(
          (path): PayloadEntry => ({ path, kind: 'directory', mode: 0o755, bytes: null, sha256: null })
        ),
        ...files
      ],
      archives: [archive(zip, canonical, 'zip-bytes'), archive(helper, 'helper-canonical', 'installed-service')],
      totals: { files: files.length, directories: directories.size, bytes: 0, archives: 2 },
      problems: [],
      inspectMs: 1
    };
  };

  const projectState = {
    inputsIdentical: true,
    changedInputs: [],
    nodeModules: true,
    markerContent: LOCK_SHA,
    marker: 'matches' as const,
    installLock: false,
    lockfiles: ['package-lock.json']
  };

  const evidence = (overrides: Partial<CiInstallSampleEvidence> = {}): CiInstallSampleEvidence => ({
    manager: 'npm',
    state: 'partial',
    pnpmVersion: '11.17.0',
    lockSha256: LOCK_SHA,
    restore: {} as never,
    preparationMs: 10,
    before: { ...projectState, markerContent: null, marker: 'absent', sentinel: DEPENDENCY.sentinel },
    after: projectState,
    growth: {
      state: { files: 1, directories: 0, links: 0, bytes: 100 },
      nodeModules: { files: 0, directories: 0, links: 0, bytes: 0 }
    },
    invocation: { extract: {} as never, invoke: null, result: { body: DEPENDENCY.sentinel }, sentinelMatched: true },
    ...overrides
  });

  const analysis = (install: Partial<TimingAnalysis['dependencyInstalls'][number]>, installers: string[] = ['npm']) =>
    ({
      packagingPaths: { dockerRunning: false, split: 0, perFunction: 1, edge: 0, other: 0 },
      layeredChunks: null,
      failedAt: null,
      originToBundlingMs: 1800,
      dependencyInstalls: [
        {
          decision: 'installed',
          packageManager: 'npm',
          ciDetected: true,
          command: 'npm ci --no-audit --no-update-notifier',
          ms: 900,
          ...install
        }
      ],
      subprocesses: installers.map((executable) => ({
        executable,
        description: null,
        ordinal: 1,
        exitCode: 0,
        ms: 850
      }))
    }) as unknown as TimingAnalysis;

  const sample = (overrides: Partial<SampleRecord> = {}): SampleRecord =>
    ({
      id: 'ci-install-npm-partial-instrumented-3-01',
      suite: 'ci-install',
      scenario: 'npm-partial',
      install: 'instrumented-3',
      round: 1,
      warmUp: false,
      exitCode: 0,
      wallMs: 3000,
      invalidReasons: [],
      analysis: analysis({}),
      fixtureRequests: [
        {
          kind: 'aws',
          target: 'sts:GetCallerIdentity',
          status: 200,
          allowed: true,
          bytesIn: 1,
          bytesOut: 1,
          startMs: 1,
          endMs: 2
        }
      ],
      dnsQueries: [],
      artifacts: artifacts(),
      ciInstall: evidence(),
      ...overrides
    }) as SampleRecord;

  const check = (overrides: Partial<SampleRecord> = {}) =>
    checkCiInstallSample({ sample: sample(overrides), helperLambdas: HELPERS }).problems;

  test('accepts a partial sample that installed with npm ci, in CI, and left the marker', () => {
    expect(check()).toEqual([]);
  });

  test('accepts a marker mate that matched and started no installer', () => {
    expect(
      check({
        scenario: 'npm-marker',
        analysis: analysis({ decision: 'marker-matches', command: null, ms: 1 }, []),
        ciInstall: evidence({ state: 'marker', before: { ...projectState, sentinel: DEPENDENCY.sentinel } })
      })
    ).toEqual([]);
  });

  test.each([
    ['another command', { analysis: analysis({ command: 'npm install' }) }, 'ran npm install, not npm ci'],
    ['no CI detection', { analysis: analysis({ ciDetected: false }) }, 'the installer did not detect CI'],
    [
      'a skipped install',
      { analysis: analysis({ decision: 'marker-matches' }) },
      'decided marker-matches, not installed'
    ],
    ['no installer child', { analysis: analysis({}, []) }, 'installer children: none'],
    [
      'a marker the swallowed write never left',
      { ciInstall: evidence({ after: { ...projectState, markerContent: null, marker: 'absent' } }) },
      'the install marker afterwards is absent'
    ],
    [
      'a registry request the proxy refused',
      {
        fixtureRequests: [
          {
            kind: 'tunnel' as const,
            target: 'registry.npmjs.org:443',
            status: 403,
            allowed: false,
            bytesIn: 1,
            bytesOut: 1,
            startMs: 1,
            endMs: 2
          }
        ]
      },
      "requests beyond the CLI's own: tunnel registry.npmjs.org:443 403 refused"
    ],
    [
      'a DNS lookup',
      { dnsQueries: [{ name: 'registry.npmjs.org', type: 1, atMs: 1 }] },
      'DNS lookups: registry.npmjs.org'
    ],
    [
      'a left install lock',
      { ciInstall: evidence({ after: { ...projectState, installLock: true } }) },
      'a Stacktape install lock was left'
    ],
    [
      'a changed lockfile',
      {
        ciInstall: evidence({
          after: { ...projectState, inputsIdentical: false, changedInputs: ['package-lock.json'] }
        })
      },
      'inputs changed: package-lock.json'
    ],
    [
      'a handler that did not return the sentinel',
      {
        ciInstall: evidence({
          invocation: { extract: {} as never, invoke: null, result: null, sentinelMatched: false }
        })
      },
      'the extracted handler did not return the sentinel'
    ],
    [
      'a ZIP that is not its folder',
      { artifacts: artifacts('another payload') },
      "the ZIP's canonical content differs"
    ],
    ['a failed command', { exitCode: 1 }, 'exit code 1']
  ] as const)('refuses a markerless sample with %s', (_label, overrides, problem) => {
    expect(check(overrides as Partial<SampleRecord>).join('\n')).toContain(problem);
  });

  test('refuses a marker mate that started an installer anyway', () => {
    const problems = check({
      scenario: 'npm-marker',
      analysis: analysis({ decision: 'marker-matches' }, ['npm']),
      ciInstall: evidence({ state: 'marker' })
    });
    expect(problems).toContain('an installer ran: npm');
  });

  test('expects a partial pnpm tree to install with the exact pnpm dlx command for the declared version', () => {
    const problems = check({
      scenario: 'pnpm-partial',
      analysis: analysis({ command: 'pnpm install --frozen-lockfile', packageManager: 'pnpm' }, ['pnpm']),
      ciInstall: evidence({
        manager: 'pnpm',
        state: 'partial',
        after: { ...projectState, lockfiles: ['pnpm-lock.yaml'] }
      })
    });
    expect(problems).toEqual([
      'ran pnpm install --frozen-lockfile, not pnpm dlx pnpm@11.17.0 install --frozen-lockfile'
    ]);
  });

  test('expects a markerless pnpm sample to verify the completed install without an installer or a marker', () => {
    const pnpmAfter = {
      ...projectState,
      markerContent: null,
      marker: 'absent' as const,
      lockfiles: ['pnpm-lock.yaml']
    };
    const verified = check({
      scenario: 'pnpm-markerless',
      analysis: analysis({ decision: 'pnpm-install-verified', command: undefined, packageManager: 'pnpm' }, []),
      ciInstall: evidence({ manager: 'pnpm', state: 'markerless', after: pnpmAfter })
    });
    expect(verified).toEqual([]);
    const reinstalled = check({
      scenario: 'pnpm-markerless',
      analysis: analysis({ packageManager: 'pnpm' }, ['pnpm']),
      ciInstall: evidence({
        manager: 'pnpm',
        state: 'markerless',
        after: { ...pnpmAfter, markerContent: LOCK_SHA, marker: 'matches' }
      })
    });
    expect(reinstalled).toEqual([
      'decided installed, not pnpm-install-verified',
      'an installer ran: pnpm',
      'the install marker afterwards is matches'
    ]);
  });

  test('expects a markerless npm sample to verify the completed install without npm ci, a marker or a request', () => {
    const npmAfter = { ...projectState, markerContent: null, marker: 'absent' as const };
    expect(
      check({
        scenario: 'npm-markerless',
        analysis: analysis({ decision: 'npm-install-verified', command: undefined }, []),
        ciInstall: evidence({ state: 'markerless', after: npmAfter })
      })
    ).toEqual([]);
    expect(check({ scenario: 'npm-markerless', ciInstall: evidence({ state: 'markerless' }) })).toEqual([
      'decided installed, not npm-install-verified',
      'an installer ran: npm',
      'the install marker afterwards is matches'
    ]);
  });

  test('evaluates identity per manager and reports blocked managers and retained counts', () => {
    const result = evaluateCiInstall({
      samples: [sample(), sample({ id: 'second', round: 2, artifacts: artifacts('another payload') })],
      setup: {
        pnpmVersion: '11.17.0',
        prewarm: null,
        dependency: null,
        managers: [
          {
            manager: 'npm',
            blocked: null,
            packageManagerDeclaration: null,
            lockfile: 'package-lock.json',
            lockSha256: LOCK_SHA,
            inputs: {},
            lockfilesPresent: [],
            steps: [],
            seed: null
          },
          {
            manager: 'pnpm',
            blocked: 'pnpm dlx needs the registry',
            packageManagerDeclaration: null,
            lockfile: '',
            lockSha256: null,
            inputs: {},
            lockfilesPresent: [],
            steps: [],
            seed: null
          }
        ]
      },
      helperLambdas: HELPERS
    });
    expect(result.setupProblems).toEqual(['pnpm: pnpm dlx needs the registry']);
    expect(result.identity.find(({ manager }) => manager === 'npm')).toMatchObject({ samples: 2 });
    expect(result.identity.find(({ manager }) => manager === 'npm')!.canonicalSha256).toHaveLength(2);
    expect(result.retainedPerState).toContainEqual({ manager: 'npm', state: 'partial', retained: 2 });
    expect(result.retainedPerState).toContainEqual({ manager: 'pnpm', state: 'marker', retained: 0 });
  });
});
