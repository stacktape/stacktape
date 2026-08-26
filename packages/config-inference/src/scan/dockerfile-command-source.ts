import { posix } from 'node:path';

type Stage = {
  files: Map<string, string>;
  directories: Set<string>;
  workdir: string | undefined;
  valid: boolean;
};

const literalPath = (value: string): boolean => /^[A-Za-z0-9_./-]+$/.test(value) && !value.split('/').includes('..');
const inside = (path: string, directory: string): boolean =>
  path === directory || path.startsWith(directory === '/' ? '/' : `${directory}/`);
const addDirectory = (stage: Stage, directory: string): void => {
  for (let current = directory; ; current = posix.dirname(current)) {
    stage.directories.add(current);
    if (current === '/') break;
  }
};

// Over-match ignore rules rather than claiming an ignored source was copied. Negated rules do not
// restore proof; unsupported pattern syntax stops this bounded analysis. No repository code runs.
const ignoredBy = (contents: string): ((path: string) => boolean | undefined) | undefined => {
  const patterns: string[][] = [];
  for (const raw of contents.split(/\r?\n/)) {
    const pattern = posix.normalize(raw.trim().replace(/^\/+|\/+$/g, ''));
    if (pattern === '.' || pattern.startsWith('#') || pattern.startsWith('!')) continue;
    if (pattern.includes('[') || pattern.includes(']') || pattern.includes('\\') || pattern.split('/').includes('..'))
      return undefined;
    if (pattern.length > 1024 || patterns.length >= 256) return undefined;
    const tokens: string[] = [];
    for (let index = 0; index < pattern.length; index += 1) {
      const character = pattern[index]!;
      if (character === '*' && pattern[index + 1] === '*') {
        while (pattern[index + 1] === '*') index += 1;
        // Over-match **/ as **: excluding extra source paths loses proof, never fabricates it.
        if (pattern[index + 1] === '/') index += 1;
        tokens.push('**');
      } else tokens.push(character);
    }
    patterns.push(tokens);
  }
  let remainingSteps = 2_000_000;
  return (path) => {
    if (path.length > 4096) return undefined;
    for (const tokens of patterns) {
      remainingSteps -= tokens.length * (path.length + 1);
      if (remainingSteps < 0) return undefined;
      // Iterative dynamic programming bounds repeated wildcards without regex backtracking or
      // recursion. The budget covers all ignore patterns and context files in this mapping call.
      let next = Array.from({ length: path.length + 1 }, (_, index) => index === path.length || path[index] === '/');
      for (let index = tokens.length - 1; index >= 0; index -= 1) {
        const token = tokens[index]!;
        const current: boolean[] = [];
        for (let position = path.length; position >= 0; position -= 1) {
          current[position] =
            token === '*' || token === '**'
              ? next[position]! ||
                (position < path.length && (token === '**' || path[position] !== '/') && current[position + 1]!)
              : position < path.length &&
                (token === '?' ? path[position] !== '/' : token === path[position]) &&
                next[position + 1]!;
        }
        next = current;
      }
      if (next[0] || [...path].some((character, index) => character === '/' && next[index + 1])) return true;
    }
    return false;
  };
};

/**
 * Prove which repository file occupies one literal path in a selected Docker stage. This is a
 * bounded COPY/WORKDIR interpreter, not a Docker build: unknown copies, path substitutions, globs,
 * arbitrary RUN mutations and custom entrypoints invalidate the stage instead of guessing.
 */
