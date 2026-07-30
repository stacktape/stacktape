import { realpathSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { readFile, readJSON } from 'fs-extra';
import json5 from 'json5';
import type { ResolvedPackageDependency } from '../runtime-contracts';
import { DEPENDENCIES_WITH_BINARIES } from './config';

export type PackageJsonDepsInfo = {
  version: string;
  hasBinary: boolean;
  name: string;
  path: string;
  dependencyType: ResolvedPackageDependency['dependencyType'];
  parentModulePath?: string | undefined;
  parentModule: string | null;
  dependencies: PackageJsonDepsInfo[];
  peerDependencies: PackageJsonDepsInfo[];
  optionalPeerDependencies: PackageJsonDepsInfo[];
  note?: string | undefined;
};

type PackageJson = {
  name: string;
  version: string;
  gypfile?: boolean | undefined;
  binary?: { module_path?: string } | undefined;
  dependencies?: Record<string, string> | undefined;
  devDependencies?: Record<string, string> | undefined;
  peerDependencies?: Record<string, string> | undefined;
  peerDependenciesMeta?: Record<string, unknown> | undefined;
};

const packageInfoCache = new Map<string, PackageJsonDepsInfo | null>();

const isDirectory = (path: string): boolean => {
  try {
    // Follow pnpm's junctions/symlinks: the logical node_modules entry is a package directory to callers.
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

export const getTsconfigAliases = async (tsconfigPath: string): Promise<Record<string, string>> => {
  const tsconfig = json5.parse(await readFile(tsconfigPath, 'utf8')) as {
    compilerOptions?: { paths?: Record<string, string[]> } | undefined;
  };
  const aliases: Record<string, string> = {};
  for (const [alias, paths] of Object.entries(tsconfig.compilerOptions?.paths ?? {})) {
    const firstPath = paths[0];
    if (firstPath) {
      aliases[alias.replace('/*', '')] = resolve(process.cwd(), firstPath.replace('/*', '').replace('*', ''));
    }
  }
  return aliases;
};

export const filterDuplicates = <T>(item: T, index: number, items: T[]): boolean => items.indexOf(item) === index;

const hasBinary = (packageJson: PackageJson): boolean =>
  Boolean(
    packageJson.gypfile ||
    packageJson.binary?.module_path ||
    packageJson.dependencies?.['node-gyp'] ||
    packageJson.devDependencies?.['node-gyp'] ||
    packageJson.dependencies?.['node-pre-gyp'] ||
    packageJson.devDependencies?.['node-pre-gyp'] ||
    DEPENDENCIES_WITH_BINARIES.includes(packageJson.name)
  );

const present = <T>(value: T | null): value is T => value !== null;

export const getInfoFromPackageJson = async ({
  directoryPath,
  parentModule,
  dependencyType,
  parentModulePath,
  checkDeps = true
}: {
  directoryPath: string;
  parentModule: string | null;
  parentModulePath?: string | null | undefined;
  dependencyType: ResolvedPackageDependency['dependencyType'];
  checkDeps?: boolean | undefined;
}): Promise<PackageJsonDepsInfo | null> => {
  if (packageInfoCache.has(directoryPath)) {
    return packageInfoCache.get(directoryPath) ?? null;
  }

  // This package's dependency graph contains a cycle, but its source can be bundled statically.
  if (directoryPath.endsWith('es-abstract')) {
    return {
      dependencies: [],
      optionalPeerDependencies: [],
      name: 'es-abstract',
      version: '',
      path: directoryPath,
      parentModule,
      ...(parentModulePath ? { parentModulePath } : {}),
      dependencyType: 'standard',
      hasBinary: false,
      peerDependencies: []
    };
  }

  const packageJsonPath = resolve(directoryPath, 'package.json');
  try {
    const packageJson = (await readJSON(packageJsonPath)) as PackageJson;
    const readDependency = ({
      name,
      type,
      recurse = true
    }: {
      name: string;
      type: ResolvedPackageDependency['dependencyType'];
      recurse?: boolean | undefined;
    }) => {
      const path = join(resolve(directoryPath, '..'), name);
      return isDirectory(path)
        ? getInfoFromPackageJson({
            directoryPath: path,
            parentModule: packageJson.name,
            dependencyType: type,
            parentModulePath: directoryPath,
            checkDeps: recurse
          })
        : null;
    };

    const result: PackageJsonDepsInfo = {
      name: packageJson.name,
      version: packageJson.version,
      path: directoryPath,
      hasBinary: hasBinary(packageJson),
      dependencyType,
      parentModule,
      ...(parentModulePath ? { parentModulePath } : {}),
      dependencies: checkDeps
        ? (
            await Promise.all(
              Object.keys(packageJson.dependencies ?? {}).map((name) => readDependency({ name, type: 'standard' }))
            )
          ).filter(present)
        : [],
      peerDependencies: (
        await Promise.all(
          Object.keys(packageJson.peerDependencies ?? {}).map((name) =>
            readDependency({ name, type: 'peer', recurse: false })
          )
        )
      ).filter(present),
      optionalPeerDependencies: (
        await Promise.all(
          Object.keys(packageJson.peerDependenciesMeta ?? {}).map((name) =>
            readDependency({ name, type: 'optional-peer' })
          )
        )
      ).filter(present)
    };

    packageInfoCache.set(directoryPath, result);
    return result;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      packageInfoCache.set(directoryPath, null);
      return null;
    }
    throw error;
  }
};

export const determineIfAlias = ({
  moduleName,
  aliases
}: {
  moduleName: string;
  aliases: Record<string, string>;
}): boolean => Object.keys(aliases).some((aliasName) => moduleName.startsWith(aliasName));

export const createModuleResolver = ({ cwd, monorepoRoot }: { cwd: string; monorepoRoot: string | null }) => {
  const modulePathCache = new Map<string, string | null>();
  const projectModulePathCache = new Map<string, string | null>();
  const realPathCache = new Map<string, string>();
  const requireCache = new Map<string, ReturnType<typeof createRequire>>();

  const toRealPath = (path: string): string => {
    const cached = realPathCache.get(path);
    if (cached !== undefined) return cached;
    let realPath: string;
    try {
      realPath = realpathSync(path);
    } catch {
      realPath = path;
    }
    realPathCache.set(path, realPath);
    return realPath;
  };

  const requireFrom = (fromFile: string): ReturnType<typeof createRequire> => {
    let fromFileRequire = requireCache.get(fromFile);
    if (!fromFileRequire) {
      fromFileRequire = createRequire(fromFile);
      requireCache.set(fromFile, fromFileRequire);
    }
    return fromFileRequire;
  };

  const walkNodeModules = (moduleName: string, fromDir: string): string | null => {
    let currentDir = fromDir;
    while (true) {
      if (basename(currentDir) !== 'node_modules') {
        const candidate = join(currentDir, 'node_modules', moduleName);
        if (isDirectory(candidate)) return candidate;
      }
      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) return null;
      currentDir = parentDir;
    }
  };

  const findModulePathFromImporter = (moduleName: string, importer: string): string | null => {
    const realImporter = toRealPath(importer);
    try {
      const manifestPath = requireFrom(realImporter).resolve(`${moduleName}/package.json`);
      if (isAbsolute(manifestPath)) return dirname(manifestPath);
    } catch {
      // The package may hide package.json behind exports, or be unreachable from this importer.
    }
    return walkNodeModules(moduleName, dirname(realImporter));
  };

  const findModulePathFromProject = (moduleName: string): string | null => {
    if (projectModulePathCache.has(moduleName)) {
      return projectModulePathCache.get(moduleName) ?? null;
    }
    const candidates = [join(cwd, 'node_modules', moduleName)];
    if (monorepoRoot && monorepoRoot !== cwd) {
      candidates.push(join(monorepoRoot, 'node_modules', moduleName));
    }
    const found = candidates.find(isDirectory);
    const result = found ? toRealPath(found) : null;
    projectModulePathCache.set(moduleName, result);
    return result;
  };

  const findModulePath = (moduleName: string, importer?: string): string | null => {
    const usableImporter = importer && isAbsolute(importer) ? importer : null;
    const cacheKey = usableImporter ? `${moduleName}\0${usableImporter}` : moduleName;
    if (modulePathCache.has(cacheKey)) return modulePathCache.get(cacheKey) ?? null;
    const fromImporter = usableImporter ? findModulePathFromImporter(moduleName, usableImporter) : null;
    const result = (fromImporter && toRealPath(fromImporter)) || findModulePathFromProject(moduleName);
    modulePathCache.set(cacheKey, result);
    return result;
  };

  return {
    findModulePath,
    isNestedLocation: (modulePath: string, moduleName: string): boolean =>
      modulePath !== findModulePathFromProject(moduleName)
  };
};

export const ensureDefaultExport = (content: string): string => {
  if (/export\s*\{[^}]*\bas\s+default\b[^}]*\}/.test(content)) return content;
  const exportBlocks = content.match(/export\s*\{([^}]*)\}/g);
  if (!exportBlocks?.some((exportBlock) => /\bhandler\b/.test(exportBlock))) return content;

  const sourceMapMatch = content.match(/\/\/[#@]\s*sourceMappingURL=.*(?:\r?\n)?$/);
  if (!sourceMapMatch) return `${content}\nexport { handler as default };\n`;
  const sourceMapComment = sourceMapMatch[0];
  return `${content.slice(0, -sourceMapComment.length)}\nexport { handler as default };\n${sourceMapComment}`;
};

export const ESM_SOURCE_MAP_BANNER = `import { createRequire as __stp_createRequire } from "node:module";
import { fileURLToPath as __stp_fileURLToPath } from "node:url";
import { dirname as __stp_pathDirname } from "node:path";
const require = __stp_createRequire(import.meta.url);
const __stp_filename = __stp_fileURLToPath(import.meta.url);
const __stp_dirname = __stp_pathDirname(__stp_filename);`;
