/**
 * What the package manifests say.
 *
 * The densest deterministic signal in a JavaScript repository, and the one that most reduces what
 * the agent has to work out for itself: which package manager, whether this is a workspace, what
 * each package is called, how it builds and starts, which runtime it declares, and — from its
 * declared dependencies — what backing services it talks to.
 *
 * Everything here is read out of a file, never inferred from a name. A directory called `api` is
 * not evidence of anything; a dependency on `express` is.
 */

import { posix } from 'node:path';
import * as ts from 'typescript';
import type { Citation } from '../../facts/citation';
import { defaultDependencyName, type DependencyFact, type DependencyKind } from '../../facts/dependency';
import type { MigrationFact, PackageManager } from '../../facts/project-facts';
import type { ServiceFactInput } from '../../facts/service';
import {
  goCodeWithoutComments,
  goExecutableCode,
  goFileMatchesBuildTarget,
  goHasMainFunction,
  goImports
} from '../go-source';
import { isNonProductionFixturePath } from '../deployment-relevance';
import { citeFirstMatchOnly, citeLine, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
import {
  frameworkBuildCommand,
  frameworkDevCommand,
  frameworkStartCommand,
  hasStartFrameworkProductionCommand,
  inspectFrameworkConfig,
  type FrameworkConfigEvidence
} from './manifest-framework-evidence';
import { safeMigrationClauseOf } from './procfile';

/**
 * Declared dependencies that imply a backing service.
 *
 * Matched against the exact package name, not a substring, so `redis-mock` and `eslint-plugin-n`
 * do not produce infrastructure. The right-hand side is what the package *proves* — `bullmq`
 * proves Redis, not SQS; replacing one queue protocol with another produces infrastructure the
 * application cannot use.
 */
const DEPENDENCY_SIGNALS: ReadonlyArray<{
  packages: readonly string[];
  kinds: readonly DependencyKind[];
}> = [
  {
    packages: ['pg', 'postgres', 'pg-promise', 'postgres.js', '@vercel/postgres'],
    kinds: ['postgres']
  },
  { packages: ['mysql', 'mysql2', 'mariadb'], kinds: ['mysql'] },
  { packages: ['mssql', 'tedious'], kinds: ['mssql'] },
  { packages: ['mongoose', 'mongodb'], kinds: ['mongodb'] },
  { packages: ['better-sqlite3', 'sqlite3', 'node:sqlite'], kinds: ['sqlite'] },
  { packages: ['redis', 'ioredis', '@upstash/redis'], kinds: ['redis'] },
  { packages: ['bullmq', 'bull', 'bee-queue'], kinds: ['redis'] },
  { packages: ['@aws-sdk/client-sqs'], kinds: ['queue'] },
  { packages: ['@aws-sdk/client-sns'], kinds: ['topic'] },
  {
    packages: ['@aws-sdk/client-s3', 'minio', 'aws-sdk'],
    kinds: ['object-storage']
  },
  {
    packages: ['@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb', 'dynamoose'],
    kinds: ['dynamodb']
  },
  {
    packages: ['@elastic/elasticsearch', '@opensearch-project/opensearch', 'meilisearch', 'typesense'],
    kinds: ['search']
  },
  {
    packages: ['nodemailer', 'resend', '@sendgrid/mail', '@aws-sdk/client-ses', 'postmark'],
    kinds: ['email']
  },
  { packages: ['kafkajs', '@confluentinc/kafka-javascript'], kinds: ['kafka'] },
  { packages: ['nats', '@nats-io/transport-node'], kinds: ['nats'] }
];

/** Dependencies that prove the package serves HTTP. */
const HTTP_FRAMEWORKS: ReadonlySet<string> = new Set([
  '@hapi/hapi',
  '@nestjs/platform-express',
  '@nestjs/platform-fastify',
  'astro',
  'express',
  'fastify',
  'h3',
  'hono',
  'koa',
  'next',
  'nuxt',
  'polka',
  'remix',
  '@remix-run/node',
  '@remix-run/serve',
  'restify',
  'sveltekit',
  '@sveltejs/kit',
  '@solidjs/start',
  '@tanstack/start',
  '@tanstack/react-start',
  '@tanstack/solid-start',
  '@tanstack/vue-start'
]);

type LiteralProperty = { value: ts.Expression; keyStart: number };

const unwrapConfigObject = (expression: ts.Expression): ts.Expression => {
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isAsExpression(expression)
  ) {
    return unwrapConfigObject(expression.expression);
  }
  return expression;
};

/**
 * Read only direct literal properties from a parse-clean React Router config.
 *
 * The TypeScript parser supplies the lexical boundaries, escape decoding, and object structure.
 * This keeps repository code inert and deliberately fails closed when a dynamic member could
 * override relevant evidence. Unrelated named methods and shorthand properties are safe to ignore.
 */
const exportedObjectProperties = (file: string, source: string): ReadonlyMap<string, LiteralProperty> => {
  const scriptKind =
    file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs') ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind);
  const parseDiagnostics = (sourceFile as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] })
    .parseDiagnostics;
  if (parseDiagnostics.length > 0) return new Map();

  const exports = sourceFile.statements.filter(
    (statement): statement is ts.ExportAssignment => ts.isExportAssignment(statement) && !statement.isExportEquals
  );
  if (exports.length !== 1) return new Map();
  const config = unwrapConfigObject(exports[0]!.expression);
  if (!ts.isObjectLiteralExpression(config)) return new Map();

  const properties = new Map<string, LiteralProperty>();
  for (const property of config.properties) {
    if (ts.isSpreadAssignment(property)) return new Map();
    const name = property.name;
    if (ts.isComputedPropertyName(name)) return new Map();
    if (!ts.isIdentifier(name) && !ts.isStringLiteral(name)) continue;

    if (name.text === 'buildEnd') return new Map();
    if (name.text === 'presets') {
      if (
        ts.isPropertyAssignment(property) &&
        ts.isArrayLiteralExpression(property.initializer) &&
        property.initializer.elements.length === 0
      ) {
        continue;
      }
      return new Map();
    }
    if (name.text !== 'ssr' && name.text !== 'buildDirectory') continue;
    if (!ts.isPropertyAssignment(property)) return new Map();
    if (
      (name.text === 'ssr' &&
        property.initializer.kind !== ts.SyntaxKind.FalseKeyword &&
        property.initializer.kind !== ts.SyntaxKind.TrueKeyword) ||
      (name.text === 'buildDirectory' && !ts.isStringLiteral(property.initializer))
    ) {
      return new Map();
    }
    properties.set(name.text, { value: property.initializer, keyStart: name.getStart(sourceFile) });
  }
  return properties;
};

const configCitation = (file: string, source: string, property: LiteralProperty): Citation => {
  const lines = source.split(/\r?\n/);
  const line = source.slice(0, property.keyStart).split(/\r?\n/).length - 1;
  return citeLine(file, lines, line, 'servesStaticAssets');
};

const safeBuildDirectory = (value: string): string | undefined => {
  const normalized = value === './' ? '.' : value.replace(/^\.\//, '').replace(/\/+$/, '');
  const segments = normalized.split('/');
  const containsInvalidCharacter = [...normalized].some((character) => {
    const codePoint = character.codePointAt(0)!;
    return codePoint <= 0x1f || codePoint === 0x7f || '<>:"|?*'.includes(character);
  });
  if (
    normalized === '' ||
    normalized.startsWith('/') ||
    normalized.includes('\\') ||
    normalized.includes('//') ||
    containsInvalidCharacter ||
    segments.includes('..') ||
    segments.some(
      (segment) =>
        (segment !== '.' && /[ .]$/.test(segment)) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment)
    )
  ) {
    return undefined;
  }
  const meaningfulSegments = segments.filter((segment) => segment !== '' && segment !== '.');
  return meaningfulSegments.join('/') || '.';
};

