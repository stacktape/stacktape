/**
 * Runtime contracts that a managed AWS dependency cannot satisfy by configuration alone.
 *
 * Deployment descriptors prove which settings a process receives. Source proves whether those
 * settings are optional local overrides or whether the client is hard-wired to an S3-compatible
 * endpoint and static credentials. The scan is service-owned: a helper under another application
 * or an incidental `tools/` tree must never block every service in a monorepo.
 */

import { posix } from 'node:path';
import type { Citation } from '../facts/citation';
import type { DependencyFact } from '../facts/dependency';
import { normalizedEnvironmentVariableName, type ServiceFactInput } from '../facts/service';
import type { SourceRead } from './read-source';

const MAX_FILES_PER_SERVICE = 300;
const MAX_SOURCE_FILES_SCANNED = 800;
const MAX_PROJECT_REFERENCES = 40;
const SOURCE_FILE = /\.(?:cs|[cm]?[jt]sx?|java|kt|go)$/i;
const PROJECT_FILE = /\.csproj$/i;
const EXCLUDED_FILE = /\.(?:test|spec|stories)\.[^.]+$|\.d\.ts$/i;
const EXCLUDED_RELATIVE_PATH = new RegExp(
  '(^|/)(' +
    [
      'test',
      'tests',
      '__tests__',
      '__mocks__',
      'spec',
      'specs',
      'e2e',
      'cypress',
      'fixtures',
      'examples?',
      'docs?',
      'scripts',
      'tools',
      'migrations?',
      'dist',
      'build',
      'out',
      'target',
      'vendor',
      'coverage'
    ].join('|') +
    ')(/|$)',
  'i'
);

type RuntimePortabilityInput = {
  services: ServiceFactInput[];
  dependencies: DependencyFact[];
  files: readonly string[];
  read: (repoRelativePath: string) => Promise<SourceRead>;
};

type SourceFamily = 'csharp' | 'node' | 'java' | 'go';
type FamilySignals = {
  client?: Citation;
  portableClient?: Citation;
  configuredClient?: Citation;
  endpoint?: Citation;
  credentials?: Citation;
  accessKey?: Citation;
  secretKey?: Citation;
};

const under = (file: string, directory: string): boolean =>
  directory === '.' ? true : file === directory || file.startsWith(`${directory}/`);

const relativeTo = (file: string, directory: string): string =>
  directory === '.' ? file : file === directory ? '' : file.slice(directory.length + 1);

const isObjectStorageConstraint = (constraint: { kind: string }): boolean =>
  constraint.kind === 'object-storage-explicit-credentials-and-endpoint' ||
  constraint.kind === 'object-storage-explicit-settings-unverified';

