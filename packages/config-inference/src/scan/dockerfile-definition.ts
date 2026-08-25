import { posix } from 'node:path';
import { readText, type ProbeContext } from './probe';

const pointerDeclaration = (raw: string): string | undefined => {
  const declaration = raw.trim().replaceAll('\\', '/');
  return /^(?:[^/]+\/)*Dockerfile(?:\.[^/]+)?$/i.test(declaration) ? declaration : undefined;
};

const pointerTarget = (path: string, declaration: string): string | undefined => {
  const directory = posix.dirname(path);
  const resolved = posix.normalize(directory === '.' ? declaration : posix.join(directory, declaration));
  return resolved === '..' || resolved.startsWith('../') ? undefined : resolved;
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
  if (!context.files.includes(path)) return undefined;
  const candidateRaw = await readText(context, path, options);
  if (candidateRaw === undefined) return undefined;

  const linkedTarget = context.dockerfileSymlinkTargets.get(path);
  const declaration = linkedTarget === undefined ? pointerDeclaration(candidateRaw) : undefined;
  const target = linkedTarget ?? (declaration === undefined ? undefined : pointerTarget(path, declaration));
  if (declaration !== undefined && target === undefined) return undefined;
  if (target === undefined) return { path, raw: candidateRaw };
  if (!context.files.includes(target)) return undefined;

  const raw = await readText(context, target, options);
  return raw === undefined ? undefined : { path: target, raw };
};
