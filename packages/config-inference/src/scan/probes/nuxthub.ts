/**
 * NuxtHub storage is provider/driver-dependent, not an ordinary Nuxt build dependency.
 * Read literal configuration and runtime syntax without executing project code. Explicit module
 * imports and configured server auto-imports prove usage; type imports, comments and tests do not.
 * An incomplete analysis stays review-only. Never invent an AWS database or copy connection values.
 */

import { posix } from 'node:path';
import * as ts from 'typescript';
import type { Citation } from '../../facts/citation';
import type { DeploymentRequirement } from '../../facts/project-facts';
import type { EnvironmentVariableUse } from '../../facts/service';
import { isEnvironmentFileName } from '../../policy/file-access';
import { isNonProductionFixturePath } from '../deployment-relevance';
import { citeFirstMatchOnly, type Probe, type ProbeContext, type ProbeOutput } from '../probe';

const NUXT_CONFIG = /^nuxt\.config\.[cm]?[jt]s$/i;
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|vue)$/i;
const NON_RUNTIME_FILE = /(?:\.d\.[cm]?ts|\.(?:test|spec|stories)\.(?:[cm]?[jt]sx?|vue))$/i;
const ENV_TEMPLATE =
  /^(?:\.env(?:\.(?:example|sample|template|defaults?))(?:[.-].*)?|(?:\.?)env[-.](?:example|sample|template|defaults?)(?:[-.].*)?)$/i;
const MAX_SOURCE_FILES = 400;
type RuntimeRequirement = Extract<DeploymentRequirement, { kind: 'framework-runtime-bindings' }>;
type Binding = RuntimeRequirement['bindings'][number];
type AnalysisReason = Extract<DeploymentRequirement, { kind: 'framework-analysis-incomplete' }>['reasons'][number];
type PackageManifest = { path: string; directory: string; name?: string; dependencies: ReadonlySet<string> };
type NuxtConfigEvidence = {
  moduleActive: boolean;
  enabledBindings: Set<Binding>;
  databaseEngine?: RuntimeRequirement['databaseEngine'];
  databaseEvidence?: Citation;
  serverDirectory: string;
  migrationDirectories: string[];
  localModules: string[];
  issues: Set<AnalysisReason>;
  evidence: Citation[];
};

const directoryOf = (path: string): string => posix.dirname(path) || '.';
const pathWithin = (path: string, directory: string): boolean =>
  directory === '.' || path === directory || path.startsWith(`${directory}/`);

const parseManifest = (path: string, raw: string): PackageManifest | undefined => {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const dependencies = new Set<string>();
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      const entries = parsed[field];
      if (typeof entries !== 'object' || entries === null || Array.isArray(entries)) continue;
      for (const name of Object.keys(entries)) dependencies.add(name);
    }
    return {
      path,
      directory: directoryOf(path),
      ...(typeof parsed.name === 'string' && parsed.name !== '' ? { name: parsed.name } : {}),
      dependencies
    };
  } catch {
    return undefined;
  }
};
const serviceNameFor = (manifest: PackageManifest): string => {
  const fromName = manifest.name?.replace(/^@[^/]+\//, '');
  if (fromName !== undefined && fromName !== '') return fromName;
  return manifest.directory === '.' ? 'app' : posix.basename(manifest.directory) || 'app';
};
const unwrap = (expression: ts.Expression): ts.Expression => {
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  ) {
    return unwrap(expression.expression);
  }
  return expression;
};
const literalString = (expression: ts.Expression): string | undefined => {
  const value = unwrap(expression);
  return ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value) ? value.text : undefined;
};
const propertyName = (property: ts.ObjectLiteralElementLike): string | undefined => {
  const name = property.name;
  return name !== undefined && (ts.isIdentifier(name) || ts.isStringLiteral(name)) ? name.text : undefined;
};
const singleProperty = (object: ts.ObjectLiteralExpression, name: string): ts.PropertyAssignment | undefined => {
  const matches = object.properties.filter((property) => propertyName(property) === name);
  return matches.length === 1 && ts.isPropertyAssignment(matches[0]!) ? matches[0] : undefined;
};
const hasComputedProperties = (object: ts.ObjectLiteralExpression): boolean =>
  object.properties.some((property) => !ts.isPropertyAssignment(property) || propertyName(property) === undefined) ||
  new Set(object.properties.map(propertyName)).size !== object.properties.length;