/** Remove comments and literals while preserving newlines and source-token positions. */
const codeOnly = (contents: string): string => {
  let result = '';
  let state: 'code' | 'line-comment' | 'block-comment' | 'string' | 'template' | 'char' | 'verbatim' | 'raw' = 'code';
  let rawDelimiterLength = 0;
  for (let index = 0; index < contents.length; index += 1) {
    const character = contents[index]!;
    const next = contents[index + 1];
    if (character === '\n') {
      result += '\n';
      if (state === 'line-comment') state = 'code';
      continue;
    }
    if (state === 'line-comment') {
      result += ' ';
      continue;
    }
    if (state === 'block-comment') {
      result += ' ';
      if (character === '*' && next === '/') {
        result += ' ';
        index += 1;
        state = 'code';
      }
      continue;
    }
    if (state === 'raw') {
      const quoteCount = character === '"' ? (contents.slice(index).match(/^"+/)?.[0].length ?? 0) : 0;
      if (quoteCount >= rawDelimiterLength) {
        result += ' '.repeat(rawDelimiterLength);
        index += rawDelimiterLength - 1;
        state = 'code';
      } else {
        result += ' ';
      }
      continue;
    }
    if (state === 'verbatim') {
      result += ' ';
      if (character === '"' && next === '"') {
        result += ' ';
        index += 1;
      } else if (character === '"') {
        state = 'code';
      }
      continue;
    }
    if (state === 'string' || state === 'template' || state === 'char') {
      result += ' ';
      if (character === '\\' && next !== undefined) {
        result += next === '\n' ? '\n' : ' ';
        index += 1;
      } else if (
        (state === 'string' && character === '"') ||
        (state === 'template' && character === '`') ||
        (state === 'char' && character === "'")
      ) {
        state = 'code';
      }
      continue;
    }

    if (character === '/' && next === '/') {
      result += '  ';
      index += 1;
      state = 'line-comment';
      continue;
    }
    if (character === '/' && next === '*') {
      result += '  ';
      index += 1;
      state = 'block-comment';
      continue;
    }
    const quoteCount = character === '"' ? (contents.slice(index).match(/^"+/)?.[0].length ?? 0) : 0;
    if (quoteCount >= 3) {
      result += ' '.repeat(quoteCount);
      index += quoteCount - 1;
      rawDelimiterLength = quoteCount;
      state = 'raw';
      continue;
    }
    if (character === '@' && next === '"') {
      result += '  ';
      index += 1;
      state = 'verbatim';
      continue;
    }
    if (character === '"') {
      result += ' ';
      state = 'string';
      continue;
    }
    if (character === '`') {
      result += ' ';
      state = 'template';
      continue;
    }
    if (character === "'") {
      result += ' ';
      state = 'char';
      continue;
    }
    result += character;
  }
  return result;
};

const citationFor = (file: string, source: string, pattern: RegExp): Citation | undefined => {
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    const match = pattern.exec(line);
    if (match !== null) return { file, line: index + 1, quote: match[0] };
  }
  return undefined;
};

const sourceFamily = (file: string): SourceFamily | undefined => {
  if (file.endsWith('.cs')) return 'csharp';
  if (/\.[cm]?[jt]sx?$/i.test(file)) return 'node';
  if (/\.(?:java|kt)$/i.test(file)) return 'java';
  if (file.endsWith('.go')) return 'go';
  return undefined;
};

const collectSignals = (file: string, contents: string, families: Map<SourceFamily, FamilySignals>): void => {
  const family = sourceFamily(file);
  if (family === undefined) return;
  const source = codeOnly(contents);
  const signals = families.get(family) ?? {};
  const record = (key: keyof FamilySignals, citation: Citation | undefined): void => {
    if (signals[key] === undefined && citation !== undefined) signals[key] = citation;
  };
  if (family === 'csharp') {
    record('client', citationFor(file, source, /\b(?:new\s+AmazonS3Client|AddAWSService\s*<\s*IAmazonS3\s*>)/));
    record(
      'portableClient',
      citationFor(file, source, /\b(?:new\s+AmazonS3Client\s*\(\s*\)|AddAWSService\s*<\s*IAmazonS3\s*>\s*\(\s*\))/)
    );
    record(
      'configuredClient',
      citationFor(file, source, /\b(?:new\s+AmazonS3Client|AddAWSService\s*<\s*IAmazonS3\s*>)\s*\(\s*(?!\))/)
    );
    record('credentials', citationFor(file, source, /\bnew\s+(?:Amazon\.Runtime\.)?BasicAWSCredentials\s*\(/));
    record('endpoint', citationFor(file, source, /\bServiceURL\s*=/));
  } else if (family === 'node') {
    record('client', citationFor(file, source, /\bnew\s+S3Client\s*\(/));
    record('portableClient', citationFor(file, source, /\bnew\s+S3Client\s*\(\s*(?:\{\s*\})?\s*\)/));
    record('configuredClient', citationFor(file, source, /\bnew\s+S3Client\s*\(\s*(?!\)|\{\s*\}\s*\))/));
    record('endpoint', citationFor(file, source, /\bendpoint\s*:/));
    record('accessKey', citationFor(file, source, /\baccessKeyId\s*:/));
    record('secretKey', citationFor(file, source, /\bsecretAccessKey\s*:/));
  } else if (family === 'java') {
    record('client', citationFor(file, source, /\bS3Client\s*\.\s*builder\s*\(/));
    record('endpoint', citationFor(file, source, /\bendpointOverride\s*\(/));
    record('credentials', citationFor(file, source, /\bStaticCredentialsProvider\s*\.\s*create\s*\(/));
  } else {
    record('client', citationFor(file, source, /\bs3\s*\.\s*NewFromConfig\s*\(/));
    record('endpoint', citationFor(file, source, /\b(?:BaseEndpoint|EndpointResolverV2?)\b/));
    record('credentials', citationFor(file, source, /\bcredentials\s*\.\s*NewStaticCredentialsProvider\s*\(/));
  }
  families.set(family, signals);
};

const projectReferencePattern = /<ProjectReference\b[^>]*\bInclude\s*=\s*["']([^"']+)["'][^>]*>/gi;

const sourceRootsFor = async (
  service: ServiceFactInput,
  files: readonly string[],
  read: RuntimePortabilityInput['read']
): Promise<Set<string>> => {
  const fileSet = new Set(files);
  const roots = new Set([service.path]);
  const pending = files.filter((file) => PROJECT_FILE.test(file) && posix.dirname(file) === service.path);
  const visited = new Set<string>();
  while (pending.length > 0 && visited.size < MAX_PROJECT_REFERENCES) {
    const project = pending.shift()!;
    if (visited.has(project)) continue;
    visited.add(project);
    // oxlint-disable-next-line no-await-in-loop -- bounded graph walk; referenced projects depend on this read.
    const result = await read(project);
    if (result.kind !== 'contents') continue;
    projectReferencePattern.lastIndex = 0;
    for (const match of result.contents.matchAll(projectReferencePattern)) {
      const include = match[1]?.replaceAll('\\', '/');
      if (include === undefined || include.includes('$(')) continue;
      const referencedProject = posix.normalize(posix.join(posix.dirname(project), include));
      if (referencedProject.startsWith('../') || referencedProject.startsWith('/') || !fileSet.has(referencedProject)) {
        continue;
      }
      roots.add(posix.dirname(referencedProject));
      if (!visited.has(referencedProject)) pending.push(referencedProject);
    }
  }
  return roots;
};

const scopedSourceFiles = (
  service: ServiceFactInput,
  roots: ReadonlySet<string>,
  services: readonly ServiceFactInput[],
  files: readonly string[]
): string[] => {
  const explicitlyReferencedRoots = new Set([...roots].filter((root) => root !== service.path));
  const otherServicePaths = [
    ...new Set(
      services
        .map((candidate) => candidate.path)
        .filter((path) => path !== service.path && path !== '.' && under(path, service.path))
    )
  ].toSorted((left, right) => right.length - left.length);

  return files
    .filter((file) => SOURCE_FILE.test(file) && !EXCLUDED_FILE.test(file))
    .filter((file) => {
      const root = [...roots]
        .toSorted((left, right) => right.length - left.length)
        .find((candidate) => under(file, candidate));
      if (root === undefined) return false;
      if (
        root === service.path &&
        otherServicePaths.some(
          (otherPath) => under(file, otherPath) && ![...explicitlyReferencedRoots].some((scope) => under(file, scope))
        )
      ) {
        return false;
      }
      return !EXCLUDED_RELATIVE_PATH.test(relativeTo(file, root));
    })
    .slice(0, MAX_FILES_PER_SERVICE);
};

type ExplicitSettings = { evidence: Citation[] };

const explicitObjectStorageSettings = (
  service: ServiceFactInput,
  objectStorageDependencyNames: ReadonlySet<string>
): ExplicitSettings | undefined => {
  let hasEndpoint = false;
  let hasAccessKey = false;
  let hasSecretKey = false;
  let endpoint: Citation | undefined;
  let accessKey: Citation | undefined;
  let secretKey: Citation | undefined;
  for (const variable of service.environmentVariables ?? []) {
    if (variable.dependencyName !== undefined && !objectStorageDependencyNames.has(variable.dependencyName)) continue;
    const name = normalizedEnvironmentVariableName(variable.name);
    const evidence = (variable.evidence ?? [])[0];
    if (/(?:^|_)(?:SERVICE_URL|ENDPOINT)$/.test(name)) {
      hasEndpoint = true;
      endpoint ??= evidence;
    }
    if (/(?:^|_)(?:ACCESS_KEY|ACCESS_KEY_ID)$/.test(name)) {
      hasAccessKey = true;
      accessKey ??= evidence;
    }
    if (/(?:^|_)(?:SECRET_KEY|SECRET_ACCESS_KEY)$/.test(name)) {
      hasSecretKey = true;
      secretKey ??= evidence;
    }
  }
  if (!hasEndpoint || !hasAccessKey || !hasSecretKey) return undefined;
  return {
    evidence: [endpoint, accessKey, secretKey].filter((citation): citation is Citation => citation !== undefined)
  };
};

const sourceAssessment = (
  families: ReadonlyMap<SourceFamily, FamilySignals>
): { kind: 'explicit'; evidence: Citation[] } | { kind: 'portable' } | { kind: 'unknown' } => {
  for (const [family, signals] of families) {
    const explicit =
      family === 'csharp'
        ? signals.credentials !== undefined && signals.endpoint !== undefined
        : family === 'node'
          ? signals.client !== undefined &&
            signals.endpoint !== undefined &&
            signals.accessKey !== undefined &&
            signals.secretKey !== undefined
          : signals.client !== undefined && signals.endpoint !== undefined && signals.credentials !== undefined;
    if (explicit) {
      return {
        kind: 'explicit',
        evidence: [signals.client, signals.credentials, signals.endpoint, signals.accessKey, signals.secretKey].filter(
          (citation): citation is Citation => citation !== undefined
        )
      };
    }
  }
  if (
    [...families.values()].some(
      (signals) =>
        signals.portableClient !== undefined &&
        signals.configuredClient === undefined &&
        signals.endpoint === undefined &&
        signals.credentials === undefined &&
        signals.accessKey === undefined &&
        signals.secretKey === undefined
    )
  ) {
    return { kind: 'portable' };
  }
  return { kind: 'unknown' };
};

/**
 * Add one service-local portability result for every object-storage descriptor contract.
 *
 * Unknown clients fail closed. Stacktape deliberately omits local endpoints and static keys when
 * it creates an AWS bucket; without positive source proof that the client uses AWS defaults, a
 * ready-to-deploy result would hide a likely runtime failure.
 */
export const enrichRuntimePortability = async ({
  services,
  dependencies,
  files,
  read
}: RuntimePortabilityInput): Promise<void> => {
  const objectStorageDependencies = dependencies.filter((dependency) => dependency.kind === 'object-storage');
  const dependencyNames = new Set(objectStorageDependencies.map((dependency) => dependency.name));
  const consumers = new Set(objectStorageDependencies.flatMap((dependency) => dependency.consumedBy));
  const reads = new Map<string, Promise<SourceRead>>();
  const readCached = (path: string): Promise<SourceRead> => {
    const existing = reads.get(path);
    if (existing !== undefined) return existing;
    const pending = read(path);
    reads.set(path, pending);
    return pending;
  };
  const sourceFilesRead = new Set<string>();

  for (const service of services) {
    if (!consumers.has(service.name)) continue;
    const settings = explicitObjectStorageSettings(service, dependencyNames);
    if (settings === undefined) continue;

    // oxlint-disable-next-line no-await-in-loop -- each service owns a different bounded project-reference graph.
    const roots = await sourceRootsFor(service, files, readCached);
    const families = new Map<SourceFamily, FamilySignals>();
    for (const file of scopedSourceFiles(service, roots, services, files)) {
      if (!sourceFilesRead.has(file) && sourceFilesRead.size >= MAX_SOURCE_FILES_SCANNED) continue;
      sourceFilesRead.add(file);
      // oxlint-disable-next-line no-await-in-loop -- deterministic evidence selection within a bounded service scan.
      const result = await readCached(file);
      if (result.kind === 'contents') collectSignals(file, result.contents, families);
    }
    const assessment = sourceAssessment(families);
    const retained = (service.runtimePortabilityConstraints ?? []).filter(
      (constraint) => !isObjectStorageConstraint(constraint)
    );
    if (assessment.kind === 'portable') {
      service.runtimePortabilityConstraints = retained;
      continue;
    }
    service.runtimePortabilityConstraints = [
      ...retained,
      assessment.kind === 'explicit'
        ? {
            kind: 'object-storage-explicit-credentials-and-endpoint',
            evidence: assessment.evidence
          }
        : {
            kind: 'object-storage-explicit-settings-unverified',
            evidence: settings.evidence
          }
    ];
  }
};
