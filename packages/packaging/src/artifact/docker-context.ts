import dockerIgnore from '@balena/dockerignore';
import { createHash } from 'node:crypto';
import { lstat, readFile, readlink } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';
import fastGlob from 'fast-glob';
import { pathExists } from 'fs-extra';

const toDockerPath = (path: string) => path.replaceAll('\\', '/').replace(/\/$/, '');

const getDockerIgnorePath = async ({
  absoluteBuildContextPath,
  absoluteDockerfilePath
}: {
  absoluteBuildContextPath: string;
  absoluteDockerfilePath: string;
}): Promise<string | undefined> => {
  const dockerfileSpecificIgnorePath = `${absoluteDockerfilePath}.dockerignore`;
  if (await pathExists(dockerfileSpecificIgnorePath)) return dockerfileSpecificIgnorePath;

  const defaultIgnorePath = join(absoluteBuildContextPath, '.dockerignore');
  return (await pathExists(defaultIgnorePath)) ? defaultIgnorePath : undefined;
};

/**
 * Hashes the context Docker actually receives. Unlike ordinary Stacktape source hashing, this deliberately does not
 * exclude VCS, editor, dependency, or build-output directories: a custom Dockerfile can consume any of them. The
 * selected Dockerfile-specific ignore file takes precedence over the root `.dockerignore`, matching Docker.
 */
export const getDockerContextChecksum = async ({
  absoluteBuildContextPath,
  dockerfilePath = 'Dockerfile',
  includeDockerfile = true,
  applyDockerIgnore = true
}: {
  absoluteBuildContextPath: string;
  dockerfilePath?: string | undefined;
  includeDockerfile?: boolean | undefined;
  applyDockerIgnore?: boolean | undefined;
}): Promise<{
  checksum: string;
  absoluteDockerfilePath: string;
  includedFilePaths: string[];
}> => {
  const absoluteDockerfilePath = isAbsolute(dockerfilePath)
    ? dockerfilePath
    : join(absoluteBuildContextPath, dockerfilePath);
  const dockerIgnorePath = applyDockerIgnore
    ? await getDockerIgnorePath({ absoluteBuildContextPath, absoluteDockerfilePath })
    : undefined;
  const matcher = dockerIgnore();
  if (dockerIgnorePath) matcher.add(await readFile(dockerIgnorePath, 'utf8'));

  const contextEntries = await fastGlob('**/*', {
    cwd: absoluteBuildContextPath,
    dot: true,
    followSymbolicLinks: false,
    markDirectories: true,
    onlyFiles: false,
    unique: true
  });
  const includedEntries = matcher
    .filter(contextEntries)
    .map(toDockerPath)
    .filter(Boolean)
    .toSorted((left, right) => left.localeCompare(right));

  const inspectedEntries = await Promise.all(
    includedEntries.map(async (entry) => {
      const absolutePath = join(absoluteBuildContextPath, entry);
      const stats = await lstat(absolutePath);
      if (stats.isSymbolicLink()) {
        return { absolutePath, contents: await readlink(absolutePath), entry, kind: 'symlink' as const, stats };
      }
      if (stats.isFile()) {
        return { absolutePath, contents: await readFile(absolutePath), entry, kind: 'file' as const, stats };
      }
      return { absolutePath, contents: undefined, entry, kind: 'directory' as const, stats };
    })
  );

  const hash = createHash('sha1');
  const includedFilePaths: string[] = [];
  for (const { absolutePath, contents, entry, kind, stats } of inspectedEntries) {
    const mode = stats.mode & 0o777;
    const identity = `${kind}:${mode.toString(8)}:${entry}`;
    hash.update(`${Buffer.byteLength(identity)}:${identity}`);

    if (kind === 'symlink') {
      hash.update(`${Buffer.byteLength(contents)}:${contents}`);
      includedFilePaths.push(absolutePath);
    } else if (kind === 'file') {
      hash.update(`${contents.byteLength}:`);
      hash.update(contents);
      includedFilePaths.push(absolutePath);
    } else {
      hash.update('0:');
    }
  }

  // A Dockerfile may be outside the context and therefore absent from the inventory above.
  if (includeDockerfile) {
    const dockerfileContents = await readFile(absoluteDockerfilePath);
    const dockerfileIdentity = toDockerPath(relative(absoluteBuildContextPath, absoluteDockerfilePath));
    hash.update(
      `dockerfile:${Buffer.byteLength(dockerfileIdentity)}:${dockerfileIdentity}:${dockerfileContents.byteLength}:`
    );
    hash.update(dockerfileContents);
  }

  return { checksum: hash.digest('hex'), absoluteDockerfilePath, includedFilePaths };
};
