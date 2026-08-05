import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

export type GeneratedFileProblem = {
  kind: 'missing' | 'outdated' | 'unexpected';
  path: string;
};

const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

const listFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    })
  );
  return files.flat().toSorted(compareText);
};

const relativeFileSet = async (directory: string) =>
  new Set((await listFiles(directory)).map((path) => relative(directory, path).replaceAll('\\', '/')));

export const findGeneratedDirectoryProblems = async ({
  actualDirectory,
  expectedDirectory
}: {
  actualDirectory: string;
  expectedDirectory: string;
}): Promise<GeneratedFileProblem[]> => {
  const [actualFiles, expectedFiles] = await Promise.all([
    relativeFileSet(actualDirectory),
    relativeFileSet(expectedDirectory)
  ]);
  const paths = [...new Set([...actualFiles, ...expectedFiles])].toSorted(compareText);
  const problems = await Promise.all(
    paths.map(async (path): Promise<GeneratedFileProblem | undefined> => {
      if (!actualFiles.has(path)) return { kind: 'missing', path };
      if (!expectedFiles.has(path)) return { kind: 'unexpected', path };
      const [actual, expected] = await Promise.all([
        readFile(join(actualDirectory, path)),
        readFile(join(expectedDirectory, path))
      ]);
      return actual.equals(expected) ? undefined : { kind: 'outdated', path };
    })
  );

  return problems.filter((problem): problem is GeneratedFileProblem => problem !== undefined);
};

export const assertGeneratedDirectoryCurrent = async ({
  actualDirectory,
  expectedDirectory,
  label,
  fixCommand
}: {
  actualDirectory: string;
  expectedDirectory: string;
  label: string;
  fixCommand: string;
}): Promise<void> => {
  const problems = await findGeneratedDirectoryProblems({ actualDirectory, expectedDirectory });
  if (problems.length === 0) return;

  const details = problems.map(({ kind, path }) => `- ${kind}: ${path}`).join('\n');
  throw new Error(`${label} is not current:\n${details}\nRun \`${fixCommand}\` and commit the generated changes.`);
};

export const assertGeneratedFileCurrent = async ({
  actualPath,
  expectedPath,
  label,
  fixCommand
}: {
  actualPath: string;
  expectedPath: string;
  label: string;
  fixCommand: string;
}): Promise<void> => {
  const [actual, expected] = await Promise.all([
    readFile(actualPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined;
      throw error;
    }),
    readFile(expectedPath)
  ]);
  if (actual?.equals(expected)) return;

  const problem = actual ? 'outdated' : 'missing';
  throw new Error(`${label} is ${problem}. Run \`${fixCommand}\` and commit the generated change.`);
};
