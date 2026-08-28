import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, readlink, realpath, rename, stat } from 'node:fs/promises';
import { basename, join, relative, resolve, sep } from 'node:path';
import type { QualificationCaseManifest } from './contracts';
import { assertProcessSucceeded, runProcess } from './process';

export type AcquiredProject = {
  projectRoot: string;
  workRoot: string;
  sourceDescription: string;
  cacheHit: boolean;
};

const pathExists = async (path: string) => {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  }
};

const excludedSourceNames = new Set(['.git', 'node_modules', '.stacktape']);

const assertInside = (parent: string, child: string, label: string) => {
  const childRelative = relative(parent, child);
  if (childRelative === '..' || childRelative.startsWith(`..${sep}`) || resolve(childRelative) === childRelative) {
    throw new Error(`${label} resolves outside ${parent}.`);
  }
};

const repositoryName = (repository: string) =>
  basename(new URL(repository).pathname.replace(/\/$/, ''), '.git').replace(/[^a-zA-Z0-9_.-]+/g, '-');

const cacheKey = (repository: string, commit: string) => {
  const digest = createHash('sha256').update(repository).digest('hex').slice(0, 12);
  return `${repositoryName(repository)}-${digest}-${commit.slice(0, 12)}`;
};

const runGit = async (args: string[], cwd: string, timeoutMs = 10 * 60_000) => {
  const result = await runProcess({ command: 'git', args, cwd, timeoutMs });
  assertProcessSucceeded(result);
  return result.stdout.trim();
};

const hashSourceDirectory = async (sourceRoot: string) => {
  const hash = createHash('sha256');
  const visit = async (directory: string, relativeDirectory = ''): Promise<void> => {
    const entries = (await readdir(directory, { withFileTypes: true })).sort((left, right) =>
      left.name.localeCompare(right.name)
    );
    for (const entry of entries) {
      if (excludedSourceNames.has(entry.name)) continue;
      const relativePath = join(relativeDirectory, entry.name).replaceAll('\\', '/');
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        hash.update(`directory\0${relativePath}\0`);
        await visit(absolutePath, relativePath);
      } else if (entry.isFile()) {
        hash.update(`file\0${relativePath}\0`);
        hash.update(await readFile(absolutePath));
      } else if (entry.isSymbolicLink()) {
        hash.update(`symlink\0${relativePath}\0${await readlink(absolutePath)}\0`);
      } else {
        throw new Error(`Unsupported source entry ${relativePath}.`);
      }
    }
  };
  await visit(sourceRoot);
  return hash.digest('hex');
};

export const calculateSourceFingerprint = async ({
  entry,
  manifestDirectory
}: {
  entry: QualificationCaseManifest;
  manifestDirectory: string;
}) => {
  if (entry.source.kind === 'git') {
    return createHash('sha256').update(JSON.stringify(entry.source)).digest('hex');
  }
  const declaredRoot = await realpath(manifestDirectory);
  const sourceRoot = await realpath(resolve(manifestDirectory, entry.source.path));
  assertInside(declaredRoot, sourceRoot, `Local source for ${entry.id}`);
  return hashSourceDirectory(sourceRoot);
};

const prepareGitCheckout = async ({
  repository,
  commit,
  cacheRoot
}: {
  repository: string;
  commit: string;
  cacheRoot: string;
}) => {
  await mkdir(cacheRoot, { recursive: true });
  const expectedCheckout = join(cacheRoot, cacheKey(repository, commit));
  let checkout = expectedCheckout;
  let cacheHit = await pathExists(join(checkout, '.git'));

  if (cacheHit) {
    let checkoutIsReusable = false;
    try {
      const [remote, checkedOutCommit, trackedFiles, dirtyFiles] = await Promise.all([
        runGit(['remote', 'get-url', 'origin'], checkout),
        runGit(['rev-parse', 'HEAD'], checkout),
        runGit(['ls-files'], checkout),
        runGit(['status', '--porcelain=v1', '--untracked-files=all', '--ignored'], checkout)
      ]);
      checkoutIsReusable =
        remote === repository && checkedOutCommit === commit && trackedFiles.length > 0 && dirtyFiles.length === 0;
    } catch {}
    if (!checkoutIsReusable) {
      await rename(checkout, `${checkout}.quarantined-${process.pid}-${Date.now()}`);
      cacheHit = false;
    }
  }

  if (!cacheHit) {
    const temporaryCheckout = `${expectedCheckout}.partial-${process.pid}-${Date.now()}`;
    await runGit(['clone', '--no-checkout', '--filter=blob:none', repository, temporaryCheckout], cacheRoot);
    await runGit(['fetch', '--depth=1', 'origin', commit], temporaryCheckout);
    await runGit(['checkout', '--detach', '--force', commit], temporaryCheckout);
    await rename(temporaryCheckout, expectedCheckout);
    checkout = expectedCheckout;
  }

  const checkedOutCommit = await runGit(['rev-parse', 'HEAD'], checkout);
  if (checkedOutCommit !== commit) {
    throw new Error(`Git checked out ${checkedOutCommit}, but the manifest pins ${commit}.`);
  }
  return { checkout, cacheHit };
};

const copyProject = async ({ sourceRoot, workRoot, id }: { sourceRoot: string; workRoot: string; id: string }) => {
  const projectRoot = join(workRoot, id);
  await cp(sourceRoot, projectRoot, {
    recursive: true,
    dereference: false,
    filter: (source) => {
      const name = basename(source);
      return !excludedSourceNames.has(name);
    }
  });
  return projectRoot;
};

export const acquireProject = async ({
  entry,
  manifestDirectory,
  cacheRoot,
  workRoot
}: {
  entry: QualificationCaseManifest;
  manifestDirectory: string;
  cacheRoot: string;
  workRoot: string;
}): Promise<AcquiredProject> => {
  await mkdir(workRoot, { recursive: true });
  const caseWorkRoot = await mkdtemp(join(workRoot, `${entry.id}-`));

  if (entry.source.kind === 'local') {
    const declaredRoot = await realpath(manifestDirectory);
    const sourceRoot = await realpath(resolve(manifestDirectory, entry.source.path));
    assertInside(declaredRoot, sourceRoot, `Local source for ${entry.id}`);
    const projectRoot = await copyProject({ sourceRoot, workRoot: caseWorkRoot, id: entry.id });
    return {
      projectRoot,
      workRoot: caseWorkRoot,
      sourceDescription: sourceRoot,
      cacheHit: true
    };
  }

  const { checkout, cacheHit } = await prepareGitCheckout({
    repository: entry.source.repository,
    commit: entry.source.commit,
    cacheRoot
  });
  const checkoutRoot = await realpath(checkout);
  const sourceRoot = await realpath(
    entry.source.subdirectory === undefined ? checkout : join(checkout, entry.source.subdirectory)
  );
  assertInside(checkoutRoot, sourceRoot, `Git source for ${entry.id}`);
  const projectRoot = await copyProject({ sourceRoot, workRoot: caseWorkRoot, id: entry.id });
  return {
    projectRoot,
    workRoot: caseWorkRoot,
    sourceDescription: `${entry.source.repository}@${entry.source.commit}${
      entry.source.subdirectory === undefined ? '' : `:${entry.source.subdirectory}`
    }`,
    cacheHit
  };
};
