import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { DIST_PACKAGE_FOLDER_PATH, NPM_RELEASE_FOLDER_PATH } from 'src/config/project-paths';
import { getPlatform } from '@utils/bin-executable';
import AdmZip from 'adm-zip';
import stripAnsi from 'strip-ansi';
import * as tar from 'tar';
import { generateReleaseChecksums, verifyReleaseChecksum } from './release/checksums';
import { pnpmPack } from './release/pnpm-pack';
import { verifyHelperLambdaArtifacts } from './verify-helper-lambda-artifacts';
import { verifyNpmPackage } from './verify-npm-package';

type PackagedLauncher = {
  verifyFileChecksum: (params: { filePath: string; fileName: string; manifestPath: string }) => Promise<void>;
};

const RELEASE_VERSION = '0.0.0-release-artifact';
const REQUIRED_HELPER_LAMBDA_PREFIXES = [
  'stacktapeServiceLambda',
  'cdnOriginRequestLambda',
  'cdnOriginResponseLambda',
  'batchJobTriggerLambda'
];

const PLATFORM_RELEASE_DETAILS = {
  win: { archiveName: 'windows.zip', binaryName: 'stacktape.exe', launcherPlatformKey: 'win32-x64' },
  linux: { archiveName: 'linux.tar.gz', binaryName: 'stacktape', launcherPlatformKey: 'linux-x64' },
  'linux-arm': { archiveName: 'linux-arm.tar.gz', binaryName: 'stacktape', launcherPlatformKey: 'linux-arm64' },
  alpine: { archiveName: 'alpine.tar.gz', binaryName: 'stacktape', launcherPlatformKey: 'linux-x64-musl' },
  macos: { archiveName: 'macos.tar.gz', binaryName: 'stacktape', launcherPlatformKey: 'darwin-x64' },
  'macos-arm': { archiveName: 'macos-arm.tar.gz', binaryName: 'stacktape', launcherPlatformKey: 'darwin-arm64' }
} as const;

const OFFLINE_PACKAGE_MANAGER_ENV = {
  COREPACK_ENABLE_NETWORK: '0',
  NPM_CONFIG_OFFLINE: 'true',
  PNPM_CONFIG_OFFLINE: 'true'
};

const run = ({
  command,
  args,
  cwd = process.cwd(),
  env = {}
}: {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
}) => {
  const result = Bun.spawnSync({
    cmd: [command, ...args],
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, ...OFFLINE_PACKAGE_MANAGER_ENV, STP_DISABLE_TELEMETRY: '1', ...env }
  });
  const output = stripAnsi(`${result.stdout.toString()}${result.stderr.toString()}`);
  if (result.exitCode !== 0) {
    throw new Error(`\`${command} ${args.join(' ')}\` exited with ${result.exitCode}:\n${output}`);
  }
  return output;
};

const extractArchive = async ({ archivePath, destination }: { archivePath: string; destination: string }) => {
  if (archivePath.endsWith('.zip')) {
    new AdmZip(archivePath).extractAllTo(destination, true);
    return;
  }
  await tar.x({ file: archivePath, cwd: destination });
};

const parseJsonArtifact = async (filePath: string) => JSON.parse(await readFile(filePath, 'utf8')) as unknown;

