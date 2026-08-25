/** Standalone Dockerfiles are executable deployment facts, not hints for the agent. */

import { posix } from 'node:path';
import type { Citation } from '../../facts/citation';
import type { ServiceFactInput } from '../../facts/service';
import { isNonProductionFixturePath } from '../deployment-relevance';
import { citeFirstMatch, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
import { nearestManifestRoot } from '../service-root';

const serviceRootFor = (dockerfile: string, files: readonly string[]): string => {
  return nearestManifestRoot(dockerfile, files) ?? posix.dirname(dockerfile);
};

const DEVELOPMENT_ONLY_DIRECTORY = /(?:^|\/)(?:\.devcontainer|\.github|\.gitlab|\.circleci)(?:\/|$)/i;

const dockerfilePointerTarget = (path: string, raw: string, files: readonly string[]): string | undefined => {
  const declaration = raw.trim().replaceAll('\\', '/');
  if (!/^(?:[^/]+\/)*Dockerfile(?:\.[^/]+)?$/i.test(declaration)) return undefined;
  const directory = posix.dirname(path);
  const resolved = posix.normalize(directory === '.' ? declaration : posix.join(directory, declaration));
  if (resolved === '..' || resolved.startsWith('../') || !files.includes(resolved)) return undefined;
  return resolved;
};

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

const declaredVolumes = (path: string, raw: string): { paths: string[]; citation?: Citation } => {
  const paths: string[] = [];
  for (const match of raw.matchAll(/^\s*VOLUME\s+(.+)$/gim)) {
    const declaration = match[1]!.trim();
    let entries: string[];
    if (declaration.startsWith('[')) {
      try {
        const parsed = JSON.parse(declaration) as unknown;
        entries = Array.isArray(parsed) && parsed.every((entry) => typeof entry === 'string') ? parsed : [];
      } catch {
        entries = [];
      }
    } else {
      entries = declaration.split(/\s+/);
    }
    for (const entry of entries) {
      if (entry.startsWith('/') && !paths.includes(entry)) paths.push(entry);
    }
  }
  const citation = citeFirstMatch(path, raw, /^\s*VOLUME\s+/im, 'writesLocalFilesystem');
  return { paths, ...(citation === undefined ? {} : { citation }) };
};

export const dockerfileProbe: Probe = {
  name: 'dockerfile',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const candidates = context.files
      .filter(
        (path) =>
          /^Dockerfile(?:\.[^/]+)?$/i.test(posix.basename(path)) &&
          !DEVELOPMENT_ONLY_DIRECTORY.test(path) &&
          !isNonProductionFixturePath(path)
      )
      .toSorted((left, right) => {
        const leftExact = posix.basename(left).toLowerCase() === 'dockerfile';
        const rightExact = posix.basename(right).toLowerCase() === 'dockerfile';
        return leftExact === rightExact ? left.localeCompare(right) : leftExact ? -1 : 1;
      });
    const services = new Map<string, ServiceFactInput>();

    for (const path of candidates) {
      const root = serviceRootFor(path, context.files);
      if (services.has(root)) continue;
      // oxlint-disable-next-line no-await-in-loop -- one short, policy-controlled file per service root.
      const candidateRaw = await readText(context, path);
      if (candidateRaw === undefined) continue;
      const pointerTarget = dockerfilePointerTarget(path, candidateRaw, context.files);
      const dockerfile = pointerTarget ?? path;
      // A checked-out symbolic link can be materialized as a one-line target path on platforms
      // where Git symlinks are disabled. Follow only an exact repository-local Dockerfile pointer.
      // oxlint-disable-next-line no-await-in-loop -- at most one bounded pointer target per candidate.
      const raw = pointerTarget === undefined ? candidateRaw : await readText(context, pointerTarget);
      if (raw === undefined || !/^\s*FROM\s+\S+/im.test(raw)) continue;
      const { port, citation: portCitation } = exposedPort(dockerfile, raw);
      const { paths: volumePaths, citation: volumeCitation } = declaredVolumes(dockerfile, raw);
      const dockerfileCitation = citeFirstMatch(dockerfile, raw, /^\s*FROM\s+\S+/im, 'dockerfile');

      services.set(root, {
        name: serviceNameFor(root, context.root),
        path: root,
        language: 'container',
        exposesHttp: port !== undefined,
        ...(port === undefined ? {} : { port }),
        executionModel: 'long-running',
        dockerfile,
        ...(volumePaths.length === 0
          ? {}
          : {
              writesLocalFilesystem: { paths: volumePaths, purpose: 'unknown' as const },
              declaredContainerVolumes: { paths: volumePaths }
            }),
        environmentVariables: [],
        evidence: [dockerfileCitation, portCitation, volumeCitation].filter(
          (citation): citation is Citation => citation !== undefined
        ),
        source: 'probe'
      });
    }

    return services.size === 0 ? {} : { services: [...services.values()] };
  }
};
