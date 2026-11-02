import { join } from 'node:path';

const workspaceRoot = join(import.meta.dir, '..', '..', '..', '..');

/**
 * Formats generated files with `bun fmt` and the repository's formatter settings. The settings live in the root
 * bunfig.toml, so the formatter runs from the workspace root even for files outside it.
 */
export const formatFiles = (filePaths: string[]) => {
  const result = Bun.spawnSync([process.execPath, 'fmt', '--no-script', ...filePaths], {
    cwd: workspaceRoot,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe'
  });
  if (result.exitCode !== 0) {
    throw new Error(`bun fmt failed: ${result.stderr.toString().slice(0, 500)}`);
  }
};
