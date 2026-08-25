import { posix } from 'node:path';
import yaml from 'yaml';
import { readText, type ProbeContext } from './probe';

export const INCIDENTAL_DIRECTORY_NAMES: ReadonlySet<string> = new Set([
  '__fixtures__',
  '__mocks__',
  '__tests__',
  'benchmark',
  'benchmarks',
  'client',
  'clients',
  'demo',
  'demos',
  'docs',
  'documentation',
  'e2e',
  'example',
  'examples',
  'fixture',
  'fixtures',
  'hack',
  'hack-dev',
  'loadtest',
  'loadtests',
  'playground',
  'playgrounds',
  'sample',
  'samples',
  'scripts',
  'sdk',
  'sdks',
  'spec',
  'specs',
  'template',
  'templates',
  'test',
  'testutils',
  'tests',
  'tools'
]);

/** Repository grouping directories whose immediate child is itself an application/package boundary. */
const PACKAGE_CONTAINER_NAMES: ReadonlySet<string> = new Set([
  'api',
  'apps',
  'backend',
  'cmd',
  'crates',
  'frontend',
  'internal',
  'modules',
  'packages',
  'pkg',
  'services'
]);

const APPLICATION_MANIFEST_NAMES = [
  'package.json',
  'deno.json',
  'deno.jsonc',
  'Cargo.toml',
  'pyproject.toml',
  'requirements.txt',
  'go.mod',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts'
] as const;

const normalizeWorkspacePattern = (value: string): string =>
  value.trim().replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');

const workspaceSegmentMatches = (pattern: string, value: string): boolean => {
  const valueCharacters = [...value];
  let previous = Array.from({ length: valueCharacters.length + 1 }, (_, index) => index === 0);
  for (const character of pattern) {
    const current = Array.from({ length: valueCharacters.length + 1 }, () => false);
    current[0] = character === '*' && previous[0]!;
    for (let valueIndex = 1; valueIndex <= valueCharacters.length; valueIndex += 1) {
      current[valueIndex] =
        character === '*'
          ? previous[valueIndex]! || current[valueIndex - 1]!
          : (character === '?' || character === valueCharacters[valueIndex - 1]) && previous[valueIndex - 1]!;
    }
    previous = current;
  }
  return previous[valueCharacters.length]!;
};