/** Frameworks worth naming, because the composer has dedicated handling for several of them. */
const FRAMEWORK_NAMES: ReadonlyArray<{ package: string; name: string }> = [
  { package: 'next', name: 'nextjs' },
  { package: 'nuxt', name: 'nuxt' },
  { package: '@sveltejs/kit', name: 'sveltekit' },
  { package: 'astro', name: 'astro' },
  { package: '@remix-run/node', name: 'remix' },
  { package: '@react-router/dev', name: 'react-router' },
  { package: 'react-router', name: 'react-router' },
  { package: '@react-router/node', name: 'react-router' },
  { package: '@react-router/express', name: 'react-router' },
  { package: '@react-router/serve', name: 'react-router' },
  { package: 'react-router-dom', name: 'react-router' },
  { package: '@solidjs/start', name: 'solid-start' },
  { package: '@tanstack/react-start', name: 'tanstack-start' },
  { package: '@tanstack/solid-start', name: 'tanstack-start' },
  { package: '@tanstack/vue-start', name: 'tanstack-start' },
  { package: '@tanstack/start', name: 'tanstack-start' },
  { package: '@nestjs/core', name: 'nestjs' },
  { package: 'express', name: 'express' },
  { package: 'fastify', name: 'fastify' },
  { package: 'hono', name: 'hono' },
  { package: 'koa', name: 'koa' }
];
type ViteBuildDirectory =
  | { kind: 'known'; outputDirectory: string; evidence: Citation[] }
  | { kind: 'default' }
  | { kind: 'unknown' };

const propertyName = (property: ts.ObjectLiteralElementLike): string | undefined => {
  const name = property.name;
  return name !== undefined && (ts.isIdentifier(name) || ts.isStringLiteral(name)) ? name.text : undefined;
};

type ResolvedViteConfig = {
  file: string;
  source: string;
  sourceFile: ts.SourceFile;
  config: ts.ObjectLiteralExpression;
};

const configScriptKind = (file: string): ts.ScriptKind =>
  file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs') ? ts.ScriptKind.JS : ts.ScriptKind.TS;

const localConfigFile = (from: string, specifier: string, files: readonly string[]): string | undefined => {
  if (!specifier.startsWith('.')) return undefined;
  const base = posix.normalize(posix.join(posix.dirname(from), specifier));
  if (base === '..' || base.startsWith('../')) return undefined;
  const candidates = [
    base,
    ...['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs'].map((extension) => `${base}${extension}`),
    ...['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs'].map((extension) => `${base}/index${extension}`)
  ];
  return candidates.find((candidate) => files.includes(candidate));
};

const viteConfigObject = async ({
  file,
  context,
  exportName = 'default',
  visited = new Set<string>()
}: {
  file: string;
  context: ProbeContext;
  exportName?: string;
  visited?: Set<string>;
}): Promise<ResolvedViteConfig | undefined> => {
  const visitKey = `${file}:${exportName}`;
  if (visited.has(visitKey) || visited.size >= 12) return undefined;
  visited.add(visitKey);
  const source = await readText(context, file, { fullFile: true });
  if (source === undefined) return undefined;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, configScriptKind(file));
  const parseDiagnostics = (sourceFile as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] })
    .parseDiagnostics;
  if (parseDiagnostics.length > 0) return undefined;

  let expression: ts.Expression | undefined;
  if (exportName === 'default') {
    const exports = sourceFile.statements.filter(
      (statement): statement is ts.ExportAssignment => ts.isExportAssignment(statement) && !statement.isExportEquals
    );
    if (exports.length !== 1) return undefined;
    expression = exports[0]!.expression;
  } else {
    const declarations = sourceFile.statements
      .filter(ts.isVariableStatement)
      .filter((statement) => statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
      .flatMap((statement) => statement.declarationList.declarations)
      .filter(
        (declaration) =>
          ts.isIdentifier(declaration.name) && declaration.name.text === exportName && declaration.initializer
      );
    if (declarations.length !== 1) return undefined;
    expression = declarations[0]!.initializer;
  }

  const resolveExpression = async (candidate: ts.Expression): Promise<ResolvedViteConfig | undefined> => {
    let resolved = unwrapConfigObject(candidate);
    if (
      ts.isCallExpression(resolved) &&
      ts.isIdentifier(resolved.expression) &&
      resolved.expression.text === 'defineConfig' &&
      resolved.arguments.length === 1
    ) {
      resolved = unwrapConfigObject(resolved.arguments[0]!);
    }
    if (ts.isArrowFunction(resolved)) {
      if (ts.isBlock(resolved.body)) {
        const returns = resolved.body.statements.filter(ts.isReturnStatement);
        if (returns.length !== 1 || returns[0]!.expression === undefined) return undefined;
        resolved = unwrapConfigObject(returns[0]!.expression);
      } else {
        resolved = unwrapConfigObject(resolved.body);
      }
    }
    if (ts.isObjectLiteralExpression(resolved)) return { file, source, sourceFile, config: resolved };
    if (!ts.isIdentifier(resolved)) return undefined;

    const localDeclarations = sourceFile.statements
      .filter(ts.isVariableStatement)
      .flatMap((statement) => statement.declarationList.declarations)
      .filter(
        (declaration) =>
          ts.isIdentifier(declaration.name) && declaration.name.text === resolved.text && declaration.initializer
      );
    if (localDeclarations.length === 1) return resolveExpression(localDeclarations[0]!.initializer!);

    for (const declaration of sourceFile.statements.filter(ts.isImportDeclaration)) {
      if (!ts.isStringLiteral(declaration.moduleSpecifier) || declaration.importClause === undefined) continue;
      const target = localConfigFile(file, declaration.moduleSpecifier.text, context.files);
      if (target === undefined) continue;
      if (declaration.importClause.name?.text === resolved.text) {
        return viteConfigObject({ file: target, context, visited, exportName: 'default' });
      }
      const bindings = declaration.importClause.namedBindings;
      if (bindings !== undefined && ts.isNamedImports(bindings)) {
        const imported = bindings.elements.find((element) => element.name.text === resolved.text);
        if (imported !== undefined) {
          return viteConfigObject({
            file: target,
            context,
            visited,
            exportName: imported.propertyName?.text ?? imported.name.text
          });
        }
      }
    }
    return undefined;
  };
  return expression === undefined ? undefined : resolveExpression(expression);
};

