import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, resolve } from 'node:path';

const OPENTUI_SOLID_IMPORT_SOURCE = '@opentui/solid';

const getExtendedTsConfigPath = ({
  tsConfigDir,
  rawTsConfig
}: {
  tsConfigDir: string;
  rawTsConfig: string;
}): string | null => {
  const extendsMatch = rawTsConfig.match(/"extends"\s*:\s*"([^"]+)"/);
  const extendedPath = extendsMatch?.[1];
  if (!extendedPath) {
    return null;
  }

  // TS also supports package-based extends (e.g. "@tsconfig/node18/tsconfig.json").
  // We only resolve filesystem paths here.
  if (!extendedPath.startsWith('.') && !isAbsolute(extendedPath)) {
    return null;
  }

  const resolvedPath = resolve(tsConfigDir, extendedPath);
  if (existsSync(resolvedPath)) {
    return resolvedPath;
  }

  if (!extname(resolvedPath)) {
    const withJsonExtension = `${resolvedPath}.json`;
    if (existsSync(withJsonExtension)) {
      return withJsonExtension;
    }

    const nestedTsConfigPath = join(resolvedPath, 'tsconfig.json');
    if (existsSync(nestedTsConfigPath)) {
      return nestedTsConfigPath;
    }
  }

  // Fall back to the resolved path so recursion can fail gracefully.
  return resolvedPath;
};

const includesOpenTuiSolidInTsConfigChain = ({
  tsConfigPath,
  visitedPaths
}: {
  tsConfigPath: string;
  visitedPaths: Set<string>;
}): boolean => {
  const absoluteTsConfigPath = resolve(tsConfigPath);
  if (visitedPaths.has(absoluteTsConfigPath) || !existsSync(absoluteTsConfigPath)) {
    return false;
  }
  visitedPaths.add(absoluteTsConfigPath);

  let rawTsConfig = '';
  try {
    rawTsConfig = readFileSync(absoluteTsConfigPath, 'utf-8');
  } catch {
    return false;
  }

  if (rawTsConfig.includes(OPENTUI_SOLID_IMPORT_SOURCE)) {
    return true;
  }

  const extendedTsConfigPath = getExtendedTsConfigPath({
    tsConfigDir: dirname(absoluteTsConfigPath),
    rawTsConfig
  });
  if (!extendedTsConfigPath) {
    return false;
  }

  return includesOpenTuiSolidInTsConfigChain({ tsConfigPath: extendedTsConfigPath, visitedPaths });
};

export const getBunBuildTsConfigPath = ({
  tsConfigPath,
  outDir
}: {
  tsConfigPath?: string;
  outDir: string;
}): string | undefined => {
  if (!tsConfigPath) {
    return undefined;
  }

  const shouldSanitize = includesOpenTuiSolidInTsConfigChain({
    tsConfigPath,
    visitedPaths: new Set<string>()
  });

  if (!shouldSanitize) {
    return tsConfigPath;
  }

  mkdirSync(outDir, { recursive: true });

  const wrapperPath = join(outDir, '.tsconfig.bun-build.json');
  writeFileSync(
    wrapperPath,
    JSON.stringify({
      extends: resolve(tsConfigPath),
      compilerOptions: {
        jsx: 'preserve',
        jsxImportSource: 'react',
        customConditions: []
      }
    })
  );

  return wrapperPath;
};
