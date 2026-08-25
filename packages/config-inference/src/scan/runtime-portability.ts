/**
 * Runtime contracts that a managed AWS dependency cannot satisfy by configuration alone.
 *
 * Deployment descriptors prove which settings a process receives. Source proves whether those
 * settings are optional local overrides or whether the client is hard-wired to an S3-compatible
 * endpoint and static credentials. The scan is service-owned: a helper under another application
 * or an incidental `tools/` tree must never block every service in a monorepo.
 */

import { posix } from 'node:path';
import * as ts from 'typescript';
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

/** Mask comments and literal values, retaining literal presence, newlines and token positions. */
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
      result += '~' + ' '.repeat(quoteCount - 1);
      index += quoteCount - 1;
      rawDelimiterLength = quoteCount;
      state = 'raw';
      continue;
    }
    if (character === '@' && next === '"') {
      result += '~ ';
      index += 1;
      state = 'verbatim';
      continue;
    }
    if (character === '"') {
      result += '~';
      state = 'string';
      continue;
    }
    if (character === '`') {
      result += '~';
      state = 'template';
      continue;
    }
    if (character === "'") {
      result += '~';
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

const citationAt = (file: string, source: string, index: number, quote: string): Citation => ({
  file,
  line: source.slice(0, index).split('\n').length,
  quote: quote.replace(/\s+/g, ' ').trim().slice(0, 200)
});

const escapePattern = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const callArgumentsAreEmpty = (source: string, openingParenthesis: number, allowEmptyObject: boolean): boolean => {
  let depth = 0;
  for (let index = openingParenthesis; index < source.length; index += 1) {
    const character = source[index];
    if (character === '(') depth += 1;
    if (character !== ')') continue;
    depth -= 1;
    if (depth !== 0) continue;
    const argumentsSource = source.slice(openingParenthesis + 1, index).trim();
    return argumentsSource === '' || (allowEmptyObject && /^\{\s*\}$/.test(argumentsSource));
  }
  // An unclosed call is malformed or outside the bounded read. Neither proves portability.
  return false;
};

const recordConstructorCalls = ({
  file,
  source,
  names,
  prefix,
  namesArePatterns = false,
  allowEmptyObject,
  record
}: {
  file: string;
  source: string;
  names: ReadonlySet<string>;
  prefix: string;
  namesArePatterns?: boolean;
  allowEmptyObject: boolean;
  record: (key: keyof FamilySignals, citation: Citation | undefined) => void;
}): void => {
  if (names.size === 0) return;
  const calls = new RegExp(
    `${prefix}(?:${[...names].map((name) => (namesArePatterns ? name : escapePattern(name))).join('|')})\\s*\\(`,
    'g'
  );
  for (const match of source.matchAll(calls)) {
    const index = match.index;
    if (index === undefined) continue;
    const openingParenthesis = index + match[0].lastIndexOf('(');
    const citation = citationAt(file, source, index, match[0]);
    record('client', citation);
    record(
      callArgumentsAreEmpty(source, openingParenthesis, allowEmptyObject) ? 'portableClient' : 'configuredClient',
      citation
    );
  }
};

type NodeS3Binding = 'client' | 'namespace';

const unwrapNodeExpression = (expression: ts.Expression): ts.Expression => {
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isNonNullExpression(expression)
  ) {
    return unwrapNodeExpression(expression.expression);
  }
  return expression;
};

const nodeS3Binding = (
  expression: ts.Expression,
  clients: ReadonlySet<string>,
  namespaces: ReadonlySet<string>
): NodeS3Binding | undefined => {
  const value = unwrapNodeExpression(expression);
  if (ts.isIdentifier(value)) {
    if (clients.has(value.text)) return 'client';
    if (namespaces.has(value.text)) return 'namespace';
  }
  if (
    ts.isCallExpression(value) &&
    ts.isIdentifier(value.expression) &&
    value.expression.text === 'require' &&
    value.arguments.length === 1 &&
    ts.isStringLiteral(value.arguments[0]!) &&
    value.arguments[0].text === '@aws-sdk/client-s3'
  ) {
    return 'namespace';
  }
  if (ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) {
    const property = ts.isPropertyAccessExpression(value)
      ? value.name.text
      : ts.isStringLiteral(value.argumentExpression)
        ? value.argumentExpression.text
        : undefined;
    if (property === 'S3Client' && nodeS3Binding(value.expression, clients, namespaces) === 'namespace') {
      return 'client';
    }
  }
  return undefined;
};

/**
 * Resolve the standard static SDK import/require forms and their local assignment aliases.
 * This is not JavaScript execution or general data-flow analysis. Any recognized constructor
 * with opaque/configured arguments blocks, even when another constructor uses AWS defaults.
 */
