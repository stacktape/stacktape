/**
 * NuxtHub runtime contracts that a plain Nuxt build does not preserve.
 *
 * `@nuxthub/core` is not just a build helper. Imports such as `hub:db` are virtual modules backed
 * by provider-created bindings, and NuxtHub's deploy command also owns database migration
 * lifecycle. A normal Nuxt resource can still build the application, but calling that resource
 * deployment-ready would hide the missing data plane.
 *
 * This probe requires both the exact framework package and production source usage. A dependency
 * alone stays silent, which keeps ordinary Nuxt projects and unused/transitive modules as negative
 * controls. It never translates SQLite to RDS: the APIs are not interchangeable.
 */

import { posix } from 'node:path';
import * as ts from 'typescript';
import type { Citation } from '../../facts/citation';
import type { EnvironmentVariableUse } from '../../facts/service';
import { isEnvironmentFileName } from '../../policy/file-access';
import { isNonProductionFixturePath } from '../deployment-relevance';
import { citeFirstMatchOnly, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';

const NUXT_CONFIG = /^nuxt\.config\.[cm]?[jt]s$/i;
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|vue)$/i;
const ENV_TEMPLATE =
  /^(?:\.env(?:\.(?:example|sample|template|defaults?))(?:[.-].*)?|(?:\.?)env[-.](?:example|sample|template|defaults?)(?:[-.].*)?)$/i;
const MAX_SOURCE_FILES = 400;
const MAX_MIGRATION_PATHS = 20;

type PackageManifest = {
  path: string;
  directory: string;
  name?: string;
  dependencies: ReadonlySet<string>;
};

type NuxtConfigEvidence = {
  moduleActive: boolean;
  databaseEngine?: 'sqlite' | 'unknown';
  evidence: Citation[];
};

const directoryOf = (path: string): string => {
  const directory = posix.dirname(path);
  return directory === '' ? '.' : directory;
};

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

const propertyName = (property: ts.ObjectLiteralElementLike): string | undefined => {
  const name = property.name;
  return name !== undefined && (ts.isIdentifier(name) || ts.isStringLiteral(name)) ? name.text : undefined;
};

const singleProperty = (object: ts.ObjectLiteralExpression, name: string): ts.PropertyAssignment | undefined => {
  if (object.properties.some(ts.isSpreadAssignment)) return undefined;
  const matches = object.properties.filter(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) && propertyName(property) === name
  );
  return matches.length === 1 ? matches[0] : undefined;
};

