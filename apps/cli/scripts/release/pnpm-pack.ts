import { copyFileSync, unlinkSync } from 'node:fs';
import { basename, isAbsolute, join } from 'node:path';

export type PnpmPackResult = {
  filename: string;
  files: Array<{ path: string }>;
};

/** Runs the workspace package manager instead of assuming npm is installed beside Node. */
export const pnpmPack = ({
  packageDir,
  destination,
  dryRun = false
}: {
  packageDir: string;
  destination?: string;
  dryRun?: boolean;
}): PnpmPackResult => {
  const args = ['pack', ...(dryRun ? ['--dry-run'] : []), '--json'];
  const result = Bun.spawnSync({
    // pnpm's Windows shim is a batch file, so dynamic paths must never be passed through its command line.
    cmd: ['pnpm', ...args],
    cwd: packageDir,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      PATH: process.env.PATH ?? process.env.Path,
      COREPACK_ENABLE_NETWORK: '0',
      NPM_CONFIG_OFFLINE: 'true',
      PNPM_CONFIG_OFFLINE: 'true'
    }
  });

  if (result.exitCode !== 0) {
    throw new Error(`pnpm pack failed: ${result.stderr.toString() || result.stdout.toString()}`);
  }

  const parsed: unknown = JSON.parse(result.stdout.toString());
  const packResult = Array.isArray(parsed) ? parsed[0] : parsed;
  if (
    !packResult ||
    typeof packResult !== 'object' ||
    !('filename' in packResult) ||
    typeof packResult.filename !== 'string' ||
    !('files' in packResult) ||
    !Array.isArray(packResult.files) ||
    !packResult.files.every(
      (file) => file && typeof file === 'object' && 'path' in file && typeof file.path === 'string'
    )
  ) {
    throw new Error('pnpm pack returned an unexpected JSON response.');
  }
  const normalized = packResult as PnpmPackResult;
  if (!dryRun && destination) {
    const source = isAbsolute(normalized.filename) ? normalized.filename : join(packageDir, normalized.filename);
    const target = join(destination, basename(source));
    copyFileSync(source, target);
    unlinkSync(source);
    return { ...normalized, filename: target };
  }
  return normalized;
};