/** Cite only an identifier or a known module/dialect literal, never a whole config/source line. */
const citeNode = (node: ts.Node, field = 'deploymentRequirements'): Citation => {
  const source = node.getSourceFile();
  return {
    field,
    file: source.fileName,
    line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
    quote: node.getText(source).slice(0, 200)
  };
};
const sourceFile = (path: string, raw: string): ts.SourceFile =>
  ts.createSourceFile(
    path,
    raw,
    ts.ScriptTarget.Latest,
    true,
    /\.[cm]?jsx?$/i.test(path) ? ts.ScriptKind.JSX : /\.(?:tsx|vue)$/i.test(path) ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
const hasParseErrors = (source: ts.SourceFile): boolean =>
  (source as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length > 0;
const configObject = (source: ts.SourceFile): ts.ObjectLiteralExpression | undefined => {
  if (hasParseErrors(source)) return undefined;
  const exports = source.statements.filter(
    (statement): statement is ts.ExportAssignment => ts.isExportAssignment(statement) && !statement.isExportEquals
  );
  if (exports.length !== 1) return undefined;
  let expression = unwrap(exports[0]!.expression);
  if (ts.isCallExpression(expression)) {
    if (!ts.isIdentifier(expression.expression) || expression.expression.text !== 'defineNuxtConfig') return undefined;
    if (expression.arguments.length !== 1) return undefined;
    expression = unwrap(expression.arguments[0]!);
  }
  return ts.isObjectLiteralExpression(expression) ? expression : undefined;
};

/** No filesystem resolution: migrations can only be selected from the policy-approved file list. */
const localDirectory = (directory: string, value: string): string | undefined => {
  const normalized = value.replaceAll('\\', '/');
  if (
    !normalized ||
    /^(?:\/|~)|[:*?{}$]/.test(normalized) ||
    normalized.includes('\0') ||
    normalized.split('/').includes('..')
  )
    return undefined;
  const resolved = posix.join(directory, normalized);
  return pathWithin(resolved, directory) ? resolved : undefined;
};

const inspectNuxtConfig = (path: string, raw: string, directory: string): NuxtConfigEvidence => {
  const config: NuxtConfigEvidence = {
    moduleActive: false,
    enabledBindings: new Set(),
    serverDirectory: posix.join(directory, 'server'),
    migrationDirectories: [posix.join(directory, 'server/db/migrations')],
    localModules: [],
    issues: new Set(),
    evidence: []
  };
  const object = configObject(sourceFile(path, raw));
  if (object === undefined || hasComputedProperties(object)) {
    config.issues.add('dynamic-config');
    config.migrationDirectories = [];
    return config;
  }
  const modules = singleProperty(object, 'modules');
  const moduleArray = modules === undefined ? undefined : unwrap(modules.initializer);
  if (moduleArray !== undefined) {
    if (!ts.isArrayLiteralExpression(moduleArray)) config.issues.add('dynamic-config');
    else
      for (const element of moduleArray.elements) {
        const entry = unwrap(element as ts.Expression);
        const module = ts.isArrayLiteralExpression(entry) ? entry.elements[0] : entry;
        const name = module === undefined ? undefined : literalString(module as ts.Expression);
        if (name === undefined) config.issues.add('dynamic-config');
        if (name !== undefined && /^(?:\.{1,2}[\\/]|[~@]{1,2}[\\/]|[\\/]|[A-Za-z]:)/.test(name)) {
          config.localModules.push(name);
        }
        if (name === '@nuxthub/core') {
          config.moduleActive = true;
          config.evidence.push(citeNode(unwrap(module as ts.Expression)));
          if (ts.isArrayLiteralExpression(entry) && entry.elements.length > 1) config.issues.add('dynamic-config');
        }
      }
  }
  // Inherited and environment-specific configuration can change the active module or storage.
  if (object.properties.some((property) => /^(?:extends|\$.*)$/.test(propertyName(property) ?? '')))
    config.issues.add('dynamic-config');
  const serverDir = singleProperty(object, 'serverDir');
  if (serverDir !== undefined) {
    const value = literalString(serverDir.initializer);
    const resolved = value === undefined ? undefined : localDirectory(directory, value);
    if (resolved === undefined) config.issues.add('dynamic-config');
    else {
      config.serverDirectory = resolved;
      config.migrationDirectories = [posix.join(resolved, 'db/migrations')];
    }
  }
  const hub = singleProperty(object, 'hub');
  if (hub === undefined) return config;
  config.evidence.push(citeNode(hub.name));
  const hubObject = unwrap(hub.initializer);
  if (!ts.isObjectLiteralExpression(hubObject) || hasComputedProperties(hubObject)) {
    config.issues.add('dynamic-config');
    config.migrationDirectories = [];
    return config;
  }
  for (const [name, binding] of [
    ['db', 'database'],
    ['blob', 'blob'],
    ['kv', 'kv'],
    ['cache', 'cache']
  ] as const) {
    const property = singleProperty(hubObject, name);
    if (property === undefined) continue;
    const value = unwrap(property.initializer);
    if (value.kind === ts.SyntaxKind.FalseKeyword) continue;
    config.evidence.push(citeNode(property.name));
    config.enabledBindings.add(binding);
    if (binding !== 'database') {
      if (
        value.kind !== ts.SyntaxKind.TrueKeyword &&
        (!ts.isObjectLiteralExpression(value) || hasComputedProperties(value))
      )
        config.issues.add('dynamic-config');
      continue;
    }
    config.databaseEvidence = citeNode(property.name);
    let dialect = literalString(value);
    if (ts.isObjectLiteralExpression(value)) {
      if (hasComputedProperties(value)) {
        config.issues.add('dynamic-config');
        config.issues.add('migration-paths');
        config.migrationDirectories = [];
        continue;
      }
      const dialectProperty = singleProperty(value, 'dialect');
      dialect = dialectProperty === undefined ? undefined : literalString(dialectProperty.initializer);
      const migrations = singleProperty(value, 'migrationsDirs');
      if (migrations !== undefined) {
        const paths = unwrap(migrations.initializer);
        config.migrationDirectories = [];
        config.evidence.push(citeNode(migrations.name));
        if (!ts.isArrayLiteralExpression(paths)) config.issues.add('migration-paths');
        else
          for (const entry of paths.elements) {
            const literal = literalString(entry as ts.Expression);
            const resolved = literal === undefined ? undefined : localDirectory(directory, literal);
            if (resolved === undefined) config.issues.add('migration-paths');
            else config.migrationDirectories.push(resolved);
          }
      }
    }
    config.databaseEngine =
      dialect === 'sqlite' || dialect === 'postgresql' || dialect === 'mysql' ? dialect : 'unknown';
    if (config.databaseEngine === 'unknown') config.issues.add('dynamic-config');
  }
  if (config.moduleActive && config.enabledBindings.has('database')) {
    const hooks = singleProperty(object, 'hooks');
    if (hooks !== undefined) {
      const hookObject = unwrap(hooks.initializer);
      // NuxtHub calls this hook before collecting migrations. Do not execute callbacks or assume
      // the configured directories are complete when a hook can mutate them.
      const migrationHook = ts.isObjectLiteralExpression(hookObject)
        ? hookObject.properties.find((property) => propertyName(property) === 'hub:db:migrations:dirs')
        : undefined;
      if (
        migrationHook !== undefined ||
        !ts.isObjectLiteralExpression(hookObject) ||
        hookObject.properties.some(
          (property) => ts.isSpreadAssignment(property) || propertyName(property) === undefined
        )
      ) {
        config.issues.add('migration-paths');
        config.evidence.push(citeNode(migrationHook?.name ?? hooks.name));
      }
    }
  }
  return config;
};

/** Bind symbols using an in-memory TypeScript program: no project imports, config, or code executes. */
const checkerFor = (source: ts.SourceFile): ts.TypeChecker => {
  const host: ts.CompilerHost = {
    getSourceFile: (name) => (name === source.fileName ? source : undefined),
    getDefaultLibFileName: () => '',
    writeFile: () => {},
    getCurrentDirectory: () => '',
    getDirectories: () => [],
    fileExists: (name) => name === source.fileName,
    readFile: (name) => (name === source.fileName ? source.text : undefined),
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n'
  };
  return ts
    .createProgram([source.fileName], { noResolve: true, noLib: true, noEmit: true, allowJs: true }, host)
    .getTypeChecker();
};
const moduleBinding = (value: string | undefined): Binding | undefined => {
  if (value === 'hub:db' || value === '@nuxthub/db' || value === '@nuxthub/db/schema') return 'database';
  if (value === 'hub:blob' || value === '@nuxthub/blob') return 'blob';
  if (value === 'hub:kv' || value === '@nuxthub/kv') return 'kv';
  return undefined; // NuxtHub cache is Nitro storage, not an importable hub:cache module.
};
const AUTO_BINDINGS = new Map<string, Binding>([
  ['db', 'database'],
  ['schema', 'database'],
  ['blob', 'blob'],
  ['kv', 'kv']
]);
const CACHE_FUNCTIONS = new Set([
  'defineCachedFunction',
  'defineCachedEventHandler',
  'cachedFunction',
  'cachedEventHandler'
]);
const providerKey = (value: string): string => value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
const runtimeImport = (node: ts.ImportDeclaration): boolean => {
  const clause = node.importClause;
  if (clause === undefined) return true;
  if (clause.isTypeOnly) return false;
  if (clause.name !== undefined || clause.namedBindings === undefined || ts.isNamespaceImport(clause.namedBindings))
    return true;
  return (
    clause.namedBindings.elements.length === 0 || clause.namedBindings.elements.some((element) => !element.isTypeOnly)
  );
};

// Other imported helpers may register migration hooks; this bounded pass does not inspect their
// implementation and must not treat an active module's migration directories as fully known.
const MODULE_ANALYSIS_IMPORTS = new Set(['@nuxt/kit', 'nuxt/kit', 'node:path', 'node:url', 'pathe']);

const inspectSource = (path: string, raw: string, config: NuxtConfigEvidence, activeLocalModule = false) => {
  // Parse Vue scripts as TS/JS while preserving line numbers; markup is not runtime import syntax.
  let code = raw;
  let unreadable = false;
  if (/\.vue$/i.test(path)) {
    const withoutComments = raw.replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\r\n]/g, ' '));
    const scripts = [...withoutComments.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
    code = withoutComments.replace(/[^\r\n]/g, ' ');
    for (const match of scripts) {
      if (/\bsrc\s*=/.test(match[1]!)) unreadable = true;
      const offset = match.index! + match[0].indexOf('>') + 1;
      code = code.slice(0, offset) + match[2]! + code.slice(offset + match[2]!.length);
    }
  }
  const source = sourceFile(path, code);
  const bindings = new Map<Binding, Citation>();
  const oauthProviders = new Map<string, Citation>();
  let sessionEvidence: Citation | undefined;
  let migrationHookEvidence: Citation | undefined;
  let moduleAnalysisUnresolved = false;
  let checker: ts.TypeChecker | undefined;
  const frameworkImports = new Map<string, { name: string; declaration: ts.ImportSpecifier }>();
  const frameworkNamespaces = new Map<string, ts.NamespaceImport>();
  const isServer = pathWithin(path, config.serverDirectory);
  const unresolved = (node: ts.Identifier): boolean => {
    checker ??= checkerFor(source);
    const symbol = ts.isShorthandPropertyAssignment(node.parent)
      ? checker.getShorthandAssignmentValueSymbol(node.parent)
      : checker.getSymbolAtLocation(node);
    return symbol === undefined;
  };
  const runtimeName = (node: ts.Identifier): string | undefined => {
    const imported = frameworkImports.get(node.text);
    if (imported !== undefined) {
      checker ??= checkerFor(source);
      if (checker.getSymbolAtLocation(node)?.declarations?.includes(imported.declaration)) return imported.name;
    }
    return unresolved(node) ? node.text : undefined;
  };
  const addBinding = (binding: Binding | undefined, node: ts.Node) => {
    if (binding !== undefined && !bindings.has(binding)) bindings.set(binding, citeNode(node));
  };
  const addModuleBinding = (expression: ts.Expression) => {
    const literal = unwrap(expression);
    addBinding(moduleBinding(literalString(literal)), literal);
  };
  const namespaceMember = (node: ts.Node): { name: string; evidence: ts.Node } | undefined => {
    if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) return undefined;
    const namespace = unwrap(node.expression);
    if (!ts.isIdentifier(namespace)) return undefined;
    const declaration = frameworkNamespaces.get(namespace.text);
    if (declaration === undefined) return undefined;
    checker ??= checkerFor(source);
    if (!checker.getSymbolAtLocation(namespace)?.declarations?.includes(declaration)) return undefined;
    const member = ts.isPropertyAccessExpression(node) ? node.name : unwrap(node.argumentExpression);
    const name =
      ts.isIdentifier(member) && ts.isPropertyAccessExpression(node)
        ? member.text
        : ts.isStringLiteral(member) || ts.isNoSubstitutionTemplateLiteral(member)
          ? member.text
          : undefined;
    return name === undefined ? undefined : { name, evidence: member };
  };
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !runtimeImport(statement)) continue;
    const name = literalString(statement.moduleSpecifier);
    if (!['#imports', 'nitropack/runtime', 'nuxt-auth-utils/server'].includes(name ?? '')) continue;
    const named = statement.importClause?.namedBindings;
    if (named !== undefined && ts.isNamespaceImport(named)) frameworkNamespaces.set(named.name.text, named);
    if (named !== undefined && ts.isNamedImports(named))
      for (const specifier of named.elements) {
        if (!specifier.isTypeOnly)
          frameworkImports.set(specifier.name.text, {
            name: (specifier.propertyName ?? specifier.name).text,
            declaration: specifier
          });
      }
  }
  const visit = (node: ts.Node): void => {
    if (ts.isTypeNode(node)) return;
    if (ts.isImportDeclaration(node)) {
      if (runtimeImport(node)) {
        addModuleBinding(node.moduleSpecifier);
        if (activeLocalModule && !MODULE_ANALYSIS_IMPORTS.has(literalString(node.moduleSpecifier) ?? ''))
          moduleAnalysisUnresolved = true;
      }
      return;
    }
    if (ts.isExportDeclaration(node)) {
      if (
        !node.isTypeOnly &&
        node.moduleSpecifier !== undefined &&
        (node.exportClause === undefined ||
          !ts.isNamedExports(node.exportClause) ||
          node.exportClause.elements.length === 0 ||
          node.exportClause.elements.some((element) => !element.isTypeOnly))
      ) {
        addModuleBinding(node.moduleSpecifier);
        if (activeLocalModule) moduleAnalysisUnresolved = true;
      }
      return;
    }
    if (ts.isImportEqualsDeclaration(node)) {
      if (
        !node.isTypeOnly &&
        ts.isExternalModuleReference(node.moduleReference) &&
        node.moduleReference.expression !== undefined
      ) {
        addModuleBinding(node.moduleReference.expression);
        if (activeLocalModule && !MODULE_ANALYSIS_IMPORTS.has(literalString(node.moduleReference.expression) ?? ''))
          moduleAnalysisUnresolved = true;
      }
      return;
    }
    if (ts.isCallExpression(node)) {
      const callee = unwrap(node.expression);
      const argument = node.arguments[0];
      if (
        argument !== undefined &&
        (callee.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(callee) && callee.text === 'require' && unresolved(callee)))
      ) {
        addModuleBinding(argument);
        if (activeLocalModule && !MODULE_ANALYSIS_IMPORTS.has(literalString(argument) ?? ''))
          moduleAnalysisUnresolved = true;
      }
      if (
        activeLocalModule &&
        ts.isPropertyAccessExpression(callee) &&
        ['hook', 'hookOnce'].includes(callee.name.text)
      ) {
        const hookName = argument === undefined ? undefined : literalString(argument);
        if (hookName === 'hub:db:migrations:dirs') migrationHookEvidence ??= citeNode(unwrap(argument!));
        else if (hookName === undefined) moduleAnalysisUnresolved = true;
      }
      const member = namespaceMember(callee);
      if (ts.isIdentifier(callee) || member !== undefined) {
        const name = ts.isIdentifier(callee) ? runtimeName(callee) : member?.name;
        const citationNode = member?.evidence ?? callee;
        if (name !== undefined) {
          if (
            isServer &&
            config.moduleActive &&
            config.enabledBindings.has('cache') &&
            (CACHE_FUNCTIONS.has(name) ||
              (name === 'useStorage' && argument !== undefined && literalString(argument) === 'cache'))
          ) {
            addBinding('cache', citationNode);
          }
          if (/^(?:set|get|clear|require)UserSession$/.test(name))
            sessionEvidence ??= citeNode(citationNode, 'environmentVariables');
          const oauth = /^defineOAuth([A-Za-z0-9]+)EventHandler$/.exec(name);
          if (oauth !== null)
            oauthProviders.set(providerKey(oauth[1]!), citeNode(citationNode, 'environmentVariables'));
        }
      }
    }
    if (isServer && config.moduleActive) {
      const member = namespaceMember(node);
      const binding = member === undefined ? undefined : AUTO_BINDINGS.get(member.name);
      if (member !== undefined && binding !== undefined && config.enabledBindings.has(binding))
        addBinding(binding, member.evidence);
    }
    if (
      ts.isIdentifier(node) &&
      isServer &&
      config.moduleActive &&
      !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) &&
      !(ts.isPropertyAssignment(node.parent) && node.parent.name === node)
    ) {
      const name = AUTO_BINDINGS.has(node.text) || frameworkImports.has(node.text) ? runtimeName(node) : undefined;
      const binding = name === undefined ? undefined : AUTO_BINDINGS.get(name);
      if (binding !== undefined && config.enabledBindings.has(binding)) addBinding(binding, node);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return {
    bindings,
    oauthProviders,
    sessionEvidence,
    migrationHookEvidence,
    moduleAnalysisUnresolved,
    unreadable: unreadable || hasParseErrors(source)
  };
};

