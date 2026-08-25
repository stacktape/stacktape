import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, readlink, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep, win32 } from 'node:path';

const safeCaseId = '[a-z0-9](?:[a-z0-9-]*[a-z0-9])?';
const retainedWorkdirName = `${safeCaseId}-[A-Za-z0-9]{6}`;

const isInside = (parent: string, child: string) => {
  const childRelative = relative(parent, child);
  return (
    childRelative === '' ||
    (!childRelative.startsWith(`..${sep}`) && childRelative !== '..' && !isAbsolute(childRelative))
  );
};

const allowedFile = (path: string, keepWorkdirs: boolean) =>
  path === 'qualification-report.json' ||
  path === 'qualification-report.md' ||
  new RegExp(`^cases/${safeCaseId}/(?:result\\.json|stacktape\\.yml|compiled-template\\.yml)$`).test(path) ||
  (keepWorkdirs && new RegExp(`^workdirs/${retainedWorkdirName}/.+`).test(path));

const allowedDirectory = (path: string, keepWorkdirs: boolean) =>
  path === 'cases' ||
  new RegExp(`^cases/${safeCaseId}$`).test(path) ||
  (keepWorkdirs && (path === 'workdirs' || new RegExp(`^workdirs/${retainedWorkdirName}(?:/.*)?$`).test(path)));

const limitsFor = (keepWorkdirs: boolean) => ({
  maxEntries: keepWorkdirs ? 200_000 : 10_000,
  maxBytes: keepWorkdirs ? 20 * 1024 ** 3 : 512 * 1024 ** 2
});

export type OutputArtifact = {
  path: string;
  size: number;
  sha256: string;
  type: 'file' | 'symlink';
  linkTarget?: string;
};

export type OutputInspection = {
  entries: number;
  directories: number;
  files: number;
  symlinks: number;
  totalBytes: number;
  limits: ReturnType<typeof limitsFor>;
};

export const inspectOutputTree = async (
  directory: string,
  keepWorkdirs: boolean,
  hashArtifacts = false
): Promise<{ inspection: OutputInspection; artifacts: OutputArtifact[] }> => {
  const limits = limitsFor(keepWorkdirs);
  const artifacts: OutputArtifact[] = [];
  let entries = 0;
  let directories = 0;
  let files = 0;
  let symlinks = 0;
  let totalBytes = 0;

  const account = (size: number) => {
    entries++;
    totalBytes += size;
    if (entries > limits.maxEntries || totalBytes > limits.maxBytes) {
      throw new Error(
        `Qualification output exceeds the ${limits.maxEntries}-entry or ${limits.maxBytes}-byte materialization limit.`
      );
    }
  };

  const visit = async (current: string, relativeDirectory = ''): Promise<void> => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const relativePath = join(relativeDirectory, entry.name).replaceAll('\\', '/');
      const absolutePath = join(current, entry.name);
      const metadata = await lstat(absolutePath);
      if (metadata.isDirectory()) {
        if (!allowedDirectory(relativePath, keepWorkdirs)) {
          throw new Error(`Qualification output contains an unexpected directory: ${relativePath}`);
        }
        directories++;
        account(0);
        await visit(absolutePath, relativePath);
        continue;
      }
      if (metadata.isSymbolicLink()) {
        if (!keepWorkdirs || !new RegExp(`^workdirs/${retainedWorkdirName}/.+`).test(relativePath)) {
          throw new Error(`Qualification output contains a link outside a retained workdir: ${relativePath}`);
        }
        const linkTarget = await readlink(absolutePath);
        if (isAbsolute(linkTarget) || win32.isAbsolute(linkTarget)) {
          throw new Error(`Qualification output contains an absolute link: ${relativePath} -> ${linkTarget}`);
        }
        const [, caseId] = relativePath.split('/');
        const workdirRoot = await realpath(join(directory, 'workdirs', caseId));
        let resolvedTarget: string;
        try {
          resolvedTarget = await realpath(resolve(absolutePath, '..', linkTarget));
        } catch {
          throw new Error(`Qualification output contains a broken link: ${relativePath} -> ${linkTarget}`);
        }
        if (!isInside(workdirRoot, resolvedTarget)) {
          throw new Error(`Qualification output contains an escaping link: ${relativePath} -> ${linkTarget}`);
        }
        const size = Buffer.byteLength(linkTarget);
        symlinks++;
        account(size);
        artifacts.push({
          path: relativePath,
          size,
          sha256: createHash('sha256').update(`symlink:${linkTarget}`).digest('hex'),
          type: 'symlink',
          linkTarget
        });
        continue;
      }
      if (!metadata.isFile()) {
        throw new Error(`Qualification output contains a special file: ${relativePath}`);
      }
      if (metadata.nlink !== 1) throw new Error(`Qualification output contains a hard-linked file: ${relativePath}`);
      if (!allowedFile(relativePath, keepWorkdirs)) {
        throw new Error(`Qualification output contains an unexpected artifact: ${relativePath}`);
      }
      files++;
      account(metadata.size);
      artifacts.push({
        path: relativePath,
        size: metadata.size,
        sha256: hashArtifacts
          ? createHash('sha256')
              .update(await readFile(absolutePath))
              .digest('hex')
          : createHash('sha256').update(`${relativePath}:${metadata.size}`).digest('hex'),
        type: 'file'
      });
    }
  };

  await visit(directory);
  return {
    inspection: { entries, directories, files, symlinks, totalBytes, limits },
    artifacts: artifacts.sort((left, right) => left.path.localeCompare(right.path))
  };
};

if (import.meta.main) {
  void inspectOutputTree('/qualification/output', process.env.KEEP_WORKDIRS === '1')
    .then(({ inspection }) => process.stdout.write(`${JSON.stringify(inspection)}\n`))
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