const recordNodeS3Constructors = (
  file: string,
  contents: string,
  record: (key: keyof FamilySignals, citation: Citation | undefined) => void
): void => {
  const scriptKind = /\.tsx$/i.test(file)
    ? ts.ScriptKind.TSX
    : /\.jsx$/i.test(file)
      ? ts.ScriptKind.JSX
      : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true, scriptKind);
  const clients = new Set(['S3Client']);
  const namespaces = new Set<string>();
  const aliases: { name: ts.BindingName; value: ts.Expression }[] = [];
  const constructors: ts.NewExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === '@aws-sdk/client-s3' &&
      node.importClause?.isTypeOnly === false
    ) {
      const bindings = node.importClause.namedBindings;
      if (bindings !== undefined && ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);
      if (bindings !== undefined && ts.isNamedImports(bindings)) {
        for (const binding of bindings.elements) {
          if (!binding.isTypeOnly && (binding.propertyName ?? binding.name).text === 'S3Client') {
            clients.add(binding.name.text);
          }
        }
      }
    }
    if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      aliases.push({ name: node.name, value: node.initializer });
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.left)
    ) {
      aliases.push({ name: node.left, value: node.right });
    }
    if (ts.isNewExpression(node)) constructors.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  let changed = true;
  while (changed) {
    const previousSize = clients.size + namespaces.size;
    for (const { name, value } of aliases) {
      const binding = nodeS3Binding(value, clients, namespaces);
      if (binding === undefined) continue;
      if (ts.isIdentifier(name)) {
        (binding === 'client' ? clients : namespaces).add(name.text);
      } else if (binding === 'namespace' && ts.isObjectBindingPattern(name)) {
        for (const element of name.elements) {
          const property = element.propertyName ?? element.name;
          if (
            element.dotDotDotToken === undefined &&
            ts.isIdentifier(element.name) &&
            (ts.isIdentifier(property) || ts.isStringLiteral(property)) &&
            property.text === 'S3Client'
          ) {
            clients.add(element.name.text);
          }
        }
      }
    }
    changed = clients.size + namespaces.size > previousSize;
  }

  const parseDiagnostics = (sourceFile as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] })
    .parseDiagnostics;
  for (const constructor of constructors) {
    if (nodeS3Binding(constructor.expression, clients, namespaces) !== 'client') continue;
    const start = constructor.getStart(sourceFile);
    const citation = citationAt(file, contents, start, contents.slice(start, constructor.expression.end));
    const args = constructor.arguments ?? [];
    const onlyArgument = args.length === 1 ? unwrapNodeExpression(args[0]!) : undefined;
    const empty =
      args.length === 0 ||
      (onlyArgument !== undefined &&
        ts.isObjectLiteralExpression(onlyArgument) &&
        onlyArgument.properties.length === 0);
    record('client', citation);
    record(empty && parseDiagnostics.length === 0 ? 'portableClient' : 'configuredClient', citation);
  }
};

const cSharpS3ClientNames = (source: string): Set<string> => {
  const names = new Set(['AmazonS3Client', 'Amazon.S3.AmazonS3Client']);
  for (const match of source.matchAll(
    /\busing\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:global::)?(?:Amazon\.S3\.)?AmazonS3Client\s*;/g
  )) {
    if (match[1] !== undefined) names.add(match[1]);
  }
  return names;
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
    recordConstructorCalls({
      file,
      source,
      names: cSharpS3ClientNames(source),
      prefix: '\\bnew\\s+',
      allowEmptyObject: false,
      record
    });
    recordConstructorCalls({
      file,
      source,
      names: new Set(['AddAWSService\\s*<\\s*IAmazonS3\\s*>']),
      prefix: '\\b',
      namesArePatterns: true,
      allowEmptyObject: false,
      record
    });
    record('credentials', citationFor(file, source, /\bnew\s+(?:Amazon\.Runtime\.)?BasicAWSCredentials\s*\(/));
    record('endpoint', citationFor(file, source, /\bServiceURL\s*=/));
  } else if (family === 'node') {
    recordNodeS3Constructors(file, contents, record);
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

const hasOnlyPortableClients = (signals: FamilySignals): boolean =>
  signals.portableClient !== undefined &&
  signals.configuredClient === undefined &&
  signals.endpoint === undefined &&
  signals.credentials === undefined &&
  signals.accessKey === undefined &&
  signals.secretKey === undefined;

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
  const allSignals = [...families.values()];
  if (
    allSignals.some(hasOnlyPortableClients) &&
    allSignals.every((signals) => signals.client === undefined || hasOnlyPortableClients(signals))
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