const workspacePatternMatches = (pattern: string, directory: string): boolean => {
  const patternSegments = normalizeWorkspacePattern(pattern).split('/');
  const directorySegments = normalizeWorkspacePattern(directory).split('/');
  const memo = new Map<string, boolean>();

  const matches = (patternIndex: number, directoryIndex: number): boolean => {
    const key = `${patternIndex}:${directoryIndex}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;

    let result: boolean;
    if (patternIndex === patternSegments.length) {
      result = directoryIndex === directorySegments.length;
      memo.set(key, result);
      return result;
    }
    const segment = patternSegments[patternIndex]!;
    if (segment === '**') {
      result =
        matches(patternIndex + 1, directoryIndex) ||
        (directoryIndex < directorySegments.length && matches(patternIndex, directoryIndex + 1));
    } else {
      result =
        directoryIndex < directorySegments.length &&
        workspaceSegmentMatches(segment, directorySegments[directoryIndex]!) &&
        matches(patternIndex + 1, directoryIndex + 1);
    }
    memo.set(key, result);
    return result;
  };

  return matches(0, 0);
};

export const isWorkspaceMember = (directory: string, patterns: readonly string[]): boolean => {
  let included = false;
  for (const originalPattern of patterns) {
    const normalized = normalizeWorkspacePattern(originalPattern);
    const excluded = normalized.startsWith('!');
    const pattern = excluded ? normalized.slice(1) : normalized;
    if (pattern !== '' && workspacePatternMatches(pattern, directory)) included = !excluded;
  }
  return included;
};

const boundedWorkspacePatterns = (entries: readonly unknown[]): string[] =>
  entries
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0 && entry.length <= 256)
    .slice(0, 128);

export const packageWorkspacePatterns = (raw: string | null | undefined): string[] => {
  if (raw === null || raw === undefined) return [];
  try {
    const parsed = JSON.parse(raw) as { workspaces?: unknown };
    if (Array.isArray(parsed.workspaces)) {
      return boundedWorkspacePatterns(parsed.workspaces);
    }
    const packages = (parsed.workspaces as { packages?: unknown } | undefined)?.packages;
    return Array.isArray(packages) ? boundedWorkspacePatterns(packages) : [];
  } catch {
    return [];
  }
};

export const pnpmWorkspacePatterns = (raw: string | undefined): string[] => {
  if (raw === undefined) return [];
  try {
    const document = yaml.parseDocument(raw);
    if (document.errors.length > 0) return [];
    const parsed = document.toJSON() as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    const packages = (parsed as { packages?: unknown }).packages;
    return Array.isArray(packages) ? boundedWorkspacePatterns(packages) : [];
  } catch {
    return [];
  }
};

/** Resolves explicitly active workspace application directories declared in root manifests. */
export const activeWorkspaceDirectories = async (context: ProbeContext): Promise<Set<string>> => {
  const [rootPackage, pnpmWorkspace, goWork, cargoToml] = await Promise.all([
    context.files.includes('package.json') ? context.readPrivileged('package.json') : Promise.resolve(null),
    readText(context, 'pnpm-workspace.yaml'),
    readText(context, 'go.work'),
    readText(context, 'Cargo.toml')
  ]);

  const patterns = [...packageWorkspacePatterns(rootPackage), ...pnpmWorkspacePatterns(pnpmWorkspace)];

  // Go workspaces: `use ( ./dir1 ./dir2 )` or `use ./dir`
  if (goWork !== undefined) {
    const goUseMatches = [...goWork.matchAll(/\buse\s+(?:\(\s*([^)]+)\s*\)|([^\s\r\n]+))/g)];
    for (const match of goUseMatches) {
      const block = match[1] ?? match[2] ?? '';
      for (const line of block.split(/\s+/)) {
        const trimmed = normalizeWorkspacePattern(line);
        if (trimmed !== '' && trimmed !== '.') patterns.push(trimmed);
      }
    }
  }

  // Cargo workspaces: members = ["crate1", "crates/*"]
  if (cargoToml !== undefined) {
    const membersMatch = /\[workspace\][\s\S]*?members\s*=\s*\[([\s\S]*?)\]/.exec(cargoToml);
    if (membersMatch?.[1] !== undefined) {
      const rawList = membersMatch[1];
      const memberPatterns = [...rawList.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]!.trim());
      patterns.push(...memberPatterns);
    }
  }

  if (patterns.length === 0) return new Set();

  const manifestDirectories = [
    ...new Set(
      context.files
        .filter((path) => APPLICATION_MANIFEST_NAMES.some((name) => path === name || path.endsWith(`/${name}`)))
        .map((path) => posix.dirname(path))
    )
  ];

  return new Set(manifestDirectories.filter((dir) => isWorkspaceMember(dir, patterns)));
};

/**
 * Checks whether a repository path is inside an incidental/decoy directory
 * (docs, examples, sdks, hack, test, etc.) unless declared by an authoritative workspace.
 */
export const isIncidentalPath = (path: string, activeDirectories?: ReadonlySet<string>): boolean => {
  const normalized = path.replaceAll('\\', '/').replace(/^\.\//, '');
  const dirSegments = normalized.split('/').slice(0, -1);
  return isIncidentalDirectory(dirSegments.join('/'), activeDirectories);
};

/** Directory form of {@link isIncidentalPath}; service facts carry directories rather than files. */
export const isIncidentalDirectory = (directory: string, activeDirectories?: ReadonlySet<string>): boolean => {
  const normalized = directory.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
  if (normalized === '' || normalized === '.') return false;
  const dirSegments = normalized.split('/');

  // Only repository/package boundaries count. A deep source namespace such as
  // `src/main/java/com/example` or `src/client` is ordinary application code, not a second
  // deployable project. At the root, and immediately below conventional monorepo containers, an
  // incidental-looking name does identify the package the probes would otherwise promote.
  const boundarySegments = PACKAGE_CONTAINER_NAMES.has(dirSegments[0]?.toLowerCase() ?? '')
    ? dirSegments.slice(0, 2)
    : dirSegments.slice(0, 1);
  const hasIncidentalSegment = boundarySegments.some((segment) => {
    const normalizedSegment = segment.toLowerCase();
    return (
      INCIDENTAL_DIRECTORY_NAMES.has(normalizedSegment) ||
      normalizedSegment.split(/[-_.]/).some((part) => part !== '' && INCIDENTAL_DIRECTORY_NAMES.has(part))
    );
  });
  if (!hasIncidentalSegment) return false;

  if (activeDirectories !== undefined) {
    if (activeDirectories.has(normalized)) return false;
    for (let i = 1; i <= dirSegments.length; i++) {
      const prefix = dirSegments.slice(0, i).join('/');
      if (activeDirectories.has(prefix)) return false;
    }
  }

  return true;
};
