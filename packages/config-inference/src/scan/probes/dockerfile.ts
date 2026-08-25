/** Standalone Dockerfiles are executable deployment facts, not hints for the agent. */

import { posix } from 'node:path';
import type { Citation } from '../../facts/citation';
import type { ServiceFactInput } from '../../facts/service';
import { citeFirstMatch, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
import { goFileMatchesBuildTarget, goImports } from '../go-source';
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

const dockerIgnorePattern = (rawPattern: string): RegExp | undefined => {
  const anchored = rawPattern.startsWith('/');
  const normalized = rawPattern.replaceAll('\\', '/').replace(/^\//, '').replace(/\/$/, '');
  if (normalized === '' || normalized === '.') return undefined;
  let body = '';
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index]!;
    if (character === '*' && normalized[index + 1] === '*') {
      if (normalized[index + 2] === '/') {
        // Docker's `**/foo` also matches `foo` at the context root.
        body += '(?:.*/)?';
        index += 2;
      } else {
        body += '.*';
        index += 1;
      }
    } else if (character === '*') body += '[^/]*';
    else if (character === '?') body += '[^/]';
    else body += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  const fromRoot = anchored || normalized.includes('/');
  try {
    return new RegExp(`${fromRoot ? '^' : '(?:^|/)'}${body}(?:/|$)`);
  } catch {
    return undefined;
  }
};

const isDockerIgnored = (path: string, dockerignore: string | undefined): boolean => {
  if (dockerignore === undefined) return false;
  let ignored = false;
  for (const line of dockerignore.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const negated = trimmed.startsWith('!');
    const pattern = dockerIgnorePattern(negated ? trimmed.slice(1) : trimmed);
    if (pattern?.test(path)) ignored = !negated;
  }
  return ignored;
};

const normalizedLocalCopySources = (raw: string): string[] =>
  dockerfileInstructions(raw)
    .flatMap(localCopySources)
    .map((source) => source.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, ''))
    .filter((source) => source !== '' && !source.startsWith('/') && !source.includes('$'));

const copySourceContains = (source: string, path: string): boolean => {
  if (source === '.') return true;
  if (source.includes('*') || source.includes('?') || source.includes('[')) return globPattern(source).test(path);
  return path === source || path.startsWith(`${source}/`);
};

const goBuildTargetContains = (target: string, directory: string): boolean =>
  directory === target || (target !== '.' && directory.startsWith(`${target}/`));

/**
 * A manually enumerated Go Dockerfile can become stale while every listed COPY still exists. If
 * checked-in code imports a module-local top-level package that the Dockerfile never copies, the Go
 * build is guaranteed to fail even though the ordinary missing-source check passes.
 */
const missingDockerfileGoPackages = async ({
  raw,
  root,
  context,
  buildContextFiles
}: {
  raw: string;
  root: string;
  context: ProbeContext;
  buildContextFiles: readonly string[];
}): Promise<string[]> => {
  const goMod = root === '.' ? 'go.mod' : `${root}/go.mod`;
  if (!context.files.includes(goMod)) return [];
  const goModRaw = await readText(context, goMod, { fullFile: true });
  const modulePath = goModRaw === undefined ? undefined : /^\s*module\s+(\S+)\s*$/m.exec(goModRaw)?.[1];
  if (modulePath === undefined) return [];
  const modulePrefix = `${modulePath}/`;
  const sources = normalizedLocalCopySources(raw);
  const allGoFiles = context.files.filter(
    (file) =>
      file.endsWith('.go') &&
      !file.endsWith('_test.go') &&
      (root === '.' || file.startsWith(`${root}/`)) &&
      !/(?:^|\/)(?:vendor|test|tests|fixtures)(?:\/|$)/i.test(file)
  );
  const buildFiles = new Set(buildContextFiles);
  const sourceByRelativePath = new Map<string, string>();
  for (const file of allGoFiles.slice(0, 750)) {
    const relativeFile = root === '.' ? file : file.slice(root.length + 1);
    // oxlint-disable-next-line no-await-in-loop -- bounded source reads are needed to prove Dockerfile completeness.
    const source = await readText(context, file, { fullFile: true });
    if (source !== undefined && goFileMatchesBuildTarget(relativeFile, source))
      sourceByRelativePath.set(relativeFile, source);
  }
  const copiedFiles = new Set(
    [...sourceByRelativePath.keys()].filter(
      (file) => buildFiles.has(file) && sources.some((source) => copySourceContains(source, file))
    )
  );
  const build = dockerfileGoBuildSelection(raw);
  const pending = !build.found
    ? [...copiedFiles]
    : [...copiedFiles].filter((file) =>
        build.targets.some((target) => goBuildTargetContains(target, posix.dirname(file)))
      );
  const visited = new Set<string>();
  const missing = new Set<string>();
  if (build.found) {
    for (const target of build.targets) {
      const repositoryHasTarget = [...sourceByRelativePath.keys()].some((file) =>
        goBuildTargetContains(target, posix.dirname(file))
      );
      const copiedTarget = [...copiedFiles].some((file) => goBuildTargetContains(target, posix.dirname(file)));
      if (repositoryHasTarget && !copiedTarget) missing.add(target);
    }
  }
  while (pending.length > 0) {
    const file = pending.shift()!;
    if (visited.has(file)) continue;
    visited.add(file);
    const source = sourceByRelativePath.get(file);
    if (source === undefined) continue;
    for (const imported of goImports(source)) {
      if (!imported.path.startsWith(modulePrefix)) continue;
      const directory = posix.normalize(imported.path.slice(modulePrefix.length));
      if (directory === '' || directory === '..' || directory.startsWith('../')) continue;
      const repositoryHasPackage = allGoFiles.some((candidate) => {
        const relative = root === '.' ? candidate : candidate.slice(root.length + 1);
        return posix.dirname(relative) === directory;
      });
      if (!repositoryHasPackage) continue;
      const included = [...sourceByRelativePath.keys()].filter(
        (candidate) =>
          posix.dirname(candidate) === directory &&
          buildFiles.has(candidate) &&
          sources.some((copySource) => copySourceContains(copySource, candidate))
      );
      if (included.length === 0) {
        missing.add(directory);
        continue;
      }
      for (const candidate of included) if (!visited.has(candidate)) pending.push(candidate);
    }
  }
  return [...missing].toSorted();
};

