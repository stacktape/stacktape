import { dirname, isAbsolute, join, parse, relative, resolve } from 'node:path';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

/**
 * Finds the nearest language project boundary for an entrypoint.
 *
 * Buildpacks previously used the entry file's directory as their Docker context. That drops project manifests and
 * runtime assets for conventional layouts such as `cmd/api/main.go` or `public/index.php`. The closest ancestor with
 * a language marker is the least surprising boundary, while `cwd` prevents an unrelated parent project from winning.
 */
export const findNearestProjectRoot = ({
  cwd,
  entryfilePath,
  markerFiles,
  markerFileExtensions = []
}: {
  cwd: string;
  entryfilePath: string;
  markerFiles: string[];
  markerFileExtensions?: string[] | undefined;
}): string => {
  const absoluteCwd = resolve(cwd);
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? resolve(entryfilePath) : resolve(cwd, entryfilePath);
  let candidate = dirname(absoluteEntryfilePath);
  const filesystemRoot = parse(candidate).root;

  while (true) {
    const hasMarker =
      markerFiles.some((marker) => existsSync(join(candidate, marker))) ||
      (markerFileExtensions.length > 0 &&
        existsSync(candidate) &&
        readdirSync(candidate, { withFileTypes: true }).some(
          (entry) => entry.isFile() && markerFileExtensions.some((extension) => entry.name.endsWith(extension))
        ));
    if (hasMarker) {
      return candidate;
    }
    if (candidate === absoluteCwd || candidate === filesystemRoot) {
      return dirname(absoluteEntryfilePath);
    }
    const parent = dirname(candidate);
    if (!isWithinDirectory(parent, absoluteCwd)) {
      return dirname(absoluteEntryfilePath);
    }
    candidate = parent;
  }
};

export const resolveExplicitProjectRoot = ({ cwd, projectFile }: { cwd: string; projectFile: string }): string =>
  dirname(isAbsolute(projectFile) ? resolve(projectFile) : resolve(cwd, projectFile));

