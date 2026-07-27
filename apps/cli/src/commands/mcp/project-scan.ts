import { basename, dirname, relative, resolve } from 'node:path';
import fg from 'fast-glob';
import { pathExists, readFile } from 'fs-extra';

type PackageJsonSummary = {
  path: string;
  name?: string;
  packageManager?: string;
  stacktapeDependency?: string;
  relevantScripts: Record<string, string>;
};

type ConfigCandidate = {
  path: string;
  format: 'typescript' | 'javascript' | 'yaml' | 'json' | 'unknown';
  directory: string;
  importsStacktape: boolean;
  usesDefineConfig: boolean;
  resourceConstructors: string[];
  likelyResourceKeys: string[];
};

type ProjectScanResult = {
  cwd: string;
  totalConfigCandidates: number;
  omittedConfigCandidates: number;
  primaryConfigCandidates: ConfigCandidate[];
  configCandidates: ConfigCandidate[];
  packageJsonFiles: PackageJsonSummary[];
  lockfiles: string[];
  suggestedDefaults: {
    configPath?: string;
    currentWorkingDirectory: string;
  };
};

type ProjectScanCacheEntry = {
  cwd: string;
  configCandidates: ConfigCandidate[];
  packageJsonFiles: PackageJsonSummary[];
  lockfiles: string[];
};

const CONFIG_PATTERNS = ['**/stacktape.{ts,js,mjs,cjs,yml,yaml,json}'];
const PACKAGE_PATTERNS = ['**/package.json'];
const LOCKFILE_PATTERNS = ['**/bun.lockb', '**/bun.lock', '**/package-lock.json', '**/pnpm-lock.yaml', '**/yarn.lock'];
const IGNORE_PATTERNS = [
  '**/.git/**',
  '**/.claude/**',
  '**/.next/**',
  '**/.stacktape/**',
  '**/@generated/**',
  '**/_test-stacks/**',
  '**/__binary-dist/**',
  '**/__dist-mcp-test/**',
  '**/__mcp-smoke-test/**',
  '**/__release/**',
  '**/__release-npm/**',
  '**/__stacktape-dist/**',
  '**/__starter-projects/**',
  '**/dist/**',
  '**/node_modules/**'
];

const scanCache = new Map<string, ProjectScanCacheEntry>();

const normalizeMaxFiles = (maxFiles: number | undefined): number => {
  if (typeof maxFiles !== 'number' || !Number.isFinite(maxFiles)) return 20;
  return Math.max(1, Math.min(Math.trunc(maxFiles), 50));
};

const toRelativePath = (cwd: string, filePath: string): string => {
  const relativePath = relative(cwd, filePath);
  return (relativePath || '.').replace(/\\/g, '/');
};

const toCliConfigPath = (candidate: ConfigCandidate): string => {
  const fileName = basename(candidate.path);
  return candidate.directory === '.' ? fileName : fileName;
};

const detectFormat = (filePath: string): ConfigCandidate['format'] => {
  if (/\.(ts)$/.test(filePath)) return 'typescript';
  if (/\.(js|mjs|cjs)$/.test(filePath)) return 'javascript';
  if (/\.(yml|yaml)$/.test(filePath)) return 'yaml';
  if (/\.json$/.test(filePath)) return 'json';
  return 'unknown';
};

const unique = <T>(items: T[]): T[] => [...new Set(items)];

