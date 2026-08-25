/** Standalone Dockerfiles are executable deployment facts, not hints for the agent. */

import { posix } from 'node:path';
import type { Citation } from '../../facts/citation';
import type { ServiceFactInput } from '../../facts/service';
import { citeFirstMatch, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
import { goCodeWithoutComments } from '../go-source';
import { nearestManifestRoot } from '../service-root';

const serviceRootFor = (dockerfile: string, files: readonly string[]): string => {
  return nearestManifestRoot(dockerfile, files) ?? posix.dirname(dockerfile);
};

const DEVELOPMENT_ONLY_DIRECTORY = /(?:^|\/)(?:\.devcontainer|\.github|\.gitlab|\.circleci)(?:\/|$)/i;
const DEVELOPMENT_ONLY_DOCKERFILE = /^Dockerfile[.-](?:dev|development|test|local|ci)(?:[.-].*)?$/i;

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

const dockerfileInstructions = (raw: string): string[] =>
  raw
    .replace(/\\\r?\n/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));

const localCopySources = (instruction: string): string[] => {
  const match = /^(?:COPY|ADD)\s+(.+)$/i.exec(instruction);
  if (match === null || /^--from(?:=|\s)/i.test(match[1]!)) return [];
  const declaration = match[1]!.replace(/^(?:--[A-Za-z-]+(?:=\S+|\s+\S+)\s+)*/g, '').trim();
  if (declaration.startsWith('[')) {
    try {
      const values = JSON.parse(declaration) as unknown;
      return Array.isArray(values) && values.every((value) => typeof value === 'string') ? values.slice(0, -1) : [];
    } catch {
      return [];
    }
  }
  const tokens = declaration.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+/g) ?? [];
  return tokens.slice(0, -1).map((token) => token.replace(/^(?:"|')|(?:"|')$/g, ''));
};

const globPattern = (value: string): RegExp =>
  new RegExp(
    `^${value
      .replaceAll('\\', '/')
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replaceAll('**', '\u0000')
      .replaceAll('*', '[^/]*')
      .replaceAll('\u0000', '.*')
      .replaceAll('?', '[^/]')}(?:/|$)`
  );

/** A clean Docker build cannot COPY a local artifact that is absent from its build context. */
export const missingDockerfileCopySources = ({
  raw,
  root,
  files
}: {
  raw: string;
  root: string;
  files: readonly string[];
}): string[] => {
  const relativeFiles = files
    .filter((file) => root === '.' || file.startsWith(`${root}/`))
    .map((file) => (root === '.' ? file : file.slice(root.length + 1)));
  const missing = new Set<string>();
  for (const source of dockerfileInstructions(raw).flatMap(localCopySources)) {
    const normalized = source.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
    if (
      normalized === '' ||
      normalized === '.' ||
      normalized.startsWith('/') ||
      normalized.includes('$') ||
      /^(?:https?|git):\/\//i.test(normalized)
    ) {
      continue;
    }
    const pattern = globPattern(normalized);
    if (!relativeFiles.some((file) => pattern.test(file))) missing.add(source);
  }
  return [...missing];
};

const normalizedLocalCopySources = (raw: string): string[] =>
  dockerfileInstructions(raw)
    .flatMap(localCopySources)
    .map((source) => source.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, ''))
    .filter((source) => source !== '' && !source.startsWith('/') && !source.includes('$'));

const copySourceContains = (source: string, path: string): boolean => {
  if (source === '.') return true;
  if (source.includes('*') || source.includes('?') || source.includes('[')) return globPattern(source).test(path);
  return path === source || path.startsWith(`${source}/`) || source.startsWith(`${path}/`);
};

/**
 * A manually enumerated Go Dockerfile can become stale while every listed COPY still exists. If
 * checked-in code imports a module-local top-level package that the Dockerfile never copies, the Go
 * build is guaranteed to fail even though the ordinary missing-source check passes.
 */
const missingDockerfileGoPackages = async ({
  raw,
  root,
  context
}: {
  raw: string;
  root: string;
  context: ProbeContext;
}): Promise<string[]> => {
  const goMod = root === '.' ? 'go.mod' : `${root}/go.mod`;
  if (!context.files.includes(goMod)) return [];
  const goModRaw = await readText(context, goMod, { fullFile: true });
  const modulePath = goModRaw === undefined ? undefined : /^\s*module\s+(\S+)\s*$/m.exec(goModRaw)?.[1];
  if (modulePath === undefined) return [];
  const modulePrefix = `${modulePath}/`;
  const importedTopDirectories = new Set<string>();
  const sources = normalizedLocalCopySources(raw);
  const goFiles = context.files.filter(
    (file) =>
      file.endsWith('.go') &&
      !file.endsWith('_test.go') &&
      (root === '.' || file.startsWith(`${root}/`)) &&
      !/(?:^|\/)(?:vendor|test|tests|fixtures)(?:\/|$)/i.test(file)
  );
  for (const file of goFiles.slice(0, 750)) {
    const relativeFile = root === '.' ? file : file.slice(root.length + 1);
    if (!sources.some((source) => copySourceContains(source, relativeFile))) continue;
    // oxlint-disable-next-line no-await-in-loop -- bounded source reads are needed to prove Dockerfile completeness.
    const source = await readText(context, file, { fullFile: true });
    if (source === undefined) continue;
    for (const match of goCodeWithoutComments(source).matchAll(/["']([^"']+)["']/g)) {
      const imported = match[1];
      if (imported === undefined || !imported.startsWith(modulePrefix)) continue;
      const top = imported.slice(modulePrefix.length).split('/')[0];
      if (top !== undefined && top !== '') importedTopDirectories.add(top);
    }
  }
  return [...importedTopDirectories]
    .filter((directory) => {
      const repositoryDirectory = root === '.' ? directory : `${root}/${directory}`;
      if (!context.files.some((file) => file === repositoryDirectory || file.startsWith(`${repositoryDirectory}/`))) {
        return false;
      }
      return !sources.some((source) => copySourceContains(source, directory));
    })
    .toSorted();
};

export const dockerfileProbe: Probe = {
  name: 'dockerfile',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const candidates = context.files
      .filter(
        (path) =>
          /^Dockerfile(?:[.-][^/]+)?$/i.test(posix.basename(path)) &&
          !DEVELOPMENT_ONLY_DOCKERFILE.test(posix.basename(path)) &&
          !DEVELOPMENT_ONLY_DIRECTORY.test(path)
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
      const raw = await readText(context, path);
      if (raw === undefined || !/^\s*FROM\s+\S+/im.test(raw)) continue;
      // Some release-image Dockerfiles expect `make`/GoReleaser to place a binary in the checkout
      // before Docker runs. Init packages a clean checkout, so selecting such a file guarantees a
      // COPY failure. Another source probe can still keep the application using a native buildpack.
      if (missingDockerfileCopySources({ raw, root, files: context.files }).length > 0) continue;
      // oxlint-disable-next-line no-await-in-loop -- one candidate per service root survives this check.
      if ((await missingDockerfileGoPackages({ raw, root, context })).length > 0) continue;
      const { port, citation: portCitation } = exposedPort(path, raw);
      const dockerfileCitation = citeFirstMatch(path, raw, /^\s*FROM\s+\S+/im, 'dockerfile');

      services.set(root, {
        name: serviceNameFor(root, context.root),
        path: root,
        language: 'container',
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
