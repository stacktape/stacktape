import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NPM_RELEASE_FOLDER_PATH } from '../shared/naming/project-fs-paths';
import { generateReleaseChecksums } from './release/checksums';
import { verifyNpmPackage } from './verify-npm-package';

type PackagedLauncher = {
  verifyFileChecksum: (params: { filePath: string; fileName: string; manifestPath: string }) => Promise<void>;
};

const verifyReleaseArtifact = async () => {
  const fixtureDirectory = await mkdtemp(join(tmpdir(), 'stacktape-release-artifact-'));
  const generatedLlmDocsIndexPath = join(process.cwd(), '@generated', 'llm-docs', 'index.json');
  const generatedLlmDocsIndexSnapshotPath = join(fixtureDirectory, 'llm-docs-index.snapshot');
  const generatedLlmDocsIndexExisted = existsSync(generatedLlmDocsIndexPath);
  const archiveName = 'linux.tar.gz';
  const archivePath = join(fixtureDirectory, archiveName);

  try {
    if (generatedLlmDocsIndexExisted) {
      await copyFile(generatedLlmDocsIndexPath, generatedLlmDocsIndexSnapshotPath);
    }
    await writeFile(archivePath, 'release artifact fixture');
    const checksumsPath = await generateReleaseChecksums({ directory: fixtureDirectory });
    const build = Bun.spawnSync({
      cmd: [
        'bun',
        'run',
        'build:npm',
        '--version',
        '0.0.0-release-artifact',
        '--require-checksums',
        '--checksums-path',
        checksumsPath
      ],
      cwd: process.cwd(),
      stdout: 'inherit',
      stderr: 'inherit'
    });
    if (build.exitCode !== 0) {
      throw new Error(`Release npm build failed with exit code ${build.exitCode}.`);
    }

    const pack = Bun.spawnSync({
      cmd: ['npm', 'pack', NPM_RELEASE_FOLDER_PATH, '--pack-destination', fixtureDirectory, '--json'],
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe'
    });
    if (pack.exitCode !== 0) {
      throw new Error(`npm pack failed: ${pack.stderr.toString()}`);
    }
    const [{ filename }] = JSON.parse(pack.stdout.toString()) as [{ filename: string }];
    const tarballPath = join(fixtureDirectory, filename);
    const installDirectory = join(fixtureDirectory, 'installed');
    await mkdir(installDirectory, { recursive: true });
    await writeFile(join(installDirectory, 'package.json'), '{"private":true}\n');
    const install = Bun.spawnSync({
      cmd: [
        'npm',
        'install',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        '--package-lock=false',
        '--prefix',
        installDirectory,
        tarballPath
      ],
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe'
    });
    if (install.exitCode !== 0) {
      throw new Error(`npm install of packed artifact failed: ${install.stderr.toString()}`);
    }

    const installedPackagePath = join(installDirectory, 'node_modules', 'stacktape');
    const packageResult = await verifyNpmPackage({
      packageDir: installedPackagePath,
      requireChecksums: true
    });
    const require = createRequire(import.meta.url);
    const launcher = require(join(installedPackagePath, 'bin', 'stacktape.js')) as PackagedLauncher;
    const packagedManifestPath = join(installedPackagePath, 'SHA256SUMS');

    await launcher.verifyFileChecksum({
      filePath: archivePath,
      fileName: archiveName,
      manifestPath: packagedManifestPath
    });

    await writeFile(archivePath, 'tampered release artifact fixture');
    let rejectedTamperedArchive = false;
    try {
      await launcher.verifyFileChecksum({
        filePath: archivePath,
        fileName: archiveName,
        manifestPath: packagedManifestPath
      });
    } catch {
      rejectedTamperedArchive = true;
    }
    if (!rejectedTamperedArchive) {
      throw new Error('The packed npm launcher accepted a tampered release archive.');
    }

    console.info(
      `Verified release artifact stacktape@${packageResult.version}: ${packageResult.fileCount} packed files, checksum embedded, tampering rejected.`
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