const extractResourceConstructors = (content: string): string[] =>
  unique([...content.matchAll(/\bnew\s+([A-Z][A-Za-z0-9]+)\s*\(/g)].map((match) => match[1]).filter(Boolean)).slice(
    0,
    30
  );

const extractLikelyResourceKeys = (content: string): string[] => {
  const resourcesBlock = content.match(/\bresources\s*:\s*\{([\s\S]{0,3000}?)\n\s*\}/);
  if (!resourcesBlock?.[1]) return [];
  return unique(
    [...resourcesBlock[1].matchAll(/\b([A-Za-z_][A-Za-z0-9_-]*)\s*[:,]/g)].map((match) => match[1]).filter(Boolean)
  )
    .filter((key) => !['type', 'properties'].includes(key))
    .slice(0, 50);
};

const scoreConfigCandidate = (candidate: ConfigCandidate): number => {
  const depth = candidate.path.split('/').length - 1;
  let score = 0;

  if (basename(candidate.path) === 'stacktape.ts') score += 60;
  if (candidate.format === 'typescript') score += 30;
  if (candidate.usesDefineConfig) score += 30;
  if (candidate.importsStacktape) score += 20;
  score += Math.min(candidate.resourceConstructors.length, 10) * 3;
  score += Math.min(candidate.likelyResourceKeys.length, 10) * 2;
  score -= depth * 4;

  if (/^(_test-stacks|starter-projects|examples|templates|test|tests|__tests__)\//.test(candidate.path)) score -= 80;
  if (candidate.path.startsWith('docs/')) score += 10;
  if (candidate.path.startsWith('scripts/')) score -= 20;
  if (candidate.format === 'yaml' && candidate.resourceConstructors.length === 0) score -= 15;

  return score;
};

const sortConfigCandidates = (candidates: ConfigCandidate[]): ConfigCandidate[] =>
  [...candidates].sort((left, right) => {
    const scoreDifference = scoreConfigCandidate(right) - scoreConfigCandidate(left);
    if (scoreDifference !== 0) return scoreDifference;
    return left.path.localeCompare(right.path);
  });

const summarizePackageJson = async (cwd: string, packageJsonPath: string): Promise<PackageJsonSummary | undefined> => {
  try {
    const content = await readFile(packageJsonPath, 'utf-8');
    const parsed = JSON.parse(content) as {
      name?: string;
      packageManager?: string;
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const scripts = parsed.scripts || {};
    const relevantScripts = Object.fromEntries(
      Object.entries(scripts).filter(
        ([name, command]) => /stacktape|sst|deploy|dev|build|start|preview/i.test(name) || /stacktape/i.test(command)
      )
    );

    return {
      path: toRelativePath(cwd, packageJsonPath),
      name: parsed.name,
      packageManager: parsed.packageManager,
      stacktapeDependency: parsed.dependencies?.stacktape || parsed.devDependencies?.stacktape,
      relevantScripts
    };
  } catch {
    return undefined;
  }
};

export const scanStacktapeProject = async ({
  cwd = process.cwd(),
  maxFiles = 20
}: {
  cwd?: string;
  maxFiles?: number;
} = {}): Promise<ProjectScanResult> => {
  const resolvedCwd = resolve(cwd);
  if (!(await pathExists(resolvedCwd))) {
    throw new Error(`Scan directory does not exist: ${resolvedCwd}`);
  }
  const normalizedMaxFiles = normalizeMaxFiles(maxFiles);

  const cached = scanCache.get(resolvedCwd);
  if (cached) {
    return buildProjectScanResult(cached, normalizedMaxFiles);
  }

  const [configPaths, packageJsonPaths, lockfilePaths] = await Promise.all([
    fg(CONFIG_PATTERNS, { cwd: resolvedCwd, absolute: true, onlyFiles: true, ignore: IGNORE_PATTERNS, dot: true }),
    fg(PACKAGE_PATTERNS, { cwd: resolvedCwd, absolute: true, onlyFiles: true, ignore: IGNORE_PATTERNS, dot: true }),
    fg(LOCKFILE_PATTERNS, { cwd: resolvedCwd, absolute: true, onlyFiles: true, ignore: IGNORE_PATTERNS, dot: true })
  ]);

  const allConfigCandidates: ConfigCandidate[] = [];
  for (const configPath of configPaths) {
    const content = await readFile(configPath, 'utf-8').catch(() => '');
    allConfigCandidates.push({
      path: toRelativePath(resolvedCwd, configPath),
      format: detectFormat(configPath),
      directory: toRelativePath(resolvedCwd, dirname(configPath)) || '.',
      importsStacktape: /from\s+['"]stacktape['"]|require\(['"]stacktape['"]\)/.test(content),
      usesDefineConfig: /\bdefineConfig\s*\(/.test(content),
      resourceConstructors: extractResourceConstructors(content),
      likelyResourceKeys: extractLikelyResourceKeys(content)
    });
  }
  const sortedConfigCandidates = sortConfigCandidates(allConfigCandidates);

  const packageJsonFiles = (
    await Promise.all(
      packageJsonPaths
        .slice(0, normalizedMaxFiles)
        .map((packageJsonPath) => summarizePackageJson(resolvedCwd, packageJsonPath))
    )
  ).filter((summary): summary is PackageJsonSummary => Boolean(summary));

  const cacheEntry = {
    cwd: resolvedCwd,
    configCandidates: sortedConfigCandidates,
    packageJsonFiles,
    lockfiles: lockfilePaths.map((filePath) => toRelativePath(resolvedCwd, filePath))
  };
  scanCache.set(resolvedCwd, cacheEntry);

  return buildProjectScanResult(cacheEntry, normalizedMaxFiles);
};

const buildProjectScanResult = (cacheEntry: ProjectScanCacheEntry, maxFiles: number): ProjectScanResult => {
  const limit = Math.max(1, maxFiles);
  const configCandidates = cacheEntry.configCandidates.slice(0, limit);
  const preferredConfig = configCandidates[0];

  return {
    cwd: cacheEntry.cwd,
    totalConfigCandidates: cacheEntry.configCandidates.length,
    omittedConfigCandidates: Math.max(0, cacheEntry.configCandidates.length - configCandidates.length),
    primaryConfigCandidates: configCandidates.slice(0, 5),
    configCandidates,
    packageJsonFiles: cacheEntry.packageJsonFiles.slice(0, limit),
    lockfiles: cacheEntry.lockfiles.slice(0, limit),
    suggestedDefaults: {
      configPath: preferredConfig ? toCliConfigPath(preferredConfig) : undefined,
      currentWorkingDirectory: preferredConfig?.directory || '.'
    }
  };
};

export type { ConfigCandidate, PackageJsonSummary, ProjectScanResult };
