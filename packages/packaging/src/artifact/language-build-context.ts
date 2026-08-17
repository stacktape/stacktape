import { copy, ensureDir, remove } from 'fs-extra';
import { lstat, mkdtemp, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { getMatchingFilesByGlob } from '../fs/files';
import fastGlob from 'fast-glob';

const runWithConcurrency = async <Item>(
  items: Item[],
  concurrency: number,
  operation: (item: Item) => Promise<void>
): Promise<void> => {
  let nextIndex = 0;
  const runNext = async (): Promise<void> => {
    const index = nextIndex;
    nextIndex += 1;
    if (index >= items.length) return;
    await operation(items[index]!);
    await runNext();
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runNext()));
};

/** Files that can participate in or be emitted by a managed language build. */
export const STACKTAPE_LANGUAGE_SOURCE_GLOBS = [
  './**/*',
  '!./.dockerignore',
  '!./**/.git',
  '!./**/.git/**',
  '!./**/.stacktape',
  '!./**/.stacktape/**',
  '!./**/node_modules',
  '!./**/node_modules/**',
  '!./**/.venv',
  '!./**/.venv/**',
  '!./**/__pycache__',
  '!./**/__pycache__/**',
  '!./**/.pytest_cache',
  '!./**/.pytest_cache/**',
  '!./**/.mypy_cache',
  '!./**/.mypy_cache/**',
  '!./**/.ruff_cache',
  '!./**/.ruff_cache/**'
];

/**
 * Creates the exact filtered context used by generated buildpack Dockerfiles. This prevents local VCS metadata,
 * dependency stores, Stacktape output, and customer Docker-ignore rules from silently influencing an artifact whose
 * digest excludes them.
 */
export const createLanguageBuildContext = async (sourcePath: string): Promise<string> => {
  const contextPath = await mkdtemp(join(tmpdir(), 'stp-language-context-'));
  try {
    const realSourcePath = await realpath(sourcePath);
    const files = await getMatchingFilesByGlob({
      globPattern: STACKTAPE_LANGUAGE_SOURCE_GLOBS,
      cwd: sourcePath,
      followSymbolicLinks: true
    });
    // Validate the whole inventory before starting any copy. This is both a trust-boundary check and a cleanup
    // guarantee: a rejected link cannot race an in-flight sibling copy that recreates the temporary context.
    await runWithConcurrency(files, 64, async (filePath) => {
      const realSourceFilePath = await realpath(join(sourcePath, filePath));
      const relativeRealPath = relative(realSourcePath, realSourceFilePath);
      if (
        isAbsolute(relativeRealPath) ||
        relativeRealPath === '..' ||
        relativeRealPath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)
      ) {
        throw new Error(
          `Managed-language build context entry ${filePath} resolves outside its source directory. Remove or replace the escaping symbolic link.`
        );
      }
    });
    await runWithConcurrency(files, 64, async (filePath) => {
      const sourceFilePath = join(sourcePath, filePath);
      const destinationPath = join(contextPath, filePath);
      await ensureDir(dirname(destinationPath));
      await copy(sourceFilePath, destinationPath, {
        dereference: true,
        overwrite: true
      });
    });

    // File globs intentionally drive artifact identity, but empty runtime directories can still be meaningful to an
    // application. Preserve physical directories without following directory links (linked file contents were
    // already validated and materialized above).
    const directoryPaths = await fastGlob(STACKTAPE_LANGUAGE_SOURCE_GLOBS, {
      cwd: sourcePath,
      dot: true,
      followSymbolicLinks: false,
      onlyDirectories: true,
      unique: true
    });
    await Promise.all(
      directoryPaths.map(async (directoryPath) => {
        if ((await lstat(join(sourcePath, directoryPath))).isDirectory()) {
          await ensureDir(join(contextPath, directoryPath));
        }
      })
    );
    return contextPath;
  } catch (error) {
    await remove(contextPath).catch(() => {});
    throw error;
  }
};