const environmentNamesFor = async (manifest: PackageManifest, context: ProbeContext): Promise<Set<string>> => {
  const paths = context.files.filter(
    (path) =>
      directoryOf(path) === manifest.directory &&
      isEnvironmentFileName(posix.basename(path)) &&
      ENV_TEMPLATE.test(posix.basename(path)) &&
      !isNonProductionFixturePath(path)
  );
  const names = new Set<string>();
  for (const path of paths) {
    // oxlint-disable-next-line no-await-in-loop -- bounded by the package's root-level env templates.
    const result = await context.read(path);
    if (result.kind === 'names-only') for (const name of result.environmentVariableNames) names.add(name);
  }
  return names;
};

export const nuxtHubProbe: Probe = {
  name: 'nuxthub',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const manifestPaths = context.files.filter(
      (path) => (path === 'package.json' || path.endsWith('/package.json')) && !isNonProductionFixturePath(path)
    );
    const manifests = (
      await Promise.all(
        manifestPaths.map(async (path) => {
          const raw = await context.readPrivileged(path);
          return raw === null ? undefined : parseManifest(path, raw);
        })
      )
    ).filter((manifest): manifest is PackageManifest => manifest !== undefined);
    const manifestDirectories = manifests.map((manifest) => manifest.directory).toSorted((a, b) => b.length - a.length);
    const owns = (manifest: PackageManifest, path: string): boolean =>
      manifestDirectories.find((directory) => pathWithin(path, directory)) === manifest.directory;
    const serviceEnvironments: NonNullable<ProbeOutput['serviceEnvironments']> = [];
    const deploymentRequirements: DeploymentRequirement[] = [];
    for (const manifest of manifests) {
      if (!manifest.dependencies.has('nuxt') || !manifest.dependencies.has('@nuxthub/core')) continue;
      const configPath = context.files.find(
        (path) => directoryOf(path) === manifest.directory && NUXT_CONFIG.test(posix.basename(path))
      );
      const configRead =
        configPath === undefined
          ? undefined
          : // oxlint-disable-next-line no-await-in-loop -- one bounded config read per candidate Nuxt package.
            await context.read(configPath, { startLine: 1, endLine: Number.MAX_SAFE_INTEGER });
      const configRaw = configRead?.kind === 'contents' && !configRead.truncated ? configRead.contents : undefined;
      const config = inspectNuxtConfig(
        configPath ?? 'nuxt.config.ts',
        configRaw ?? 'export default {}',
        manifest.directory
      );
      if (configPath !== undefined && configRaw === undefined) config.issues.add('unreadable-source');
      const activeLocalModules = new Set<string>();
      if (config.moduleActive && config.enabledBindings.has('database')) {
        const modulesDirectory = posix.join(manifest.directory, 'modules');
        // Nuxt automatically registers modules/*.ts and modules/*/index.ts, even without a
        // modules entry in nuxt.config. Other nested files are helpers, not module entrypoints.
        for (const path of context.files) {
          const relative = posix.relative(modulesDirectory, path);
          if (
            /^(?:[^/]+\.ts|[^/]+\/index\.ts)$/.test(relative) &&
            !NON_RUNTIME_FILE.test(path) &&
            !isNonProductionFixturePath(path)
          ) {
            activeLocalModules.add(path);
          }
        }
        for (const reference of config.localModules) {
          // Root aliases are literal; source-dir aliases/custom resolvers remain review-only.
          const rootRelative = reference.replace(/^(?:~~|@@)[\\/]/, './');
          const resolved = /^[~@][\\/]/.test(rootRelative)
            ? undefined
            : localDirectory(manifest.directory, rootRelative);
          const candidates =
            resolved === undefined
              ? []
              : [
                  resolved,
                  ...['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs'].flatMap((extension) => [
                    resolved + extension,
                    `${resolved}/index${extension}`
                  ])
                ];
          const path = candidates.find((candidate) => context.files.includes(candidate));
          if (path === undefined) config.issues.add('migration-paths');
          else activeLocalModules.add(path);
        }
      }
      const sourcePaths = context.files
        .filter(
          (path) =>
            owns(manifest, path) &&
            SOURCE_FILE.test(path) &&
            !NON_RUNTIME_FILE.test(path) &&
            !isNonProductionFixturePath(path) &&
            path !== configPath
        )
        .toSorted(
          (a, b) =>
            Number(activeLocalModules.has(b)) - Number(activeLocalModules.has(a)) ||
            Number(pathWithin(b, config.serverDirectory)) - Number(pathWithin(a, config.serverDirectory)) ||
            a.localeCompare(b)
        );
      if (context.filesTruncated || sourcePaths.length > MAX_SOURCE_FILES) config.issues.add('source-limit');
      const bindings = new Map<Binding, Citation>();
      const oauthProviders = new Map<string, Citation>();
      let sessionEvidence: Citation | undefined;
      for (const path of sourcePaths.slice(0, MAX_SOURCE_FILES)) {
        // oxlint-disable-next-line no-await-in-loop -- deterministic and bounded source scan.
        const sourceRead = await context.read(path, { startLine: 1, endLine: Number.MAX_SAFE_INTEGER });
        if (sourceRead.kind !== 'contents' || sourceRead.truncated) {
          config.issues.add('unreadable-source');
          continue;
        }
        const activeLocalModule = activeLocalModules.delete(path);
        const inspected = inspectSource(path, sourceRead.contents, config, activeLocalModule);
        if (inspected.unreadable) config.issues.add('unreadable-source');
        if (
          activeLocalModule &&
          (inspected.unreadable || inspected.moduleAnalysisUnresolved || inspected.migrationHookEvidence !== undefined)
        ) {
          config.issues.add('migration-paths');
          if (inspected.migrationHookEvidence !== undefined) config.evidence.push(inspected.migrationHookEvidence);
        }
        for (const [binding, citation] of inspected.bindings)
          if (!bindings.has(binding)) bindings.set(binding, citation);
        if (manifest.dependencies.has('nuxt-auth-utils')) {
          sessionEvidence ??= inspected.sessionEvidence;
          for (const [provider, citation] of inspected.oauthProviders)
            if (!oauthProviders.has(provider)) oauthProviders.set(provider, citation);
        }
      }
      if (activeLocalModules.size > 0) config.issues.add('migration-paths');
      const serviceName = serviceNameFor(manifest);
      // oxlint-disable-next-line no-await-in-loop -- names-only reads are bounded to this package's root templates.
      const environmentNames = await environmentNamesFor(manifest, context);
      const environmentVariables: EnvironmentVariableUse[] = [];
      if (sessionEvidence !== undefined && environmentNames.has('NUXT_SESSION_PASSWORD')) {
        environmentVariables.push({
          name: 'NUXT_SESSION_PASSWORD',
          role: 'generated-secret',
          required: true,
          evidence: [sessionEvidence]
        });
      }
      for (const name of [...environmentNames].toSorted()) {
        const match = /^NUXT_OAUTH_([A-Z0-9_]+)_CLIENT_(?:ID|SECRET)$/.exec(name);
        const evidence = match === null ? undefined : oauthProviders.get(providerKey(match[1]!));
        if (evidence !== undefined)
          environmentVariables.push({ name, role: 'third-party-secret', required: true, evidence: [evidence] });
      }
      if (environmentVariables.length > 0) serviceEnvironments.push({ path: manifest.directory, environmentVariables });
      const configuredDatabase = config.moduleActive && config.enabledBindings.has('database');
      const migrationPaths =
        bindings.has('database') || configuredDatabase
          ? context.files
              .filter(
                (path) =>
                  owns(manifest, path) &&
                  !isNonProductionFixturePath(path) &&
                  /\.sql$/i.test(path) &&
                  config.migrationDirectories.some((directory) => pathWithin(path, directory))
              )
              .toSorted()
          : [];
      // The framework build hooks use the database even when no runtime file imports it.
      if (
        config.moduleActive &&
        config.databaseEvidence !== undefined &&
        migrationPaths.length > 0 &&
        !bindings.has('database')
      ) {
        bindings.set('database', config.databaseEvidence);
      }
      if (bindings.size === 0 && config.issues.size === 0) continue;
      // oxlint-disable-next-line no-await-in-loop -- one safe package identity citation per emitted requirement.
      const manifestRaw = await context.readPrivileged(manifest.path);
      const packageCitation =
        manifestRaw === null
          ? undefined
          : citeFirstMatchOnly(manifest.path, manifestRaw, /"@nuxthub\/core"/, 'deploymentRequirements');
      const evidence = [packageCitation, ...config.evidence, ...bindings.values()].filter(
        (citation): citation is Citation => citation !== undefined
      );
      if (bindings.size > 0) {
        deploymentRequirements.push({
          kind: 'framework-runtime-bindings',
          serviceName,
          provider: 'nuxthub',
          bindings: [...bindings.keys()].toSorted(),
          ...(config.databaseEngine === undefined ? {} : { databaseEngine: config.databaseEngine }),
          migrationPaths,
          evidence
        });
      }
      if (config.issues.size > 0)
        deploymentRequirements.push({
          kind: 'framework-analysis-incomplete',
          serviceName,
          provider: 'nuxthub',
          reasons: [...config.issues].toSorted(),
          evidence
        });
    }
    return {
      ...(serviceEnvironments.length === 0 ? {} : { serviceEnvironments }),
      ...(deploymentRequirements.length === 0 ? {} : { deploymentRequirements })
    };
  }
};