const verifyNativeInstallation = async ({
  archivePath,
  installedPackagePath,
  fixtureDirectory
}: {
  archivePath: string;
  installedPackagePath: string;
  fixtureDirectory: string;
}) => {
  const platform = getPlatform();
  const { binaryName, launcherPlatformKey } = PLATFORM_RELEASE_DETAILS[platform];
  const binDirectory = join(installedPackagePath, 'bin');
  await extractArchive({ archivePath, destination: binDirectory });

  if (!existsSync(join(binDirectory, binaryName))) {
    throw new Error(`Native release archive is missing ${binaryName}.`);
  }
  for (const relativePath of ['config-schema.json', 'starter-projects-metadata.json']) {
    await parseJsonArtifact(join(binDirectory, relativePath));
  }

  // The `init` wizard is served from beside the binary. A release without it produces a CLI that
  // starts the wizard, opens a browser and serves nothing — which is exactly the failure a
  // development checkout cannot reproduce, because there the bundle is always in the workspace.
  const wizardEntryPath = join(binDirectory, 'init-ui', 'index.html');
  if (!existsSync(wizardEntryPath)) {
    throw new Error('Native release archive is missing the init wizard interface (init-ui/index.html).');
  }
  const wizardEntry = await readFile(wizardEntryPath, 'utf8');
  if (!/<script[^>]+src="[^"]+"/.test(wizardEntry)) {
    throw new Error('Native release archive contains an init wizard interface with no bundle to load.');
  }

  const docsChunkPath = join(binDirectory, 'llm-docs', 'chunks', 'chunks.jsonl');
  const firstDocsChunk = (await readFile(docsChunkPath, 'utf8')).split('\n').find(Boolean);
  if (!firstDocsChunk) {
    throw new Error('Native release archive contains an empty MCP documentation corpus.');
  }
  const parsedDocsChunk = JSON.parse(firstDocsChunk) as { content?: unknown; route?: unknown };
  if (typeof parsedDocsChunk.content !== 'string' || typeof parsedDocsChunk.route !== 'string') {
    throw new Error('Native release archive contains an invalid MCP documentation corpus.');
  }
  for (const excludedPath of [
    'compiled-cli.js.map',
    'package.json',
    'llm-docs/lexical-index.json',
    'llm-docs/llms-full.txt',
    'llm-docs/llms-api-reference.txt'
  ]) {
    if (existsSync(join(binDirectory, excludedPath))) {
      throw new Error(`Native release archive contains non-runtime payload: ${excludedPath}.`);
    }
  }

  const releaseData = (await parseJsonArtifact(join(binDirectory, 'release-data.json'))) as {
    version?: string;
  };
  if (releaseData.version !== RELEASE_VERSION) {
    throw new Error(`Native release version mismatch: expected ${RELEASE_VERSION}, received ${releaseData.version}.`);
  }

  if ((await stat(join(binDirectory, 'source-map-install.js'))).size === 0) {
    throw new Error('Native release archive contains an empty source-map-install.js.');
  }
  await verifyHelperLambdaArtifacts({ helperLambdasDir: join(binDirectory, 'helper-lambdas') });

  const executableExtension = platform === 'win' ? '.exe' : '';
  for (const nativeTool of [
    { path: `nixpacks/nixpacks${executableExtension}`, args: ['--version'] },
    { path: `pack/pack${executableExtension}`, args: ['version'] },
    { path: `session-manager-plugin/smp${executableExtension}`, args: ['--version'] }
  ]) {
    run({ command: join(binDirectory, nativeTool.path), args: nativeTool.args });
  }

  // The launcher normally writes this marker after downloading and extracting the same archive. Pre-populating its
  // local cache keeps the smoke offline while still exercising host selection, cache validation and binary execution.
  await writeFile(
    join(binDirectory, '.stacktape-install.json'),
    JSON.stringify({
      version: RELEASE_VERSION,
      platformKey: launcherPlatformKey,
      helperLambdas: REQUIRED_HELPER_LAMBDA_PREFIXES,
      installedAt: new Date(0).toISOString()
    })
  );

  const launcherPath = join(binDirectory, 'stacktape.js');
  const workspaceNodeModules = join(process.cwd(), 'node_modules');
  const nodePath = [workspaceNodeModules, process.env.NODE_PATH].filter(Boolean).join(delimiter);
  const networkGuardPath = join(fixtureDirectory, 'reject-node-network.cjs');
  await writeFile(
    networkGuardPath,
    `const http = require('node:http');
const https = require('node:https');
const reject = () => { throw new Error('Release artifact smoke forbids network access.'); };
http.get = reject;
http.request = reject;
https.get = reject;
https.request = reject;
globalThis.fetch = reject;
`
  );
  const launcherArgs = ['--require', networkGuardPath, launcherPath];
  const versionOutput = run({
    command: 'node',
    args: [...launcherArgs, '--version'],
    env: { NODE_PATH: nodePath }
  });
  if (!versionOutput.includes(`Stacktape version: ${RELEASE_VERSION}`)) {
    throw new Error(`Installed npm launcher returned the wrong version:\n${versionOutput}`);
  }
  const helpOutput = run({ command: 'node', args: [...launcherArgs, '--help'], env: { NODE_PATH: nodePath } });
  for (const expected of ['Available commands:', 'deploy', 'delete', 'package', 'CLI Documentation']) {
    if (!helpOutput.includes(expected)) {
      throw new Error(`Installed npm launcher help is missing ${expected}:\n${helpOutput}`);
    }
  }
};

