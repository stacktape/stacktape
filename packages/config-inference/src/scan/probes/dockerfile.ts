/** Standalone Dockerfiles are executable deployment facts, not hints for the agent. */

import { posix } from 'node:path';
import type { Citation } from '../../facts/citation';
import type { ServiceFactInput } from '../../facts/service';
import { isNonProductionFixturePath } from '../deployment-relevance';
import { readDockerfileDefinition } from '../dockerfile-definition';
import { activeWorkspaceDirectories, isIncidentalPath } from '../incidental-directories';
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

type StageState = {
  workdir: string;
  containerFiles: Map<string, string>;
  goBuildTargets: string[];
};

const parseDockerfileStages = (
  raw: string,
  buildContextFiles: readonly string[]
): {
  stages: StageState[];
  hasGoBuild: boolean;
  allTargets: string[];
} => {
  const instructions = dockerfileInstructions(raw);
  const stages: StageState[] = [];
  let currentStage: StageState = {
    workdir: '/',
    containerFiles: new Map<string, string>(),
    goBuildTargets: []
  };
  let hasGoBuild = false;
  const allTargets = new Set<string>();

  for (const instruction of instructions) {
    if (/^FROM\s+/i.test(instruction)) {
      currentStage = {
        workdir: '/',
        containerFiles: new Map<string, string>(),
        goBuildTargets: []
      };
      stages.push(currentStage);
      continue;
    }

    if (/^WORKDIR\s+/i.test(instruction)) {
      const match = /^WORKDIR\s+(.+)$/i.exec(instruction);
      if (match !== null) {
        const rawDir = match[1]!.trim().replace(/^(?:"|')|(?:"|')$/g, '');
        if (rawDir.startsWith('/')) {
          currentStage.workdir = posix.normalize(rawDir);
        } else {
          currentStage.workdir = posix.normalize(posix.join(currentStage.workdir, rawDir));
        }
      }
      continue;
    }

    const copyMatch = /^(?:COPY|ADD)\s+(.+)$/i.exec(instruction);
    if (copyMatch !== null) {
      if (/^--from(?:=|\s)/i.test(copyMatch[1]!)) {
        continue;
      }
      const declaration = copyMatch[1]!.replace(/^(?:--[A-Za-z-]+(?:=\S+|\s+\S+)\s+)*/g, '').trim();
      let sources: string[] = [];
      let dest = '';
      if (declaration.startsWith('[')) {
        try {
          const values = JSON.parse(declaration) as unknown;
          if (Array.isArray(values) && values.length >= 2 && values.every((v) => typeof v === 'string')) {
            sources = values.slice(0, -1);
            dest = values.at(-1)!;
          }
        } catch {
          // malformed JSON declaration
        }
      } else {
        const tokens = declaration.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+/g) ?? [];
        if (tokens.length >= 2) {
          sources = tokens.slice(0, -1).map((t) => t.replace(/^(?:"|')|(?:"|')$/g, ''));
          dest = tokens.at(-1)!.replace(/^(?:"|')|(?:"|')$/g, '');
        }
      }
      if (dest !== '') {
        const destContainerPath = dest.startsWith('/')
          ? posix.normalize(dest)
          : posix.normalize(posix.join(currentStage.workdir, dest));
        const destIsDirectory =
          dest.endsWith('/') || dest.endsWith('/.') || dest === '.' || dest === '/.' || sources.length > 1;

        for (const rawSource of sources) {
          const source = rawSource.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
          if (source === '' || source === '.') {
            for (const file of buildContextFiles) {
              const target = destIsDirectory ? posix.normalize(posix.join(destContainerPath, file)) : destContainerPath;
              currentStage.containerFiles.set(target, file);
            }
          } else if (source.includes('*') || source.includes('?') || source.includes('[')) {
            const pattern = globPattern(source);
            for (const file of buildContextFiles) {
              if (pattern.test(file)) {
                const target = destIsDirectory
                  ? posix.normalize(posix.join(destContainerPath, posix.basename(file)))
                  : destContainerPath;
                currentStage.containerFiles.set(target, file);
              }
            }
          } else {
            for (const file of buildContextFiles) {
              if (file === source) {
                const target = destIsDirectory
                  ? posix.normalize(posix.join(destContainerPath, posix.basename(file)))
                  : destContainerPath;
                currentStage.containerFiles.set(target, file);
              } else if (file.startsWith(`${source}/`)) {
                const rel = posix.relative(source, file);
                const target = posix.normalize(posix.join(destContainerPath, rel));
                currentStage.containerFiles.set(target, file);
              }
            }
          }
        }
      }
      continue;
    }

    if (/^RUN\s+/i.test(instruction)) {
      const command = instruction.replace(/^RUN\s+/i, '');
      let currentCwd = currentStage.workdir;
      const segments = command.split(/(?:;|&&|\|\|)/);
      for (const segment of segments) {
        const trimmed = segment.trim();
        const cdMatch = /^cd\s+([^\s]+)/.exec(trimmed);
        if (cdMatch !== null) {
          const cdDir = cdMatch[1]!.replace(/^(?:"|')|(?:"|')$/g, '');
          currentCwd = cdDir.startsWith('/') ? posix.normalize(cdDir) : posix.normalize(posix.join(currentCwd, cdDir));
        }
        for (const match of trimmed.matchAll(
          /(?:^|\s)(?:[A-Za-z_][A-Za-z0-9_]*=\S+\s+)*go\s+build(?:\s+([^;&|]+))?(?=$|[;&|])/g
        )) {
          hasGoBuild = true;
          const rawArgs = match[1];
          const tokens = rawArgs?.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+/g) ?? [];
          let skipValue = false;
          let positionalTarget = false;
          const stageTargets: string[] = [];
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
            stageTargets.push(token);
          }
          if (!positionalTarget) stageTargets.push('.');

          const modCandidates = [...currentStage.containerFiles.entries()]
            .filter(
              ([containerPath, hostPath]) =>
                posix.basename(containerPath) === 'go.mod' && posix.basename(hostPath) === 'go.mod'
            )
            .map(([containerPath]) => posix.dirname(containerPath));
          const containerModDir =
            modCandidates.find((dir) => currentCwd === dir || currentCwd.startsWith(`${dir}/`)) ??
            modCandidates[0] ??
            (currentCwd === '/' ? '/' : currentStage.workdir);

          for (const target of stageTargets) {
            const withoutRecursiveSuffix = target.endsWith('/...') ? target.slice(0, -4) || '.' : target;
            const targetContainer = withoutRecursiveSuffix.startsWith('/')
              ? posix.normalize(withoutRecursiveSuffix)
              : posix.normalize(posix.join(currentCwd, withoutRecursiveSuffix));
            let rel = posix.relative(containerModDir, targetContainer);
            if (rel.endsWith('.go')) rel = posix.dirname(rel);
            if (rel === '') rel = '.';
            if (rel !== '..' && !rel.startsWith('../') && !rel.includes('$')) {
              currentStage.goBuildTargets.push(rel);
              allTargets.add(rel);
            }
          }
        }
      }
    }
  }

  if (stages.length === 0) stages.push(currentStage);
  return { stages, hasGoBuild, allTargets: [...allTargets].toSorted() };
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
  const { stages, hasGoBuild } = parseDockerfileStages(raw, buildContextFiles);
  if (!hasGoBuild) return [];

  const allGoFiles = context.files.filter(
    (file) =>
      file.endsWith('.go') &&
      !file.endsWith('_test.go') &&
      (root === '.' || file.startsWith(`${root}/`)) &&
      !/(?:^|\/)(?:vendor|test|tests|fixtures)(?:\/|$)/i.test(file)
  );
  const sourceByRelativePath = new Map<string, string>();
  for (const file of allGoFiles.slice(0, 750)) {
    const relativeFile = root === '.' ? file : file.slice(root.length + 1);
    // oxlint-disable-next-line no-await-in-loop -- bounded source reads are needed to prove Dockerfile completeness.
    const source = await readText(context, file, { fullFile: true });
    if (source !== undefined && goFileMatchesBuildTarget(relativeFile, source))
      sourceByRelativePath.set(relativeFile, source);
  }

  const missing = new Set<string>();

  for (const stage of stages) {
    if (stage.goBuildTargets.length === 0) continue;
    const stageCopiedFiles = new Set(stage.containerFiles.values());

    for (const target of stage.goBuildTargets) {
      const repositoryHasTarget = [...sourceByRelativePath.keys()].some((file) =>
        goBuildTargetContains(target, posix.dirname(file))
      );
      const copiedTarget = [...stageCopiedFiles].some(
        (file) => file.endsWith('.go') && goBuildTargetContains(target, posix.dirname(file))
      );
      if (repositoryHasTarget && !copiedTarget) missing.add(target);
    }

    const pending = [...stageCopiedFiles].filter((file) =>
      stage.goBuildTargets.some((target) => goBuildTargetContains(target, posix.dirname(file)))
    );
    const visited = new Set<string>();
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
          (candidate) => posix.dirname(candidate) === directory && stageCopiedFiles.has(candidate)
        );
        if (included.length === 0) {
          missing.add(directory);
          continue;
        }
        for (const candidate of included) if (!visited.has(candidate)) pending.push(candidate);
      }
    }
  }

  return [...missing].toSorted();
};

const dockerBuildContextFiles = async (root: string, context: ProbeContext, dockerfile?: string): Promise<string[]> => {
  let dockerignorePath: string | undefined;
  if (dockerfile !== undefined) {
    const specific = `${dockerfile}.dockerignore`;
    if (context.files.includes(specific)) dockerignorePath = specific;
  }
  if (dockerignorePath === undefined) {
    const defaultPath = root === '.' ? '.dockerignore' : `${root}/.dockerignore`;
    if (context.files.includes(defaultPath)) dockerignorePath = defaultPath;
  }
  const dockerignore =
    dockerignorePath !== undefined ? await readText(context, dockerignorePath, { fullFile: true }) : undefined;
  return context.files
    .filter((file) => root === '.' || file.startsWith(`${root}/`))
    .map((file) => (root === '.' ? file : file.slice(root.length + 1)))
    .filter((file) => !isDockerIgnored(file, dockerignore));
};

export const dockerfileGoBuildSelection = (raw: string): { found: boolean; targets: string[] } => {
  const { hasGoBuild, allTargets } = parseDockerfileStages(raw, []);
  return { found: hasGoBuild, targets: allTargets };
};

export const dockerfileGoBuildDirectories = (raw: string): string[] =>
  dockerfileGoBuildSelection(raw).targets.filter((target) => target !== '.');

export const dockerfileCanBuildContext = async ({
  raw,
  root,
  context,
  dockerfile
}: {
  raw: string;
  root: string;
  context: ProbeContext;
  dockerfile?: string;
}): Promise<boolean> => {
  const buildContextFiles = await dockerBuildContextFiles(root, context, dockerfile);
  return (
    missingDockerfileCopySources({ raw, root: '.', files: buildContextFiles }).length === 0 &&
    (await missingDockerfileGoPackages({ raw, root, context, buildContextFiles })).length === 0
  );
};

export const declaredDockerfileVolumes = (path: string, raw: string): { paths: string[]; citation?: Citation } => {
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
    const activeDirectories = await activeWorkspaceDirectories(context);
    const candidates = context.files
      .filter(
        (path) =>
          /^Dockerfile(?:[.-][^/]+)?$/i.test(posix.basename(path)) &&
          !DEVELOPMENT_ONLY_DOCKERFILE.test(posix.basename(path)) &&
          !DEVELOPMENT_ONLY_DIRECTORY.test(path) &&
          !isNonProductionFixturePath(path) &&
          !isIncidentalPath(path, activeDirectories)
      )
      .toSorted((left, right) => {
        const leftExact = posix.basename(left).toLowerCase() === 'dockerfile';
        const rightExact = posix.basename(right).toLowerCase() === 'dockerfile';
        return leftExact === rightExact ? left.localeCompare(right) : leftExact ? -1 : 1;
      });
    const services = new Map<string, ServiceFactInput>();

    for (const path of candidates) {
      const root = serviceRootFor(path, context.files);
      if (root !== '.' && isIncidentalPath(root, activeDirectories)) continue;
      if (services.has(root)) continue;
      // A checked-out symbolic link can be materialized as a one-line target path on platforms
      // where Git symlinks are disabled. Follow only an exact repository-local Dockerfile pointer.
      // oxlint-disable-next-line no-await-in-loop -- at most one bounded pointer target per candidate.
      const definition = await readDockerfileDefinition(context, path);
      if (definition === undefined || !/^\s*FROM\s+\S+/im.test(definition.raw)) continue;
      const { path: dockerfile, raw } = definition;
      // Some release-image Dockerfiles expect `make`/GoReleaser to place a binary in the checkout
      // before Docker runs. Init packages a clean checkout, so selecting such a file guarantees a
      // COPY failure. Another source probe can still keep the application using a native buildpack.
      // oxlint-disable-next-line no-await-in-loop -- one candidate per service root survives this check.
      if (!(await dockerfileCanBuildContext({ raw, root, context, dockerfile }))) continue;
      const { port, citation: portCitation } = exposedPort(dockerfile, raw);
      const { paths: volumePaths, citation: volumeCitation } = declaredDockerfileVolumes(dockerfile, raw);
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