const getGoWorkUsePaths = (goWorkPath: string): string[] => {
  const contents = readFileSync(goWorkPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const values: string[] = [];
  const addValue = (line: string) => {
    const value = line
      .replace(/\/\/.*$/, '')
      .trim()
      .match(/^(?:"([^"]+)"|`([^`]+)`|(\S+))/)
      ?.slice(1)
      .find(Boolean);
    if (value) values.push(value);
  };
  for (const match of contents.matchAll(/^\s*use\s+([^\r\n(][^\r\n]*)/gm)) addValue(match[1] ?? '');
  for (const match of contents.matchAll(/^\s*use\s*\(([\s\S]*?)^\s*\)/gm)) {
    for (const line of (match[1] ?? '').split(/\r?\n/)) addValue(line);
  }
  return values;
};

/** Selects an applicable go.work context while retaining the selected module as the runtime-asset boundary. */
export const findGoProjectRoots = ({
  cwd,
  entryfilePath
}: {
  cwd: string;
  entryfilePath: string;
}): { buildRoot: string; moduleRoot: string } => {
  const moduleRoot = findNearestProjectRoot({ cwd, entryfilePath, markerFiles: ['go.mod'] });
  const absoluteCwd = resolve(cwd);
  let candidate = moduleRoot;
  while (isWithinDirectory(candidate, absoluteCwd)) {
    const goWorkPath = join(candidate, 'go.work');
    if (
      existsSync(goWorkPath) &&
      getGoWorkUsePaths(goWorkPath).some((usePath) => resolve(candidate, usePath) === resolve(moduleRoot))
    ) {
      return { buildRoot: candidate, moduleRoot };
    }
    if (candidate === absoluteCwd) break;
    const parent = dirname(candidate);
    if (parent === candidate || !isWithinDirectory(parent, absoluteCwd)) break;
    candidate = parent;
  }
  return { buildRoot: moduleRoot, moduleRoot };
};

const getCommonDirectory = (paths: string[]): string => {
  let common = resolve(paths[0]!);
  for (const path of paths.slice(1)) {
    while (!isWithinDirectory(path, common)) {
      const parent = dirname(common);
      if (parent === common) return common;
      common = parent;
    }
  }
  return common;
};

/** Finds the smallest Docker context containing a .NET project and its recursive ProjectReference graph. */
export const findDotnetBuildRoot = ({ cwd, projectFile }: { cwd: string; projectFile: string }): string => {
  const absoluteCwd = resolve(cwd);
  const pending = [resolve(projectFile)];
  const projectFiles = new Set<string>();
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (projectFiles.has(current) || !existsSync(current)) continue;
    projectFiles.add(current);
    const contents = readFileSync(current, 'utf8');
    for (const match of contents.matchAll(/<ProjectReference\b[^>]*\bInclude\s*=\s*["']([^"']+)["'][^>]*\/?\s*>/gi)) {
      const referencedProject = resolve(dirname(current), (match[1] ?? '').replaceAll('\\', '/'));
      if (isWithinDirectory(referencedProject, absoluteCwd)) pending.push(referencedProject);
    }
  }
  const requiredPaths = Array.from(projectFiles, dirname);
  const ancestorBuildFiles = new Set([
    'directory.build.props',
    'directory.build.targets',
    'directory.build.rsp',
    'directory.packages.props',
    'directory.packages.targets',
    'nuget.config',
    'global.json'
  ]);
  for (const projectPath of projectFiles) {
    let candidate = dirname(projectPath);
    while (isWithinDirectory(candidate, absoluteCwd)) {
      if (
        existsSync(candidate) &&
        readdirSync(candidate, { withFileTypes: true }).some(
          (entry) => entry.isFile() && ancestorBuildFiles.has(entry.name.toLowerCase())
        )
      ) {
        requiredPaths.push(candidate);
      }
      if (candidate === absoluteCwd) break;
      const parent = dirname(candidate);
      if (parent === candidate || !isWithinDirectory(parent, absoluteCwd)) break;
      candidate = parent;
    }
  }
  return getCommonDirectory(requiredPaths);
};

const pomIncludesModule = ({ pomPath, moduleRoot }: { pomPath: string; moduleRoot: string }) => {
  const contents = readFileSync(pomPath, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  return [...contents.matchAll(/<module>\s*([^<]+?)\s*<\/module>/gi)].some(
    (match) => resolve(dirname(pomPath), match[1]!.trim().replaceAll('\\', '/')) === resolve(moduleRoot)
  );
};

/** Selects a Java reactor/settings root while keeping the entrypoint's module as the artifact target. */
export const findJavaProjectRoots = ({
  cwd,
  entryfilePath,
  useMaven,
  explicitProjectFile
}: {
  cwd: string;
  entryfilePath: string;
  useMaven: boolean;
  explicitProjectFile?: string | undefined;
}): { buildRoot: string; moduleRoot: string } => {
  const moduleRoot = findNearestProjectRoot({
    cwd,
    entryfilePath,
    markerFiles: useMaven ? ['pom.xml'] : ['build.gradle', 'build.gradle.kts']
  });
  if (explicitProjectFile) {
    return { buildRoot: resolveExplicitProjectRoot({ cwd, projectFile: explicitProjectFile }), moduleRoot };
  }

  const absoluteCwd = resolve(cwd);
  let buildRoot = moduleRoot;
  let candidate = dirname(moduleRoot);
  while (isWithinDirectory(candidate, absoluteCwd)) {
    if (useMaven) {
      const pomPath = join(candidate, 'pom.xml');
      if (existsSync(pomPath) && pomIncludesModule({ pomPath, moduleRoot: buildRoot })) buildRoot = candidate;
    } else if (existsSync(join(candidate, 'settings.gradle')) || existsSync(join(candidate, 'settings.gradle.kts'))) {
      buildRoot = candidate;
    }
    if (candidate === absoluteCwd) break;
    const parent = dirname(candidate);
    if (parent === candidate || !isWithinDirectory(parent, absoluteCwd)) break;
    candidate = parent;
  }
  return { buildRoot, moduleRoot };
};

const isWithinDirectory = (candidate: string, directory: string): boolean => {
  const relativePath = relative(resolve(directory), resolve(candidate));
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
};
