import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, join, posix, relative } from 'node:path';
import type { DeploymentRequirement } from '../facts/project-facts';
import type { ServiceFactInput } from '../facts/service';
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

type IgnoreFile = { kind: 'missing' } | { kind: 'complete'; raw: string } | { kind: 'unverified' };

/** No absence inference from the bounded listing: an excluded/unreadable ignore file is unknown. */
const readIgnoreFile = async (context: ProbeContext, path: string): Promise<IgnoreFile> => {
  if (containedPath(path) !== path) return { kind: 'unverified' };
  const absolute = join(context.root, path);
  let entry;
  try {
    entry = await lstat(absolute);
  } catch (error) {
    return error instanceof Error && 'code' in error && error.code === 'ENOENT'
      ? { kind: 'missing' }
      : { kind: 'unverified' };
  }
  try {
    if (!entry.isFile() || !context.files.includes(path)) return { kind: 'unverified' };
    const [root, target] = await Promise.all([realpath(context.root), realpath(absolute)]);
    const fromRoot = relative(root, target).replaceAll('\\', '/');
    if (fromRoot === '..' || fromRoot.startsWith('../') || isAbsolute(fromRoot)) return { kind: 'unverified' };
    const contents = await context.read(path, { startLine: 1, endLine: Number.MAX_SAFE_INTEGER });
    return contents.kind === 'contents' && !contents.truncated
      ? { kind: 'complete', raw: contents.contents }
      : { kind: 'unverified' };
  } catch {
    return { kind: 'unverified' };
  }
};

/**
 * Docker selects `<invoked Dockerfile>.dockerignore` before `<context>/.dockerignore`.
 * Resolving an alias changes the invoked path, even though the Dockerfile bytes do not change.
 * Compare complete effective contents rather than approximating Docker's pattern semantics or
 * inspecting only today's listed files: either could miss a private file in the eventual build.
 * Intermediate aliases do not participate unless they are the path selected by the descriptor.
 */
export const dockerfileIgnoreRequirement = async (
  context: ProbeContext,
  service: ServiceFactInput
): Promise<DeploymentRequirement | undefined> => {
  if (service.dockerfileAlias === undefined || service.dockerfile === undefined) return undefined;
  // An authoritative published image does not upload or build this local Docker context.
  if (service.prebuiltImage !== undefined && service.prebuiltImageAuthoritative === true) return undefined;
  const buildRoot = service.buildRoot ?? service.path;
  const effective = async (dockerfile: string): Promise<string | undefined> => {
    const specific = await readIgnoreFile(context, `${dockerfile}.dockerignore`);
    if (specific.kind === 'complete') return specific.raw;
    if (specific.kind === 'unverified') return undefined;
    const fallback = await readIgnoreFile(context, posix.join(buildRoot, '.dockerignore'));
    return fallback.kind === 'missing' ? '' : fallback.kind === 'complete' ? fallback.raw : undefined;
  };
  const [original, canonical] = await Promise.all([effective(service.dockerfileAlias), effective(service.dockerfile)]);
  if (original !== undefined && canonical !== undefined && original === canonical) return undefined;
  return {
    kind: 'dockerfile-ignore-policy',
    serviceName: service.name,
    aliasDockerfile: service.dockerfileAlias,
    canonicalDockerfile: service.dockerfile,
    buildRoot,
    evidence: []
  };
};