const viteBuildOptions = (
  manifest: ParsedManifest
): { outDir?: string; config?: string; invalid?: boolean; evidence?: Citation } => {
  const command = manifest.scripts.build;
  if (typeof command !== 'string') return {};
  const tokens = command.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s]+/g) ?? [];
  const vite = tokens.findIndex((token, index) => /^(?:vite|vite\.cmd)$/.test(token) && tokens[index + 1] === 'build');
  if (vite < 0) return {};
  const result: { outDir?: string; config?: string; invalid?: boolean; evidence?: Citation } = {};
  for (let index = vite + 2; index < tokens.length; index += 1) {
    const token = tokens[index]!.replace(/^(?:"|')|(?:"|')$/g, '');
    const assignment = /^--(outDir|config)=(.+)$/.exec(token);
    const option = assignment?.[1] ?? (/^--(?:outDir|config)$/.test(token) ? token.slice(2) : undefined);
    if (option === undefined) continue;
    const value = assignment?.[2] ?? tokens[++index]?.replace(/^(?:"|')|(?:"|')$/g, '');
    if (value === undefined || value === '' || value.includes('$') || /[;&|]/.test(value)) return { invalid: true };
    if (option === 'outDir') result.outDir = value;
    else result.config = value;
  }
  const evidence = citeFirstMatchOnly(manifest.path, manifest.raw, /"build"\s*:/, 'servesStaticAssets');
  return { ...result, ...(evidence === undefined ? {} : { evidence }) };
};
/** Read Vite's literal output directory without executing its configuration module. */
const viteBuildDirectory = async (manifest: ParsedManifest, context: ProbeContext): Promise<ViteBuildDirectory> => {
  const options = viteBuildOptions(manifest);
  if (options.invalid) return { kind: 'unknown' };
  if (options.outDir !== undefined) {
    const outputDirectory = safeBuildDirectory(options.outDir);
    return outputDirectory === undefined
      ? { kind: 'unknown' }
      : { kind: 'known', outputDirectory, evidence: options.evidence === undefined ? [] : [options.evidence] };
  }
  const manifestDirectory = manifest.directory;
  const prefix = manifestDirectory === '.' ? '' : `${manifestDirectory}/`;
  const explicitConfig =
    options.config === undefined
      ? undefined
      : resolveRepositoryPath(manifestDirectory, options.config.replace(/^\.\//, ''));
  if (options.config !== undefined && (explicitConfig === undefined || !context.files.includes(explicitConfig))) {
    return { kind: 'unknown' };
  }
  const file =
    explicitConfig ??
    ['vite.config.ts', 'vite.config.js', 'vite.config.mts', 'vite.config.mjs', 'vite.config.cts', 'vite.config.cjs']
      .map((name) => `${prefix}${name}`)
      .find((candidate) => context.files.includes(candidate));
  if (file === undefined) return { kind: 'default' };
  const resolved = await viteConfigObject({ file, context });
  if (resolved === undefined) return { kind: 'unknown' };
  const { config, source, sourceFile } = resolved;
  const buildProperties = config.properties.filter((property) => propertyName(property) === 'build');
  if (buildProperties.length === 0) {
    // A spread can supply `build.outDir`; calling that the default `dist` would be invented output.
    return config.properties.some(
      (property) =>
        ts.isSpreadAssignment(property) || (property.name !== undefined && propertyName(property) === undefined)
    )
      ? { kind: 'unknown' }
      : { kind: 'default' };
  }
  if (buildProperties.length !== 1 || !ts.isPropertyAssignment(buildProperties[0]!)) return { kind: 'unknown' };
  const buildIndex = config.properties.indexOf(buildProperties[0]!);
  // Object spread is ordered. `{ build: { outDir: "known" }, ...runtime }` can replace the entire
  // build object, while a spread before the explicit build property cannot. Dynamic computed keys
  // after it are equally capable of being `build`, so fail closed for those too.
  if (
    config.properties
      .slice(buildIndex + 1)
      .some(
        (property) =>
          ts.isSpreadAssignment(property) || (property.name !== undefined && propertyName(property) === undefined)
      )
  ) {
    return { kind: 'unknown' };
  }
  const build = unwrapConfigObject(buildProperties[0]!.initializer);
  if (!ts.isObjectLiteralExpression(build) || build.properties.some(ts.isSpreadAssignment)) return { kind: 'unknown' };
  const outputProperties = build.properties.filter((property) => propertyName(property) === 'outDir');
  if (outputProperties.length === 0) return { kind: 'default' };
  if (outputProperties.length !== 1 || !ts.isPropertyAssignment(outputProperties[0]!)) return { kind: 'unknown' };
  const output = unwrapConfigObject(outputProperties[0]!.initializer);
  if (!ts.isStringLiteral(output)) return { kind: 'unknown' };
  const outputDirectory = safeBuildDirectory(output.text);
  if (outputDirectory === undefined) return { kind: 'unknown' };
  return {
    kind: 'known',
    outputDirectory,
    evidence: [
      configCitation(resolved.file, source, {
        value: output,
        keyStart: outputProperties[0]!.name!.getStart(sourceFile)
      })
    ]
  };
};

/** Build-only browser frameworks that produce a directory for `hosting-bucket`. */
const staticSiteFor = async (
  manifest: ParsedManifest,
  context: ProbeContext
): Promise<
  | {
      framework: 'angular' | 'gatsby' | 'react' | 'vite' | 'vue' | 'react-router';
      outputDirectory: string;
      evidence?: Citation[];
    }
  | undefined
> => {
  const dirPrefix = manifest.directory === '.' ? '' : `${manifest.directory}/`;

  // React Router SPA mode: configured via ssr: false in react-router.config.*
  const rrConfigFile = context.files.find(
    (file) =>
      file === `${dirPrefix}react-router.config.ts` ||
      file === `${dirPrefix}react-router.config.js` ||
      file === `${dirPrefix}react-router.config.mjs` ||
      file === `${dirPrefix}react-router.config.cjs`
  );
  if (rrConfigFile !== undefined) {
    const configText = await readText(context, rrConfigFile);
    if (configText !== undefined) {
      const properties = exportedObjectProperties(rrConfigFile, configText);
      const ssr = properties.get('ssr');
      if (ssr !== undefined && ssr.value.kind === ts.SyntaxKind.FalseKeyword) {
        const configuredBuildDirectory = properties.get('buildDirectory');
        const buildDirectory =
          configuredBuildDirectory === undefined
            ? 'build'
            : ts.isStringLiteral(configuredBuildDirectory.value)
              ? safeBuildDirectory(configuredBuildDirectory.value.text)
              : undefined;
        if (buildDirectory === undefined) return undefined;
        return {
          framework: 'react-router',
          outputDirectory: buildDirectory === '.' ? 'client' : `${buildDirectory}/client`,
          evidence: [
            configCitation(rrConfigFile, configText, ssr),
            ...(configuredBuildDirectory === undefined
              ? []
              : [configCitation(rrConfigFile, configText, configuredBuildDirectory)])
          ]
        };
      }
    }
  }

  if (manifest.dependencies['@angular/core'] !== undefined) {
    return {
      framework: 'angular',
      outputDirectory: `dist/${manifest.name?.replace(/^@[^/]+\//, '') ?? serviceNameFor(manifest)}`
    };
  }
  if (manifest.dependencies.gatsby !== undefined) return { framework: 'gatsby', outputDirectory: 'public' };
  if (manifest.dependencies['react-scripts'] !== undefined) return { framework: 'react', outputDirectory: 'build' };
  const viteEntrypoints = (
    manifest.directory === '.' ? ['index.html', 'src/index.html'] : ['index.html', 'src/index.html']
  ).map((path) => (manifest.directory === '.' ? path : `${manifest.directory}/${path}`));
  if (manifest.dependencies.vite !== undefined && viteEntrypoints.some((path) => context.files.includes(path))) {
    const configuredOutput = await viteBuildDirectory(manifest, context);
    if (configuredOutput.kind === 'unknown') return undefined;
    return {
      framework:
        manifest.dependencies.vue !== undefined ? 'vue' : manifest.dependencies.react !== undefined ? 'react' : 'vite',
      outputDirectory: configuredOutput.kind === 'known' ? configuredOutput.outputDirectory : 'dist',
      ...(configuredOutput.kind === 'known' ? { evidence: configuredOutput.evidence } : {})
    };
  }
  return undefined;
};

const MIGRATION_TOOLS: ReadonlyArray<{
  package: string;
  tool: string;
  command: string;
}> = [
  { package: 'prisma', tool: 'prisma', command: 'npx prisma migrate deploy' },
  {
    package: 'drizzle-kit',
    tool: 'drizzle',
    command: 'npx drizzle-kit migrate'
  },
  { package: 'typeorm', tool: 'typeorm', command: 'npx typeorm migration:run' },
  { package: 'knex', tool: 'knex', command: 'npx knex migrate:latest' },
  {
    package: 'sequelize-cli',
    tool: 'sequelize',
    command: 'npx sequelize-cli db:migrate'
  }
];

const BUILD_ONLY_SCRIPT_NAMES = ['build:ci', 'build-ci', 'vercel-build'] as const;
const LOCAL_NODE_MIGRATION_BINARY = /^(?:prisma|drizzle-kit|knex|sequelize(?:-cli)?|typeorm)\s/;

/**
 * Some PaaS-oriented projects mutate their database inside `build`, which cannot work while
 * Stacktape is creating an artifact before the database exists. When the project also provides an
 * explicit build-only script, preserve that script for packaging and move the one source-authored
 * migration clause to the deploy hook. Without both pieces of evidence, leave the original build
 * untouched rather than guessing how to rewrite an arbitrary shell chain.
 */
const buildPlanFor = (
  manifest: ParsedManifest
): { scriptName: string; migrationCommand?: string; migrationTool?: string; migrationQuote?: string } => {
  const build = manifest.scripts.build;
  if (typeof build !== 'string') return { scriptName: 'build' };
  const installedMigrationTools = MIGRATION_TOOLS.filter((tool) => manifest.dependencies[tool.package] !== undefined);
  if (installedMigrationTools.length !== 1) return { scriptName: 'build' };

  const migrationQuote = safeMigrationClauseOf(build);
  if (migrationQuote === undefined) return { scriptName: 'build' };
  const scriptName = BUILD_ONLY_SCRIPT_NAMES.find((candidate) => {
    const command = manifest.scripts[candidate];
    return typeof command === 'string' && command.trim() !== '' && safeMigrationClauseOf(command) === undefined;
  });
  if (scriptName === undefined) return { scriptName: 'build' };

  return {
    scriptName,
    migrationTool: installedMigrationTools[0]!.tool,
    migrationQuote,
    migrationCommand: LOCAL_NODE_MIGRATION_BINARY.test(migrationQuote) ? `npx ${migrationQuote}` : migrationQuote
  };
};

const LOCK_FILE_TO_MANAGER: ReadonlyArray<{
  file: string;
  manager: PackageManager;
}> = [
  { file: 'bun.lock', manager: 'bun' },
  { file: 'bun.lockb', manager: 'bun' },
  { file: 'pnpm-lock.yaml', manager: 'pnpm' },
  { file: 'yarn.lock', manager: 'yarn' },
  { file: 'package-lock.json', manager: 'npm' }
];

type ParsedManifest = {
  path: string;
  directory: string;
  raw: string;
  name?: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  workspaces?: string[];
  engines?: Record<string, string>;
  private?: boolean;
};

const parseManifest = (path: string, raw: string): ParsedManifest | undefined => {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return undefined;
  }
  const workspacesField = parsed.workspaces;
  const workspaces = Array.isArray(workspacesField)
    ? workspacesField.filter((entry): entry is string => typeof entry === 'string')
    : Array.isArray((workspacesField as { packages?: unknown })?.packages)
      ? ((workspacesField as { packages: unknown[] }).packages.filter(
          (entry): entry is string => typeof entry === 'string'
        ) as string[])
      : undefined;

  const directory = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '.';

  return {
    path,
    directory,
    raw,
    ...(typeof parsed.name === 'string' ? { name: parsed.name } : {}),
    scripts: (parsed.scripts ?? {}) as Record<string, string>,
    dependencies: {
      ...((parsed.dependencies ?? {}) as Record<string, string>),
      ...((parsed.devDependencies ?? {}) as Record<string, string>)
    },
    ...(workspaces === undefined ? {} : { workspaces }),
    ...(parsed.engines === undefined ? {} : { engines: parsed.engines as Record<string, string> }),
    ...(typeof parsed.private === 'boolean' ? { private: parsed.private } : {})
  };
};

type GoStaticConsumer = {
  sources: Array<{ path: string; raw: string }>;
  embeddedPaths: Set<string>;
  makefile?: string;
};

const pathWithin = (path: string, root: string): boolean =>
  root === '.' || path === root || path.startsWith(`${root}/`);

const resolveRepositoryPath = (base: string, value: string): string | undefined => {
  if (value.startsWith('/') || value.includes('$') || value.includes('*')) return undefined;
  const resolved = posix.normalize(posix.join(base, value));
  return resolved === '..' || resolved.startsWith('../') ? undefined : resolved;
};

const makefileVariables = (raw: string): ReadonlyMap<string, string> => {
  const variables = new Map<string, string>();
  const unfolded = raw.replace(/\\\r?\n/g, ' ');
  for (const match of unfolded.matchAll(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?::|\?|\+)?=\s*([^\r\n#]*)/gm)) {
    variables.set(match[1]!, match[2]!.trim());
  }
  return variables;
};

const expandMakeValue = (value: string, variables: ReadonlyMap<string, string>): string | undefined => {
  let expanded = value;
  for (let depth = 0; depth < 12; depth += 1) {
    let replaced = false;
    expanded = expanded.replace(/\$\(([A-Za-z_][A-Za-z0-9_]*)\)|\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, round, brace) => {
      const replacement = variables.get((round ?? brace) as string);
      if (replacement === undefined) return `$(${round ?? brace})`;
      replaced = true;
      return replacement;
    });
    if (!replaced) break;
  }
  return expanded.includes('$') ? undefined : expanded.trim();
};

const makeRecipeCommands = (block: string): string[] => {
  const commands: string[] = [];
  let current = '';
  for (const line of block.split(/\r?\n/).slice(1)) {
    if (!line.startsWith('\t')) continue;
    const fragment = line.replace(/^\t[-@+]?\s*/, '');
    current = current === '' ? fragment : `${current} ${fragment}`;
    if (/\\\s*$/.test(current)) {
      current = current.replace(/\\\s*$/, '');
      continue;
    }
    if (current.trim() !== '') commands.push(current.trim());
    current = '';
  }
  if (current.trim() !== '') commands.push(current.trim());
  return commands;
};

const shellChain = (command: string): string[] => {
  const segments: string[] = [];
  let current = '';
  let quote: "'" | '"' | undefined;
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index]!;
    if (quote !== undefined) {
      current += character;
      if (character === quote && command[index - 1] !== '\\') quote = undefined;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      current += character;
      continue;
    }
    if (character === '|') return [];
    const pair = command.slice(index, index + 2);
    if (character === ';' || pair === '&&' || pair === '||') {
      if (current.trim() !== '') segments.push(current.trim());
      current = '';
      if (pair === '&&' || pair === '||') index += 1;
      continue;
    }
    current += character;
  }
  if (current.trim() !== '') segments.push(current.trim());
  return segments;
};

const makePath = ({
  cwd,
  raw,
  variables
}: {
  cwd: string;
  raw: string;
  variables: ReadonlyMap<string, string>;
}): string | undefined => {
  const expanded = expandMakeValue(raw.replace(/^(?:"|')|(?:"|')$/g, ''), variables)?.replace(/\/\*+$/, '');
  return expanded === undefined ? undefined : resolveRepositoryPath(cwd, expanded);
};

const pathIsConsumed = (path: string, consumedPaths: ReadonlySet<string>): boolean =>
  [...consumedPaths].some((consumed) => path === consumed || path.startsWith(`${consumed}/`));

const readGoStaticConsumer = async (root: string, context: ProbeContext): Promise<GoStaticConsumer> => {
  const paths = context.files
    .filter(
      (path) =>
        path.endsWith('.go') &&
        pathWithin(path, root) &&
        !path.endsWith('_test.go') &&
        !/(?:^|\/)(?:vendor|examples?|tools?|test|tests|fixtures)(?:\/|$)/i.test(path)
    )
    .slice(0, 500);
  const allSources = (
    await Promise.all(
      paths.map(async (path) => {
        const raw = await readText(context, path, { fullFile: true });
        return raw === undefined || !goFileMatchesBuildTarget(path, raw) ? undefined : { path, raw };
      })
    )
  ).filter((source): source is { path: string; raw: string } => source !== undefined);
  const goModPath = root === '.' ? 'go.mod' : `${root}/go.mod`;
  const goMod = context.files.includes(goModPath) ? await readText(context, goModPath, { fullFile: true }) : undefined;
  const modulePath = goMod === undefined ? undefined : /^\s*module\s+(\S+)\s*$/m.exec(goMod)?.[1];
  const byDirectory = new Map<string, Array<{ path: string; raw: string }>>();
  for (const source of allSources) {
    const directory = posix.dirname(source.path);
    const entries = byDirectory.get(directory) ?? [];
    entries.push(source);
    byDirectory.set(directory, entries);
  }
  const pending = [...byDirectory.entries()]
    .filter(([, entries]) =>
      entries.some(({ raw }) => /^\s*package\s+main\b/m.test(goExecutableCode(raw)) && goHasMainFunction(raw))
    )
    .map(([directory]) => directory);
  const reachable = new Set<string>();
  while (pending.length > 0) {
    const directory = pending.shift()!;
    if (reachable.has(directory)) continue;
    reachable.add(directory);
    if (modulePath === undefined) continue;
    for (const { raw } of byDirectory.get(directory) ?? []) {
      for (const imported of goImports(raw)) {
        if (imported.path !== modulePath && !imported.path.startsWith(`${modulePath}/`)) continue;
        const relative = imported.path === modulePath ? '.' : imported.path.slice(modulePath.length + 1);
        const target = root === '.' ? relative : posix.join(root, relative);
        if (byDirectory.has(target) && !reachable.has(target)) pending.push(target);
      }
    }
  }
  const sources = allSources.filter((source) => reachable.has(posix.dirname(source.path)));
  const embeddedPaths = new Set<string>();
  for (const { path, raw } of sources) {
    for (const match of raw.matchAll(/^\s*\/\/go:embed\s+([^\r\n]+)$/gm)) {
      for (const token of (match[1] ?? '').match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+/g) ?? []) {
        const unquoted = token.replace(/^(?:"|')|(?:"|')$/g, '').replace(/^all:/, '');
        const resolved = resolveRepositoryPath(posix.dirname(path), unquoted);
        if (resolved !== undefined) embeddedPaths.add(resolved);
      }
    }
  }
  const makefilePath = root === '.' ? 'Makefile' : `${root}/Makefile`;
  const makefile = context.files.includes(makefilePath)
    ? await readText(context, makefilePath, { fullFile: true })
    : undefined;
  return { sources, embeddedPaths, ...(makefile === undefined ? {} : { makefile }) };
};

const makefileMovesOutputInto = ({
  raw,
  outputPath,
  consumedPaths
}: {
  raw: string;
  outputPath: string;
  consumedPaths: ReadonlySet<string>;
}): boolean => {
  const variables = makefileVariables(raw);
  const oneShell = /^\s*\.ONESHELL\s*:/m.test(raw);
  // A target and one physical recipe shell are the useful boundaries. `cd web && build` affects
  // that chain, but Make starts the next recipe line at the repository root. Reading the commands
  // in order also prevents a later `cd legacy` from retroactively owning an earlier root-relative
  // `mv web/dist server/site`.
  const blocks = raw.split(/(?=^[^\s#][^\r\n]*:(?![=]))/gm);
  for (const block of blocks) {
    let persistentCwd = '.';
    for (const recipe of makeRecipeCommands(block)) {
      let cwd = oneShell ? persistentCwd : '.';
      for (const command of shellChain(recipe)) {
        const cd = /^cd\s+([^\s]+)\s*$/.exec(command);
        if (cd !== null) {
          cwd = makePath({ cwd, raw: cd[1]!, variables }) ?? cwd;
          continue;
        }
        const move = /\b(?:mv|cp)(?:\s+-[A-Za-z]+)*\s+([^\s]+)\s+([^\s]+)/.exec(command);
        if (move === null) continue;
        const source = makePath({ cwd, raw: move[1]!, variables });
        const destination = makePath({ cwd, raw: move[2]!, variables });
        if (source === outputPath && destination !== undefined && pathIsConsumed(destination, consumedPaths)) {
          return true;
        }
      }
      if (oneShell) persistentCwd = cwd;
    }
  }
  return false;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A nested browser build is not a second application when the parent Go binary demonstrably reads
 * or embeds its output. This is deliberately path-based: a sibling frontend with no such link stays
 * independently deployable and remains a hosting-bucket candidate.
 */
const staticBuildIsOwnedByGoApplication = async ({
  manifest,
  outputDirectory,
  context,
  consumers
}: {
  manifest: ParsedManifest;
  outputDirectory: string;
  context: ProbeContext;
  consumers: Map<string, Promise<GoStaticConsumer>>;
}): Promise<boolean> => {
  const goRoot = context.files
    .filter((path) => posix.basename(path) === 'go.mod')
    .map((path) => posix.dirname(path))
    .filter((root) => pathWithin(manifest.directory, root))
    .toSorted((left, right) => right.length - left.length)[0];
  if (goRoot === undefined) return false;
  const outputPath = manifest.directory === '.' ? outputDirectory : posix.join(manifest.directory, outputDirectory);
  let pending = consumers.get(goRoot);
  if (pending === undefined) {
    pending = readGoStaticConsumer(goRoot, context);
    consumers.set(goRoot, pending);
  }
  const consumer = await pending;
  const relativeOutput = goRoot === '.' ? outputPath : outputPath.slice(goRoot.length + 1);

  if (
    consumer.embeddedPaths.has(outputPath) ||
    consumer.embeddedPaths.has(relativeOutput) ||
    pathIsConsumed(outputPath, consumer.embeddedPaths) ||
    pathIsConsumed(relativeOutput, consumer.embeddedPaths) ||
    [...consumer.embeddedPaths].some(
      (embedded) => outputPath.startsWith(`${embedded}/`) || relativeOutput.startsWith(`${embedded}/`)
    )
  ) {
    return true;
  }

  const escapedRelative = escapeRegex(relativeOutput);
  const assetServerPattern = new RegExp(
    `(?:\\b(?:http\\.Dir|os\\.DirFS|pkger\\.Include|statik|rice\\.FindBox|stuffbin\\.\\w+|initFS)\\s*\\(|\\b(?:var\\s+|const\\s+)?\\w*(?:frontend|static|assets?|dist|public|ui|web|admin|site|docs)\\w*\\s*(?::=|=|\\s+string\\s*=)\\s*)(?:"|\`)${escapedRelative}(?:/[^"\`]*)?(?:"|\`)`
  );
  if (consumer.sources.some(({ raw }) => assetServerPattern.test(goCodeWithoutComments(raw)))) {
    return true;
  }

  if (consumer.makefile === undefined) return false;
  const makefileAssetPattern = new RegExp(
    `\\b(?:stuffbin|pkger|statik|go-bindata|fileb0x|STATIC|ASSETS?)\\b[^\r\n]*\\b${escapedRelative}\\b`
  );
  if (makefileAssetPattern.test(consumer.makefile)) return true;

  return makefileMovesOutputInto({
    raw: consumer.makefile,
    outputPath,
    consumedPaths: new Set([
      ...consumer.embeddedPaths,
      ...(manifest.directory === '.' ? [] : [manifest.directory, `${manifest.directory}/public`]),
      'frontend',
      'frontend/public'
    ])
  });
};

const serviceNameFor = (manifest: ParsedManifest): string => {
  // The unscoped package name reads best in a config file; the directory is the fallback, and the
  // repository root becomes "app" rather than ".".
  const fromName = manifest.name?.replace(/^@[^/]+\//, '');
  if (fromName !== undefined && fromName !== '') {
    return fromName;
  }
  const base = manifest.directory === '.' ? '' : manifest.directory.slice(manifest.directory.lastIndexOf('/') + 1);
  return base === '' ? 'app' : base;
};

const runCommand = (manager: PackageManager | undefined, script: string): string => {
  const runner = manager === 'bun' ? 'bun run' : manager === 'pnpm' ? 'pnpm' : manager === 'yarn' ? 'yarn' : 'npm run';
  return `${runner} ${script}`;
};

/**
 * Which engine a Prisma project uses.
 *
 * `@prisma/client` on its own proves nothing — Prisma drives Postgres, MySQL, SQLite and Mongo — so
 * the engine has to come from the `datasource` block. This is the single most common way a database
 * is declared in this ecosystem, and missing it meant a Prisma project produced no database at all
 * until an agent noticed.
 */
const prismaDatasourceKind = async (
  context: ProbeContext
): Promise<
  | {
      kind: DependencyKind;
      citation: Citation;
      address?: { name: string; citation: Citation };
    }
  | undefined
> => {
  const schemaPath = context.files.find((file) => file.endsWith('prisma/schema.prisma') || file === 'schema.prisma');
  if (schemaPath === undefined) return undefined;

  const contents = await readText(context, schemaPath);
  if (contents === undefined) return undefined;

  const match = /provider\s*=\s*["']([a-z]+)["']/i.exec(contents);
  const provider = match?.[1]?.toLowerCase();
  const kind: DependencyKind | undefined = {
    postgresql: 'postgres' as const,
    postgres: 'postgres' as const,
    mysql: 'mysql' as const,
    sqlite: 'sqlite' as const,
    sqlserver: 'mssql' as const,
    mongodb: 'mongodb' as const
  }[provider ?? ''];
  if (kind === undefined) return undefined;

  const citation = citeFirstMatchOnly(schemaPath, contents, /provider\s*=/, 'dependencies.kind');
  if (citation === undefined) return undefined;
  const addressMatch = /\burl\s*=\s*env\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\)/.exec(contents);
  const addressCitation = citeFirstMatchOnly(schemaPath, contents, /\burl\s*=\s*env\(/, 'environmentVariables');
  return {
    kind,
    citation,
    ...(addressMatch?.[1] === undefined || addressCitation === undefined
      ? {}
      : { address: { name: addressMatch[1], citation: addressCitation } })
  };
};

const DEDICATED_WEB_FRAMEWORKS = new Set([
  'nextjs',
  'nuxt',
  'sveltekit',
  'astro',
  'remix',
  'react-router',
  'tanstack-start',
  'solid-start',
  'nestjs'
]);

const readFrameworkConfigEvidence = async (
  manifest: ParsedManifest,
  context: ProbeContext
): Promise<FrameworkConfigEvidence> => {
  const manifestPrefix = manifest.directory === '.' ? '' : `${manifest.directory}/`;
  const configPaths = context.files.filter((file) => {
    if (!file.startsWith(manifestPrefix)) return false;
    const relativePath = file.slice(manifestPrefix.length);
    return /^(?:vite\.config|rsbuild\.config|app\.config)\.[cm]?[jt]sx?$/i.test(relativePath);
  });
  const contents = await Promise.all(configPaths.map((path) => readText(context, path)));
  return configPaths.reduce<FrameworkConfigEvidence>(
    (evidence, path, index) => {
      const content = contents[index];
      if (content === undefined) return evidence;
      const inspected = inspectFrameworkConfig(path, content);
      return {
        solidStart: evidence.solidStart || inspected.solidStart,
        tanstackStart: evidence.tanstackStart || inspected.tanstackStart
      };
    },
    { solidStart: false, tanstackStart: false }
  );
};

const resolveFramework = async (
  manifest: ParsedManifest,
  context: ProbeContext,
  frameworkConfigEvidence: FrameworkConfigEvidence
): Promise<{ package: string; name: string } | undefined> => {
  const manifestPrefix = manifest.directory === '.' ? '' : `${manifest.directory}/`;
  const dirFiles = context.files
    .filter((file) => file.startsWith(manifestPrefix))
    .map((file) => file.slice(manifestPrefix.length));

  // If react-router dev dependency is only present as tooling without config/scripts or runtime deps,
  // do not treat it as a framework overriding express/fastify/hono/koa or creating phantom services.
  const hasReactRouterConfig = dirFiles.some((f) => /^react-router\.config\.[cm]?[jt]sx?$/i.test(f));
  const activeScriptsStr = [manifest.scripts.build, manifest.scripts.dev, manifest.scripts.start]
    .filter((s): s is string => typeof s === 'string')
    .join(' ');
  const hasReactRouterScripts = /\breact-router\b|\breact-router-serve\b/.test(activeScriptsStr);
  const hasReactRouterRuntimeDeps =
    manifest.dependencies['@react-router/node'] !== undefined ||
    manifest.dependencies['@react-router/serve'] !== undefined ||
    manifest.dependencies['@react-router/express'] !== undefined ||
    manifest.dependencies['react-router'] !== undefined ||
    manifest.dependencies['react-router-dom'] !== undefined;

  const hasReactRouterEvidence = hasReactRouterConfig || hasReactRouterScripts || hasReactRouterRuntimeDeps;

  const matches = FRAMEWORK_NAMES.filter((entry) => {
    if (entry.package === '@react-router/dev' && !hasReactRouterEvidence) {
      return false;
    }
    return manifest.dependencies[entry.package] !== undefined;
  });
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];

  // Prefer meta-frameworks over generic low-level server libraries (e.g. Next.js over internal Express)
  const metaFrameworks = matches.filter((entry) => DEDICATED_WEB_FRAMEWORKS.has(entry.name));
  const candidateList = metaFrameworks.length > 0 ? metaFrameworks : matches;
  if (candidateList.length === 1) return candidateList[0];

  const candidateFor = (name: string) => candidateList.find((candidate) => candidate.name === name);

  // A framework-specific build is the strongest lifecycle evidence because it determines the
  // artifact we will package. Stale dev/start scripts are common after migrations.
  const buildFramework = frameworkBuildCommand(manifest.scripts.build);
  if (buildFramework !== undefined && candidateFor(buildFramework) !== undefined) return candidateFor(buildFramework);
  if (/\breact-router\s+build\b/.test(manifest.scripts.build ?? '') && candidateFor('react-router') !== undefined) {
    return candidateFor('react-router');
  }

  // Without any build script, a concrete production server command is the active lifecycle.
  // When a build exists, exact config evidence below outranks a stale start script.
  if (manifest.scripts.build === undefined) {
    const startFramework = frameworkStartCommand(manifest.scripts.start);
    if (startFramework !== undefined && candidateFor(startFramework) !== undefined) return candidateFor(startFramework);
    if (/\breact-router-serve\b/.test(manifest.scripts.start ?? '') && candidateFor('react-router') !== undefined) {
      return candidateFor('react-router');
    }
  }

  // 2. Exact framework configuration imports. These are stronger than a conventional config
  // filename, which is often left behind during a framework migration.
  if (frameworkConfigEvidence.tanstackStart && candidateList.some((candidate) => candidate.name === 'tanstack-start')) {
    return candidateList.find((candidate) => candidate.name === 'tanstack-start');
  }
  if (frameworkConfigEvidence.solidStart && candidateList.some((candidate) => candidate.name === 'solid-start')) {
    return candidateList.find((candidate) => candidate.name === 'solid-start');
  }

  const startFramework = frameworkStartCommand(manifest.scripts.start);
  if (startFramework !== undefined && candidateFor(startFramework) !== undefined) return candidateFor(startFramework);
  if (/\breact-router-serve\b/.test(manifest.scripts.start ?? '') && candidateFor('react-router') !== undefined) {
    return candidateFor('react-router');
  }

  // 3. Conventional config files
  if (hasReactRouterConfig && candidateList.some((c) => c.name === 'react-router')) {
    return candidateList.find((c) => c.name === 'react-router');
  }
  if (dirFiles.some((f) => /^next\.config\.[cm]?[jt]sx?$/i.test(f)) && candidateList.some((c) => c.name === 'nextjs')) {
    return candidateList.find((c) => c.name === 'nextjs');
  }
  if (dirFiles.some((f) => /^remix\.config\.[cm]?[jt]sx?$/i.test(f)) && candidateList.some((c) => c.name === 'remix')) {
    return candidateList.find((c) => c.name === 'remix');
  }
  if (dirFiles.some((f) => /^nuxt\.config\.[cm]?[jt]sx?$/i.test(f)) && candidateList.some((c) => c.name === 'nuxt')) {
    return candidateList.find((c) => c.name === 'nuxt');
  }
  if (
    dirFiles.some((f) => /^svelte\.config\.[cm]?[jt]sx?$/i.test(f)) &&
    candidateList.some((c) => c.name === 'sveltekit')
  ) {
    return candidateList.find((c) => c.name === 'sveltekit');
  }
  if (dirFiles.some((f) => /^astro\.config\.[cm]?[jt]sx?$/i.test(f)) && candidateList.some((c) => c.name === 'astro')) {
    return candidateList.find((c) => c.name === 'astro');
  }

  // Active React Router scripts (e.g. dev)
  if (hasReactRouterScripts && candidateFor('react-router') !== undefined) {
    return candidateFor('react-router');
  }

  const devFramework = frameworkDevCommand(manifest.scripts.dev);
  if (devFramework !== undefined && candidateFor(devFramework) !== undefined) return candidateFor(devFramework);

  return candidateList[0];
};

export const manifestProbe: Probe = {
  name: 'manifest',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const manifestPaths = context.files.filter(
      (file) => (file === 'package.json' || file.endsWith('/package.json')) && !isNonProductionFixturePath(file)
    );
    if (manifestPaths.length === 0) {
      return {};
    }

    const lockFile = LOCK_FILE_TO_MANAGER.find((candidate) => context.files.includes(candidate.file));
    const packageManager = lockFile?.manager;

    // Read privileged: a manifest holds no secrets, and the policy reader hands back a reduced
    // digest whose line numbers would not match the file we cite against. Read together, kept in
    // path order, because a monorepo has one of these per package.
    const manifests: ParsedManifest[] = (
      await Promise.all(
        manifestPaths.map(async (path) => {
          const raw = await context.readPrivileged(path);
          return raw === null ? undefined : parseManifest(path, raw);
        })
      )
    ).filter((manifest): manifest is ParsedManifest => manifest !== undefined);

    const workspaceGlobs = manifests.find((manifest) => manifest.directory === '.')?.workspaces ?? [];
    const pnpmWorkspace = await readText(context, 'pnpm-workspace.yaml');
    const pnpmGlobs =
      pnpmWorkspace === undefined
        ? []
        : [...pnpmWorkspace.matchAll(/^\s*-\s*['"]?([^'"\n]+)['"]?\s*$/gm)].map((match) => match[1]!.trim());

    const services: ServiceFactInput[] = [];
    const dependencyConsumers = new Map<
      DependencyKind,
      { consumers: Set<string>; addressedBy: Set<string>; evidence: Citation[] }
    >();
    const migrations: MigrationFact[] = [];
    const resolvedManifests = await Promise.all(
      manifests.map(async (manifest) => {
        const frameworkConfigEvidence = await readFrameworkConfigEvidence(manifest, context);
        const frameworkEntry = await resolveFramework(manifest, context, frameworkConfigEvidence);
        const staticSite =
          typeof manifest.scripts.build !== 'string' ? undefined : await staticSiteFor(manifest, context);
        return {
          manifest,
          frameworkConfigEvidence,
          frameworkEntry,
          staticSite
        };
      })
    );
    const goStaticConsumers = new Map<string, Promise<GoStaticConsumer>>();
    const directlyOwnedStaticPackages = new Set(
      (
        await Promise.all(
          resolvedManifests.map(async ({ manifest, staticSite }) => {
            if (staticSite === undefined) return undefined;
            return (await staticBuildIsOwnedByGoApplication({
              manifest,
              outputDirectory: staticSite.outputDirectory,
              context,
              consumers: goStaticConsumers
            }))
              ? manifest.directory
              : undefined;
          })
        )
      ).filter((directory): directory is string => directory !== undefined)
    );
    const ownedStaticPackages = new Set(directlyOwnedStaticPackages);
    // A nested package is not owned merely because its directory is below an owned frontend. It
    // needs its own build-flow edge. Vite copies `<package>/public` into that package's output, so a
    // Makefile move from a nested build into an already-owned package's public directory is concrete
    // evidence; an independently deployed `frontend/admin` with no such edge remains a service.
    let foundOwnedPackage = true;
    while (foundOwnedPackage) {
      foundOwnedPackage = false;
      for (const { manifest, staticSite } of resolvedManifests) {
        if (staticSite === undefined || ownedStaticPackages.has(manifest.directory)) continue;
        const goRoot = context.files
          .filter((path) => posix.basename(path) === 'go.mod')
          .map((path) => posix.dirname(path))
          .filter((root) => pathWithin(manifest.directory, root))
          .toSorted((left, right) => right.length - left.length)[0];
        if (goRoot === undefined) continue;
        let pending = goStaticConsumers.get(goRoot);
        if (pending === undefined) {
          pending = readGoStaticConsumer(goRoot, context);
          goStaticConsumers.set(goRoot, pending);
        }
        // oxlint-disable-next-line no-await-in-loop -- cached once per Go root; package ownership is iterative.
        const consumer = await pending;
        if (consumer.makefile === undefined) continue;
        const outputPath =
          manifest.directory === '.'
            ? staticSite.outputDirectory
            : posix.join(manifest.directory, staticSite.outputDirectory);
        const ownedPublicDirectories = new Set(
          [...ownedStaticPackages].map((directory) => (directory === '.' ? 'public' : `${directory}/public`))
        );
        if (
          makefileMovesOutputInto({
            raw: consumer.makefile,
            outputPath,
            consumedPaths: ownedPublicDirectories
          })
        ) {
          ownedStaticPackages.add(manifest.directory);
          foundOwnedPackage = true;
        }
      }
    }

    for (const { manifest, frameworkConfigEvidence, frameworkEntry, staticSite } of resolvedManifests) {
      const hasStart = typeof manifest.scripts.start === 'string';
      const hasBuild = typeof manifest.scripts.build === 'string';
      const buildPlan = buildPlanFor(manifest);

      let exposesHttp = false;
      if (staticSite !== undefined) {
        exposesHttp = false;
      } else if (frameworkEntry?.name === 'react-router') {
        const startScript = manifest.scripts.start;
        const runsReactRouterServe = typeof startScript === 'string' && /\breact-router-serve\b/.test(startScript);
        exposesHttp = runsReactRouterServe || (hasStart && staticSite === undefined);
      } else {
        exposesHttp = Object.keys(manifest.dependencies).some((name) => HTTP_FRAMEWORKS.has(name));
      }

      const manifestPrefix = manifest.directory === '.' ? '' : `${manifest.directory}/`;
      const dirFiles = context.files
        .filter((file) => file.startsWith(manifestPrefix))
        .map((file) => file.slice(manifestPrefix.length));
      const hasHandlerLayout = dirFiles.some(
        (file) => /(?:^|\/)(?:functions?|lambdas?|handlers?)(?:\/|$)/i.test(file) && /\.(?:[cm]?js|tsx?|py)$/.test(file)
      );
      const handlerOnlyPackage =
        hasHandlerLayout &&
        (!hasStart ||
          manifest.dependencies.serverless !== undefined ||
          manifest.dependencies['@types/aws-lambda'] !== undefined);

      // A workspace root that only orchestrates is not itself a deployable thing. Requiring some
      // positive signal keeps a monorepo from producing a phantom service at its root.
      const isWorkspaceRoot =
        (manifest.workspaces?.length ?? 0) > 0 || (manifest.directory === '.' && pnpmGlobs.length > 0);

      const isStartFramework = frameworkEntry?.name === 'tanstack-start' || frameworkEntry?.name === 'solid-start';
      const hasMatchingStartConfig =
        frameworkEntry?.name === 'tanstack-start'
          ? frameworkConfigEvidence.tanstackStart
          : frameworkEntry?.name === 'solid-start'
            ? frameworkConfigEvidence.solidStart
            : false;
      const hasMatchingStartCommand = isStartFramework && hasStartFrameworkProductionCommand(manifest.scripts.start);
      // Start packages also expose APIs used by shared libraries. A generic Vite/tsc build or dev
      // script does not prove that package is an SSR application. Require either a recognized
      // framework server command or the framework's exact config import before emitting a paid web resource.
      const startPackageWithoutEvidence = isStartFramework && !hasMatchingStartCommand && !hasMatchingStartConfig;
      const runnable = (staticSite !== undefined || hasStart || exposesHttp) && !startPackageWithoutEvidence;
      // Root scripts such as `turbo run start` orchestrate child packages; they are not a third
      // deployable service. A real root app still has its own framework signal and survives this.
      const orchestrationOnlyRoot = isWorkspaceRoot && frameworkEntry === undefined && staticSite === undefined;
      if (runnable && !orchestrationOnlyRoot && !handlerOnlyPackage && !ownedStaticPackages.has(manifest.directory)) {
        const evidence: Citation[] = [];
        const startCitation =
          staticSite === undefined
            ? citeFirstMatchOnly(manifest.path, manifest.raw, /"start"\s*:/, 'startCommand')
            : undefined;
        if (startCitation) evidence.push(startCitation);
        const buildCitation = citeFirstMatchOnly(manifest.path, manifest.raw, /"build"\s*:/, 'buildCommand');
        if (buildCitation) evidence.push(buildCitation);
        evidence.push(...(staticSite?.evidence ?? []));
        const evidencedFrameworkPackage =
          frameworkEntry?.package ??
          (staticSite?.framework === 'angular'
            ? '@angular/core'
            : staticSite?.framework === 'gatsby'
              ? 'gatsby'
              : staticSite?.framework === 'react' && manifest.dependencies['react-scripts'] !== undefined
                ? 'react-scripts'
                : staticSite?.framework === 'react-router'
                  ? manifest.dependencies['@react-router/dev'] !== undefined
                    ? '@react-router/dev'
                    : 'react-router'
                  : staticSite === undefined
                    ? undefined
                    : 'vite');
        if (evidencedFrameworkPackage !== undefined) {
          const frameworkCitation = citeFirstMatchOnly(
            manifest.path,
            manifest.raw,
            new RegExp(`"${evidencedFrameworkPackage.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}"`)
          );
          if (frameworkCitation) evidence.push(frameworkCitation);
        }
        if (evidence.length === 0) {
          const nameCitation = citeFirstMatchOnly(manifest.path, manifest.raw, /"name"\s*:/);
          if (nameCitation) evidence.push(nameCitation);
        }

        const nodeEngine = manifest.engines?.node?.replace(/[^\d.]/g, '');

        services.push({
          name: serviceNameFor(manifest),
          path: manifest.directory,
          language: 'javascript',
          ...(nodeEngine ? { runtimeVersion: nodeEngine } : {}),
          ...(frameworkEntry
            ? { framework: frameworkEntry.name }
            : staticSite
              ? { framework: staticSite.framework }
              : {}),
          exposesHttp: staticSite === undefined && exposesHttp,
          // Left to source signals and the container probe, which can see a bind call or an EXPOSE
          // directive. Guessing a port here would produce a health check that never passes.
          executionModel: 'long-running',
          ...(hasBuild ? { buildCommand: runCommand(packageManager, buildPlan.scriptName) } : {}),
          ...(staticSite === undefined && hasStart ? { startCommand: runCommand(packageManager, 'start') } : {}),
          ...(staticSite === undefined
            ? {}
            : {
                servesStaticAssets: {
                  path:
                    manifest.directory === '.'
                      ? staticSite.outputDirectory
                      : `${manifest.directory}/${staticSite.outputDirectory}`
                }
              }),
          environmentVariables: [],
          evidence,
          source: 'probe'
        });
      }

      const consumerName = serviceNameFor(manifest);
      for (const signal of DEPENDENCY_SIGNALS) {
        const matched = signal.packages.find((name) => manifest.dependencies[name] !== undefined);
        if (matched === undefined) continue;
        const citation = citeFirstMatchOnly(
          manifest.path,
          manifest.raw,
          new RegExp(`"${matched.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}"`)
        );
        for (const kind of signal.kinds) {
          const entry = dependencyConsumers.get(kind) ?? {
            consumers: new Set<string>(),
            addressedBy: new Set<string>(),
            evidence: []
          };
          entry.consumers.add(consumerName);
          if (citation && entry.evidence.length < 4) entry.evidence.push(citation);
          dependencyConsumers.set(kind, entry);
        }
      }

      for (const tool of MIGRATION_TOOLS) {
        if (manifest.dependencies[tool.package] === undefined) continue;
        const embeddedInBuild = buildPlan.migrationTool === tool.tool ? buildPlan : undefined;
        const citation =
          embeddedInBuild?.migrationQuote === undefined
            ? citeFirstMatchOnly(manifest.path, manifest.raw, new RegExp(`"${tool.package}"`))
            : citeFirstMatchOnly(
                manifest.path,
                manifest.raw,
                new RegExp(embeddedInBuild.migrationQuote.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&'))
              );
        migrations.push({
          serviceName: consumerName,
          tool: tool.tool,
          command: embeddedInBuild?.migrationCommand ?? tool.command,
          // When migrations run is not written in a manifest. Saying `unknown` puts it in front of
          // the user as a question rather than inventing a deployment hook nobody asked for.
          runsAt: embeddedInBuild === undefined ? 'unknown' : 'ci',
          evidence: citation ? [citation] : []
        });
      }
    }

    // Prisma's engine lives in its schema file rather than in the manifest, so it is folded in here
    // as though a dependency signal had produced it.
    const prisma = await prismaDatasourceKind(context);
    if (prisma !== undefined) {
      const entry = dependencyConsumers.get(prisma.kind) ?? {
        consumers: new Set<string>(),
        addressedBy: new Set<string>(),
        evidence: []
      };
      for (const manifest of manifests) {
        if (manifest.dependencies['@prisma/client'] !== undefined || manifest.dependencies.prisma !== undefined) {
          entry.consumers.add(serviceNameFor(manifest));
        }
      }
      entry.evidence.unshift(prisma.citation);
      if (prisma.address !== undefined) {
        entry.addressedBy.add(prisma.address.name);
        entry.evidence.unshift(prisma.address.citation);
        for (const service of services) {
          if (!entry.consumers.has(service.name)) continue;
          service.environmentVariables = [
            ...(service.environmentVariables ?? []),
            {
              name: prisma.address.name,
              role: 'infra-dependency',
              dependencyName: defaultDependencyName(prisma.kind),
              required: true,
              evidence: [prisma.address.citation]
            }
          ];
        }
      }
      dependencyConsumers.set(prisma.kind, entry);
    }

    const dependencies: DependencyFact[] = [...dependencyConsumers.entries()].map(([kind, entry]) => ({
      name: defaultDependencyName(kind),
      kind,
      extensions: [],
      consumedBy: [...entry.consumers],
      addressedBy: [...entry.addressedBy],
      evidence: entry.evidence,
      source: 'probe'
    }));

    return {
      ...(packageManager ? { packageManager } : {}),
      workspaceGlobs: [...workspaceGlobs, ...pnpmGlobs],
      services,
      dependencies,
      migrations
    };
  }
};