const configObject = (path: string, raw: string): ts.ObjectLiteralExpression | undefined => {
  const scriptKind = /\.[cm]?js$/i.test(path) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const source = ts.createSourceFile(path, raw, ts.ScriptTarget.Latest, true, scriptKind);
  const diagnostics = (source as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
  if (diagnostics.length > 0) return undefined;
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

const inspectNuxtConfig = (path: string, raw: string): NuxtConfigEvidence => {
  const object = configObject(path, raw);
  if (object === undefined) return { moduleActive: false, evidence: [] };
  const modules = singleProperty(object, 'modules');
  const modulesValue = modules === undefined ? undefined : unwrap(modules.initializer);
  const moduleNames =
    modulesValue !== undefined && ts.isArrayLiteralExpression(modulesValue)
      ? modulesValue.elements.flatMap((element) => {
          const value = unwrap(element as ts.Expression);
          return ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value) ? [value.text] : [];
        })
      : [];
  const moduleActive = moduleNames.includes('@nuxthub/core');
  const moduleCitation = moduleActive
    ? citeFirstMatchOnly(path, raw, /['"]@nuxthub\/core['"]/, 'deploymentRequirements')
    : undefined;

  const hub = singleProperty(object, 'hub');
  const hubObject = hub === undefined ? undefined : unwrap(hub.initializer);
  const database =
    hubObject !== undefined && ts.isObjectLiteralExpression(hubObject) ? singleProperty(hubObject, 'db') : undefined;
  const databaseValue = database === undefined ? undefined : unwrap(database.initializer);
  const databaseEngine: NuxtConfigEvidence['databaseEngine'] =
    databaseValue !== undefined &&
    (ts.isStringLiteral(databaseValue) || ts.isNoSubstitutionTemplateLiteral(databaseValue))
      ? databaseValue.text.toLowerCase() === 'sqlite'
        ? 'sqlite'
        : 'unknown'
      : databaseValue === undefined || databaseValue.kind === ts.SyntaxKind.FalseKeyword
        ? undefined
        : 'unknown';
  const databaseCitation =
    databaseEngine === 'sqlite'
      ? citeFirstMatchOnly(path, raw, /\bdb\s*:\s*['"]sqlite['"]/, 'deploymentRequirements')
      : undefined;
  return {
    moduleActive,
    ...(databaseEngine === undefined ? {} : { databaseEngine }),
    evidence: [moduleCitation, databaseCitation].filter((citation): citation is Citation => citation !== undefined)
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
    // oxlint-disable-next-line no-await-in-loop -- bounded by the repository's root-level env templates.
    const result = await context.read(path);
    if (result.kind !== 'names-only') continue;
    for (const name of result.environmentVariableNames) names.add(name);
  }
  return names;
};

const providerKey = (value: string): string => value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

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
    const deploymentRequirements: NonNullable<ProbeOutput['deploymentRequirements']> = [];

    for (const manifest of manifests) {
      if (!manifest.dependencies.has('nuxt') || !manifest.dependencies.has('@nuxthub/core')) continue;
      const configPath = context.files.find(
        (path) => directoryOf(path) === manifest.directory && NUXT_CONFIG.test(posix.basename(path))
      );
      // oxlint-disable-next-line no-await-in-loop -- one bounded config read per candidate Nuxt package.
      const configRaw = configPath === undefined ? undefined : await readText(context, configPath, { fullFile: true });
      const config =
        configPath === undefined || configRaw === undefined
          ? { moduleActive: false, evidence: [] }
          : inspectNuxtConfig(configPath, configRaw);

      const sourcePaths = context.files
        .filter(
          (path) =>
            owns(manifest, path) &&
            SOURCE_FILE.test(path) &&
            !path.endsWith('.d.ts') &&
            !isNonProductionFixturePath(path) &&
            path !== configPath
        )
        .slice(0, MAX_SOURCE_FILES);
      const bindings = new Set<'database' | 'blob' | 'kv' | 'cache'>();
      const bindingEvidence: Citation[] = [];
      const oauthProviders = new Map<string, Citation>();
      let sessionEvidence: Citation | undefined;

      for (const path of sourcePaths) {
        // oxlint-disable-next-line no-await-in-loop -- deterministic and bounded source scan.
        const raw = await readText(context, path, { fullFile: true });
        if (raw === undefined) continue;
        for (const match of raw.matchAll(/(?:from\s*|import\s*\(\s*)['"]hub:(db|blob|kv|cache)['"]/g)) {
          const binding = ({ db: 'database', blob: 'blob', kv: 'kv', cache: 'cache' } as const)[
            match[1] as 'db' | 'blob' | 'kv' | 'cache'
          ];
          bindings.add(binding);
          if (bindingEvidence.length < 4) {
            const citation = citeFirstMatchOnly(path, raw, new RegExp(`hub:${match[1]}`), 'deploymentRequirements');
            if (citation !== undefined) bindingEvidence.push(citation);
          }
        }
        if (manifest.dependencies.has('nuxt-auth-utils')) {
          if (sessionEvidence === undefined && /\b(?:set|get|clear|require)UserSession\s*\(/.test(raw)) {
            sessionEvidence = citeFirstMatchOnly(
              path,
              raw,
              /\b(?:set|get|clear|require)UserSession\s*\(/,
              'environmentVariables'
            );
          }
          for (const match of raw.matchAll(/\bdefineOAuth([A-Za-z0-9]+)EventHandler\s*\(/g)) {
            const provider = match[1];
            if (provider === undefined || oauthProviders.has(providerKey(provider))) continue;
            const citation = citeFirstMatchOnly(
              path,
              raw,
              new RegExp(`defineOAuth${provider}EventHandler\\s*\\(`),
              'environmentVariables'
            );
            if (citation !== undefined) oauthProviders.set(providerKey(provider), citation);
          }
        }
      }

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
        if (evidence === undefined) continue;
        environmentVariables.push({
          name,
          role: 'third-party-secret',
          required: true,
          evidence: [evidence]
        });
      }
      if (environmentVariables.length > 0) {
        serviceEnvironments.push({ path: manifest.directory, environmentVariables });
      }

      if (bindings.size === 0) continue;
      const migrationPrefix = manifest.directory === '.' ? '' : `${manifest.directory}/`;
      const migrationPaths = bindings.has('database')
        ? context.files
            .filter((path) => {
              if (!owns(manifest, path) || isNonProductionFixturePath(path)) return false;
              const relative = path.slice(migrationPrefix.length);
              return /^server\/(?:db|database)\/migrations\/(?:[^/]+\/)*[^/]+\.sql$/i.test(relative);
            })
            .toSorted()
            .slice(0, MAX_MIGRATION_PATHS)
        : [];
      // oxlint-disable-next-line no-await-in-loop -- one safe package-manifest citation per emitted requirement.
      const manifestRaw = await context.readPrivileged(manifest.path);
      const packageCitation =
        manifestRaw === null
          ? undefined
          : citeFirstMatchOnly(manifest.path, manifestRaw, /"@nuxthub\/core"/, 'deploymentRequirements');
      deploymentRequirements.push({
        kind: 'framework-runtime-bindings',
        serviceName,
        provider: 'nuxthub',
        bindings: [...bindings],
        ...(config.databaseEngine === undefined ? {} : { databaseEngine: config.databaseEngine }),
        migrationPaths,
        evidence: [packageCitation, ...config.evidence, ...bindingEvidence]
          .filter((citation): citation is Citation => citation !== undefined)
          .slice(0, 6)
      });
    }

    return {
      ...(serviceEnvironments.length === 0 ? {} : { serviceEnvironments }),
      ...(deploymentRequirements.length === 0 ? {} : { deploymentRequirements })
    };
  }
};
