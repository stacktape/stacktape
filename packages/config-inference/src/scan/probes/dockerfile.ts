/** Standalone Dockerfiles are executable deployment facts, not hints for the agent. */

import { posix } from 'node:path';
import type { Citation } from '../../facts/citation';
import type { ServiceFactInput } from '../../facts/service';
import { citeFirstMatch, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
import { languageOf } from '../language';
import { nearestManifestRoot } from '../service-root';

const serviceRootFor = (dockerfile: string, files: readonly string[]): string => {
  return nearestManifestRoot(dockerfile, files) ?? posix.dirname(dockerfile);
};

const globToPattern = (glob: string): RegExp =>
  new RegExp(
    `^${glob
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')}(?:/|$)`
  );

const existsUnder = (directory: string, source: string, files: readonly string[]): boolean => {
  const path = posix.normalize(directory === '.' ? source : `${directory}/${source}`).replace(/^\.\//, '');
  if (path === '.' || path === '') return true;
  const pattern = globToPattern(path);
  return files.some((file) => pattern.test(file));
};

/**
 * The directory `docker build` must receive as its context. A Dockerfile in `streaming/` that copies `./streaming`
 * and the root `package.json` was written for the repository root; using its own directory as the context fails at
 * the first COPY. The root wins when a copied source exists only there.
 */
const buildContextFor = (dockerfile: string, raw: string, files: readonly string[]): string => {
  const directory = posix.dirname(dockerfile);
  if (directory === '.') return '.';
  const sources = [...raw.matchAll(/^\s*(?:COPY|ADD)\s+(.*)$/gim)].flatMap((match) => {
    const words = match[1]!.trim().split(/\s+/);
    if (words.some((word) => word.startsWith('--from='))) return [];
    return words.filter((word) => !word.startsWith('--')).slice(0, -1);
  });
  const local = sources.filter((source) => !/^[a-z]+:\/\//i.test(source) && !source.startsWith('/'));
  const rootOnly = local.some((source) => !existsUnder(directory, source, files) && existsUnder('.', source, files));
  return rootOnly ? '.' : directory;
};

const DEVELOPMENT_ONLY_DIRECTORY = /(?:^|\/)(?:\.devcontainer|\.github|\.gitlab|\.circleci)(?:\/|$)/i;

const serviceNameFor = (root: string, repositoryRoot: string): string =>
  root === '.' ? (repositoryRoot.split(/[/\\]/).findLast((segment) => segment !== '') ?? 'app') : posix.basename(root);

const exposedPort = (path: string, raw: string): { port?: number; citation?: Citation } => {
  const match = /^\s*EXPOSE\s+(\d{2,5})(?:\/tcp)?\s*$/im.exec(raw);
  if (match === null) return {};
  const port = Number.parseInt(match[1]!, 10);
  if (port < 1 || port > 65_535) return {};
  const citation = citeFirstMatch(path, raw, /^\s*EXPOSE\s+\d{2,5}/im, 'port');
  return {
    port,
    ...(citation === undefined ? {} : { citation })
  };
};

export const dockerfileProbe: Probe = {
  name: 'dockerfile',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const candidates = context.files
      .filter(
        // `Containerfile` is the Podman/OCI name for the same file; Forem ships one with a `Dockerfile` symlink.
        (path) =>
          /^(?:Dockerfile|Containerfile)(?:\.[^/]+)?$/i.test(posix.basename(path)) &&
          !DEVELOPMENT_ONLY_DIRECTORY.test(path)
      )
      .toSorted((left, right) => {
        const leftExact = /^(?:dockerfile|containerfile)$/.test(posix.basename(left).toLowerCase());
        const rightExact = /^(?:dockerfile|containerfile)$/.test(posix.basename(right).toLowerCase());
        return leftExact === rightExact ? left.localeCompare(right) : leftExact ? -1 : 1;
      });
    const services = new Map<string, ServiceFactInput>();

    for (const path of candidates) {
      const root = serviceRootFor(path, context.files);
      if (services.has(root)) continue;
      // oxlint-disable-next-line no-await-in-loop -- one short, policy-controlled file per service root.
      const raw = await readText(context, path);
      if (raw === undefined || !/^\s*FROM\s+\S+/im.test(raw)) continue;
      const { port, citation: portCitation } = exposedPort(path, raw);
      const dockerfileCitation = citeFirstMatch(path, raw, /^\s*FROM\s+\S+/im, 'dockerfile');
      // Only a Dockerfile that must be built from the repository root overrides the context; otherwise the
      // service root stands, and a Compose file's declared context still wins during assembly.
      const buildsFromRepositoryRoot = root !== '.' && buildContextFor(path, raw, context.files) === '.';

      services.set(root, {
        name: serviceNameFor(root, context.root),
        path: root,
        ...(buildsFromRepositoryRoot ? { buildRoot: '.' } : {}),
        // The source markers beside the Dockerfile say what it builds; that keeps a Go server at the root apart from
        // a same-named JavaScript client in a child directory.
        language: languageOf(context.files, root) ?? 'container',
        exposesHttp: port !== undefined,
        ...(port === undefined ? {} : { port }),
        executionModel: 'long-running',
        dockerfile: path,
        environmentVariables: [],
        evidence: [dockerfileCitation, portCitation].filter((citation): citation is Citation => citation !== undefined),
        source: 'probe'
      });
    }

    return services.size === 0 ? {} : { services: [...services.values()] };
  }
};