const verifyReleaseArtifact = async () => {
  const fixtureDirectory = await mkdtemp(join(tmpdir(), 'stacktape-release-artifact-'));
  const generatedLlmDocsIndexPath = join(process.cwd(), '@generated', 'llm-docs', 'index.json');
  const generatedLlmDocsIndexSnapshotPath = join(fixtureDirectory, 'llm-docs-index.snapshot');
  const generatedLlmDocsIndexExisted = existsSync(generatedLlmDocsIndexPath);
  const platform = getPlatform();
  const { archiveName } = PLATFORM_RELEASE_DETAILS[platform];
  const archivePath = join(DIST_PACKAGE_FOLDER_PATH, archiveName);

  try {
    if (generatedLlmDocsIndexExisted) {
      await copyFile(generatedLlmDocsIndexPath, generatedLlmDocsIndexSnapshotPath);
    }
    run({
      command: 'bun',
      args: ['scripts/build-dist-package.ts', '--platform', platform, '--version', RELEASE_VERSION]
    });
    const checksumsPath = await generateReleaseChecksums({ directory: DIST_PACKAGE_FOLDER_PATH });
    await verifyReleaseChecksum({ filePath: archivePath, manifestPath: checksumsPath });
    const build = Bun.spawnSync({
      cmd: [
        'bun',
        'run',
        'build:npm',
        '--version',
        RELEASE_VERSION,
        '--require-checksums',
        '--checksums-path',
        checksumsPath
      ],
      cwd: process.cwd(),
      stdout: 'inherit',
      stderr: 'inherit',
      env: { ...process.env, ...OFFLINE_PACKAGE_MANAGER_ENV }
    });
    if (build.exitCode !== 0) {
      throw new Error(`Release npm build failed with exit code ${build.exitCode}.`);
    }

    const { filename } = await pnpmPack({ packageDir: NPM_RELEASE_FOLDER_PATH, destination: fixtureDirectory });
    const tarballPath = filename;
    const installedPackagePath = join(fixtureDirectory, 'node_modules', 'stacktape');
    await mkdir(installedPackagePath, { recursive: true });
    await tar.x({ file: tarballPath, cwd: installedPackagePath, strip: 1 });
    const packageResult = await verifyNpmPackage({
      packageDir: installedPackagePath,
      requireChecksums: true,
      expectedVersion: RELEASE_VERSION
    });
    const require = createRequire(import.meta.url);
    const launcher = require(join(installedPackagePath, 'bin', 'stacktape.js')) as PackagedLauncher;
    const packagedManifestPath = join(installedPackagePath, 'SHA256SUMS');

    await launcher.verifyFileChecksum({
      filePath: archivePath,
      fileName: archiveName,
      manifestPath: packagedManifestPath
    });

    const tamperedArchivePath = join(fixtureDirectory, archiveName);
    await copyFile(archivePath, tamperedArchivePath);
    await writeFile(tamperedArchivePath, 'tampered release artifact fixture');
    let rejectedTamperedArchive = false;
    try {
      await launcher.verifyFileChecksum({
        filePath: tamperedArchivePath,
        fileName: archiveName,
        manifestPath: packagedManifestPath
      });
    } catch {
      rejectedTamperedArchive = true;
    }
    if (!rejectedTamperedArchive) {
      throw new Error('The packed npm launcher accepted a tampered release archive.');
    }

    await verifyNativeInstallation({ archivePath, installedPackagePath, fixtureDirectory });

    console.info(
      `Verified ${platform} release artifact stacktape@${packageResult.version}: ${packageResult.fileCount} packed npm files, native archive checksum and contents, launcher version/help, tampering rejected.`
    );
  } finally {
    if (generatedLlmDocsIndexExisted) {
      await copyFile(generatedLlmDocsIndexSnapshotPath, generatedLlmDocsIndexPath);
    } else {
      await rm(generatedLlmDocsIndexPath, { force: true });
    }
    await rm(fixtureDirectory, { recursive: true, force: true });
  }
};

if (import.meta.main) {
  verifyReleaseArtifact().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
