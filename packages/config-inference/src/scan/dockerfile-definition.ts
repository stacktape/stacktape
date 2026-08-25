import { posix } from 'node:path';
import { isDockerfilePath } from '../policy/file-access';
import { readText, type ProbeContext } from './probe';

/** Bound both filesystem-link metadata and materialized pointer traversal to 32 inspected paths. */
export const MAX_DOCKERFILE_LINK_DEPTH = 32;

const pointerDeclaration = (raw: string): string | undefined => {
  const declaration = raw.trim().replaceAll('\\', '/');
  return !/[\r\n]/.test(declaration) && !declaration.includes('\0') && isDockerfilePath(declaration)
    ? declaration
    : undefined;
};

const containedPath = (path: string): string | undefined => {
  const normalized = posix.normalize(path.replaceAll('\\', '/'));
  return normalized === '..' ||
    normalized.startsWith('../') ||
    posix.isAbsolute(normalized) ||
    /^[A-Za-z]:/.test(normalized)
    ? undefined
    : normalized;
};

/**
 * Read the Dockerfile bytes that a repository path denotes.
 *
 * Git checkouts without symlink support materialize a Dockerfile symlink as its one-line target.
 * Resolving both representations here gives descriptor and standalone probes one canonical path.
 * A target must be present in the bounded repository listing; an unlisted target contributes no
 * facts merely because a real filesystem symlink can still reach its bytes.
 */
export const readDockerfileDefinition = async (
  context: ProbeContext,
  path: string,
  options: { fullFile?: boolean } = {}
): Promise<{ path: string; raw: string } | undefined> => {
  let current = containedPath(path);
  const visited = new Set<string>();
  for (let depth = 0; depth < MAX_DOCKERFILE_LINK_DEPTH; depth += 1) {
    if (current === undefined || visited.has(current) || !context.files.includes(current)) return undefined;
    visited.add(current);

    const linkedTarget = context.dockerfileSymlinkTargets.get(current);
    if (linkedTarget !== undefined) {
      current = containedPath(linkedTarget);
      continue;
    }

    // oxlint-disable-next-line no-await-in-loop -- a bounded, cycle-checked Dockerfile pointer chain.
    const raw = await readText(context, current, options);
    if (raw === undefined) return undefined;
    if (/^\s*FROM\s+\S+/im.test(raw)) return { path: current, raw };

    const declaration = pointerDeclaration(raw);
    if (declaration === undefined) return undefined;
    // Resolve relative to each pointer, not the original alias. `..` may stay inside the repository,
    // while absolute, drive-qualified and repository-escaping targets are always refused.
    if (posix.isAbsolute(declaration) || /^[A-Za-z]:/.test(declaration)) return undefined;
    current = containedPath(posix.join(posix.dirname(current), declaration));
  }
  return undefined;
};