export const sourceFileForDockerPath = ({
  raw,
  containerPath,
  files,
  buildRoot = '.',
  target,
  workingDirectory,
  dockerignore = '',
  installScriptsAbsent = false
}: {
  raw: string;
  containerPath: string;
  files: readonly string[];
  buildRoot?: string;
  target?: string | undefined;
  workingDirectory?: string | undefined;
  dockerignore?: string;
  /** Probe-confirmed absence of repository-defined install lifecycle hooks. Not an agent claim. */
  installScriptsAbsent?: boolean;
}): string | undefined => {
  if (!literalPath(containerPath) || !literalPath(buildRoot) || raw.includes('<<')) return undefined;
  if (/^\s*#\s*escape\s*=\s*`/im.test(raw)) return undefined;
  const ignored = ignoredBy(dockerignore);
  if (ignored === undefined) return undefined;
  const context = new Map<string, string>();
  for (const file of files) {
    const relative =
      buildRoot === '.' ? file : file.startsWith(`${buildRoot}/`) ? file.slice(buildRoot.length + 1) : undefined;
    if (relative === undefined) continue;
    const excluded = ignored(relative);
    if (excluded === undefined) return undefined;
    if (!excluded) context.set(relative, file);
  }
  const stages: Stage[] = [];
  const namedStages = new Map<string, Stage>();
  let stage: Stage | undefined;
  for (const line of raw
    .replace(/\\\r?\n/g, ' ')
    .split(/\r?\n/)
    .map((entry) => entry.trim())) {
    if (line === '' || line.startsWith('#')) continue;
    const instruction = /^(\w+)\s+(.*)$/.exec(line);
    if (instruction === null) {
      if (stage === undefined) return undefined;
      stage.valid = false;
      continue;
    }
    const operation = instruction[1]!.toUpperCase();
    const value = instruction[2]!;
    if (operation === 'FROM') {
      const from = /^(?:--platform=[A-Za-z0-9_./-]+\s+)?([^\s$]+)(?:\s+AS\s+([A-Za-z0-9_.-]+))?$/i.exec(value);
      const parent = from === null ? undefined : namedStages.get(from[1]!.toLowerCase());
      stage = {
        files: new Map(parent?.files),
        directories: new Set(parent?.directories ?? ['/']),
        workdir: parent?.workdir,
        valid: from !== null && parent?.valid !== false
      };
      if (from?.[1] === 'scratch') stage.workdir = '/';
      stages.push(stage);
      if (from?.[2] !== undefined) {
        const name = from[2].toLowerCase();
        if (namedStages.has(name)) stage.valid = false;
        namedStages.set(name, stage);
      }
      continue;
    }
    if (stage === undefined) {
      if (operation !== 'ARG') return undefined;
      continue;
    }
    if (!stage.valid) continue;
    if (operation === 'WORKDIR') {
      if (!literalPath(value) || (!posix.isAbsolute(value) && stage.workdir === undefined)) stage.valid = false;
      else {
        stage.workdir = posix.resolve(stage.workdir ?? '/', value);
        addDirectory(stage, stage.workdir);
      }
      continue;
    }
    if (operation === 'COPY') {
      let body = value;
      let fromStage: Stage | undefined;
      let hasFrom = false;
      while (body.startsWith('--')) {
        const flag = /^--(from|chown|chmod)=([A-Za-z0-9_.:/-]+)\s+/.exec(body);
        if (flag === null) break;
        if (flag[1] === 'from') {
          hasFrom = true;
          fromStage = /^\d+$/.test(flag[2]!) ? stages[Number(flag[2])] : namedStages.get(flag[2]!.toLowerCase());
        }
        body = body.slice(flag[0].length);
      }
      let operands: unknown;
      try {
        operands = body.startsWith('[') ? JSON.parse(body) : body.split(/\s+/);
      } catch {
        operands = undefined;
      }
      if (
        !Array.isArray(operands) ||
        operands.length < 2 ||
        !operands.every((part): part is string => typeof part === 'string' && literalPath(part)) ||
        (hasFrom && (fromStage === undefined || fromStage === stage || !fromStage.valid))
      ) {
        stage.valid = false;
        continue;
      }
      const destination = operands.at(-1)!;
      if (!posix.isAbsolute(destination) && stage.workdir === undefined) {
        stage.valid = false;
        continue;
      }
      const destinationPath = posix.resolve(stage.workdir ?? '/', destination);
      const sourceFiles = fromStage?.files ?? context;
      for (const operand of operands.slice(0, -1)) {
        const sourcePath =
          fromStage === undefined ? posix.normalize(operand.replace(/^\/+/, '')) : posix.resolve('/', operand);
        const sourceFile = sourceFiles.get(sourcePath);
        const directoryFiles = [...sourceFiles].filter(([path]) => sourcePath === '.' || inside(path, sourcePath));
        if (sourceFile !== undefined) {
          const directoryDestination = destination.endsWith('/') || stage.directories.has(destinationPath);
          if (operands.length > 2 && !directoryDestination) {
            stage.valid = false;
            break;
          }
          const mappedPath = directoryDestination
            ? posix.join(destinationPath, posix.basename(sourcePath))
            : destinationPath;
          stage.files.set(mappedPath, sourceFile);
          addDirectory(stage, posix.dirname(mappedPath));
        } else if (directoryFiles.length > 0 && !stage.files.has(destinationPath)) {
          // A directory copy merges content. Forget old destination claims absent from this source:
          // they might be overwritten by image files or ignored/unknown source entries we cannot see.
          for (const path of stage.files.keys()) if (inside(path, destinationPath)) stage.files.delete(path);
          for (const [path, source] of directoryFiles) {
            const relative = sourcePath === '.' ? path : posix.relative(sourcePath, path);
            const mappedPath = posix.join(destinationPath, relative);
            stage.files.set(mappedPath, source);
            addDirectory(stage, posix.dirname(mappedPath));
          }
          addDirectory(stage, destinationPath);
        } else {
          stage.valid = false;
          break;
        }
      }
      continue;
    }
    // A known installer may execute repository hooks that replace source files. Preserve the
    // mapping only when scripts are disabled or the probe checked every context package manifest.
    if (
      operation === 'RUN' &&
      (installScriptsAbsent || /(?:^| )--ignore-scripts(?: |$)/.test(value)) &&
      /^(?:bun install|npm (?:ci|install)|pnpm install|yarn(?: install)?)(?: --(?:frozen-lockfile|immutable|production|ignore-scripts|omit=dev))*$/.test(
        value
      )
    )
      continue;
    if (/^(?:ARG|ENV|USER|EXPOSE|CMD|LABEL|HEALTHCHECK|STOPSIGNAL|MAINTAINER)$/.test(operation)) continue;
    stage.valid = false;
  }
  const selected = target === undefined ? stages.at(-1) : namedStages.get(target.toLowerCase());
  if (selected === undefined || !selected.valid) return undefined;
  const workdir = workingDirectory ?? selected.workdir;
  if (workingDirectory !== undefined && (!literalPath(workingDirectory) || !posix.isAbsolute(workingDirectory)))
    return undefined;
  if (!posix.isAbsolute(containerPath) && workdir === undefined) return undefined;
  return selected.files.get(posix.resolve(workdir ?? '/', containerPath));
};