const dockerBuildContextFiles = async (root: string, context: ProbeContext): Promise<string[]> => {
  const ignorePath = root === '.' ? '.dockerignore' : `${root}/.dockerignore`;
  const dockerignore = context.files.includes(ignorePath)
    ? await readText(context, ignorePath, { fullFile: true })
    : undefined;
  return context.files
    .filter((file) => root === '.' || file.startsWith(`${root}/`))
    .map((file) => (root === '.' ? file : file.slice(root.length + 1)))
    .filter((file) => !isDockerIgnored(file, dockerignore));
};

const dockerfileGoBuildSelection = (raw: string): { found: boolean; targets: string[] } => {
  let found = false;
  const targets = new Set<string>();
  for (const instruction of dockerfileInstructions(raw)) {
    if (!/^RUN\s+/i.test(instruction)) continue;
    const command = instruction.replace(/^RUN\s+/i, '');
    for (const match of command.matchAll(
      /(?:^|[;&|]\s*)(?:[A-Za-z_][A-Za-z0-9_]*=\S+\s+)*go\s+build(?:\s+([^;&|]+))?(?=$|[;&|])/g
    )) {
      found = true;
      const tokens = match[1]?.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+/g) ?? [];
      let skipValue = false;
      let positionalTarget = false;
      for (const rawToken of tokens) {
        const token = rawToken.replace(/^(?:"|')|(?:"|')$/g, '');
        if (skipValue) {
          skipValue = false;
          continue;
        }
        if (
          token === '-o' ||
          token === '-p' ||
          token === '-tags' ||
          token === '-ldflags' ||
          token === '-gcflags' ||
          token === '-asmflags' ||
          token === '-mod' ||
          token === '-modfile' ||
          token === '-overlay' ||
          token === '-pkgdir' ||
          token === '-toolexec' ||
          token === '-coverpkg'
        ) {
          skipValue = true;
          continue;
        }
        if (token.startsWith('-')) continue;
        positionalTarget = true;
        const withoutRecursiveSuffix = token.endsWith('/...') ? token.slice(0, -4) || '.' : token;
        const normalizedToken = posix.normalize(withoutRecursiveSuffix.replace(/^\.\//, '').replace(/\/$/, ''));
        const normalized = normalizedToken.endsWith('.go') ? posix.dirname(normalizedToken) : normalizedToken;
        if (normalized !== '' && normalized !== '..' && !normalized.startsWith('../') && !normalized.includes('$')) {
          targets.add(normalized);
        }
      }
      if (!positionalTarget) targets.add('.');
    }
  }
  return { found, targets: [...targets].toSorted() };
};

export const dockerfileGoBuildDirectories = (raw: string): string[] =>
  dockerfileGoBuildSelection(raw).targets.filter((target) => target !== '.');

export const dockerfileCanBuildContext = async ({
  raw,
  root,
  context
}: {
  raw: string;
  root: string;
  context: ProbeContext;
}): Promise<boolean> => {
  const buildContextFiles = await dockerBuildContextFiles(root, context);
  return (
    missingDockerfileCopySources({ raw, root: '.', files: buildContextFiles }).length === 0 &&
    (await missingDockerfileGoPackages({ raw, root, context, buildContextFiles })).length === 0
  );
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
      // oxlint-disable-next-line no-await-in-loop -- one candidate per service root survives this check.
      if (!(await dockerfileCanBuildContext({ raw, root, context }))) continue;
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
