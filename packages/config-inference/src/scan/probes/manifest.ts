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

import * as ts from 'typescript';
import type { Citation } from '../../facts/citation';
import { defaultDependencyName, type DependencyFact, type DependencyKind } from '../../facts/dependency';
import type { MigrationFact, PackageManager } from '../../facts/project-facts';
import type { ServiceFactInput } from '../../facts/service';
import { citeFirstMatchOnly, citeLine, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
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
  '@tanstack/start'
]);

type InferredFramework = {
  name: string;
  package?: string;
  exposesHttp?: boolean;
};

/**
 * Identify the primary application framework using bounded semantic evidence:
 * config files and active build/dev/start scripts take precedence over passive or leftover dependencies.
 */
const detectFramework = (manifest: ParsedManifest, context: ProbeContext): InferredFramework | undefined => {
  const dirPrefix = manifest.directory === '.' ? '' : `${manifest.directory}/`;
  const scripts = manifest.scripts;
  const activeScripts = [scripts.build, scripts.dev, scripts.start].filter(
    (script): script is string => typeof script === 'string'
  );
  const scriptsStr = activeScripts.join(' ');
  const deps = manifest.dependencies;

  // Framework config files in the package directory
  const rrConfigFile = context.files.find(
    (file) =>
      file === `${dirPrefix}react-router.config.ts` ||
      file === `${dirPrefix}react-router.config.js` ||
      file === `${dirPrefix}react-router.config.mjs` ||
      file === `${dirPrefix}react-router.config.cjs`
  );
  const remixConfigFile = context.files.find(
    (file) =>
      file === `${dirPrefix}remix.config.js` ||
      file === `${dirPrefix}remix.config.ts` ||
      file === `${dirPrefix}remix.config.mjs` ||
      file === `${dirPrefix}remix.config.cjs`
  );
  const nextConfigFile = context.files.find(
    (file) =>
      file === `${dirPrefix}next.config.js` ||
      file === `${dirPrefix}next.config.mjs` ||
      file === `${dirPrefix}next.config.ts` ||
      file === `${dirPrefix}next.config.cjs`
  );
  const nuxtConfigFile = context.files.find(
    (file) => file === `${dirPrefix}nuxt.config.ts` || file === `${dirPrefix}nuxt.config.js`
  );
  const astroConfigFile = context.files.find(
    (file) =>
      file === `${dirPrefix}astro.config.mjs` ||
      file === `${dirPrefix}astro.config.ts` ||
      file === `${dirPrefix}astro.config.js`
  );
  const svelteConfigFile = context.files.find(
    (file) => file === `${dirPrefix}svelte.config.js` || file === `${dirPrefix}svelte.config.ts`
  );

  const hasReactRouterScripts = /\breact-router\b|\breact-router-serve\b/.test(scriptsStr);
  const hasReactRouterDeps =
    deps['@react-router/dev'] !== undefined ||
    deps['@react-router/node'] !== undefined ||
    deps['@react-router/serve'] !== undefined ||
    deps['@react-router/express'] !== undefined;

  const hasRemixScripts = /\bremix\b|\bremix-serve\b/.test(scriptsStr);
  const hasRemixDeps =
    deps['@remix-run/dev'] !== undefined ||
    deps['@remix-run/node'] !== undefined ||
    deps['@remix-run/react'] !== undefined ||
    deps['@remix-run/serve'] !== undefined ||
    deps.remix !== undefined;
  const hasRemixServerDep =
    deps['@remix-run/node'] !== undefined || deps['@remix-run/serve'] !== undefined || deps.remix !== undefined;

  const hasNextScripts = /\bnext\s+(?:dev|build|start)\b/.test(scriptsStr);
  const hasNextDep = deps.next !== undefined;

  const hasNuxtScripts = /\bnuxt\s+(?:dev|build|generate)\b/.test(scriptsStr);
  const hasNuxtDep = deps.nuxt !== undefined;

  const hasAstroScripts = /\bastro\s+(?:dev|build|preview)\b/.test(scriptsStr);
  const hasAstroDep = deps.astro !== undefined;

  const hasSvelteDep = deps['@sveltejs/kit'] !== undefined;

  // 1. Config files and active framework scripts take precedence over ambiguous dependency declarations:
  if (nextConfigFile !== undefined || (hasNextDep && hasNextScripts)) {
    return { name: 'nextjs', package: 'next', exposesHttp: true };
  }

  if (nuxtConfigFile !== undefined || (hasNuxtDep && hasNuxtScripts)) {
    return { name: 'nuxt', package: 'nuxt', exposesHttp: true };
  }

  if (astroConfigFile !== undefined || (hasAstroDep && hasAstroScripts)) {
    return { name: 'astro', package: 'astro', exposesHttp: true };
  }

  if (svelteConfigFile !== undefined && hasSvelteDep) {
    return { name: 'sveltekit', package: '@sveltejs/kit', exposesHttp: true };
  }

  // React Router: config file OR (react-router scripts AND react-router dependencies)
  // This explicitly wins over leftover @remix-run/node dependencies in migrated projects.
  if (rrConfigFile !== undefined || (hasReactRouterScripts && hasReactRouterDeps)) {
    const matchedPkg =
      deps['@react-router/serve'] !== undefined
        ? '@react-router/serve'
        : deps['@react-router/node'] !== undefined
          ? '@react-router/node'
          : deps['@react-router/express'] !== undefined
            ? '@react-router/express'
            : deps['@react-router/dev'] !== undefined
              ? '@react-router/dev'
              : deps['react-router'] !== undefined
                ? 'react-router'
                : undefined;
    return {
      name: 'react-router',
      ...(matchedPkg !== undefined ? { package: matchedPkg } : {})
    };
  }

  // Remix: config file OR (remix scripts AND remix dependencies)
  if (remixConfigFile !== undefined || (hasRemixScripts && hasRemixDeps)) {
    const matchedPkg =
      deps['@remix-run/node'] !== undefined
        ? '@remix-run/node'
        : deps['@remix-run/serve'] !== undefined
          ? '@remix-run/serve'
          : deps['@remix-run/dev'] !== undefined
            ? '@remix-run/dev'
            : deps.remix !== undefined
              ? 'remix'
              : undefined;
    return {
      name: 'remix',
      exposesHttp: true,
      ...(matchedPkg !== undefined ? { package: matchedPkg } : {})
    };
  }

  // SolidStart
  if (deps['@solidjs/start'] !== undefined) {
    return {
      name: 'solid-start',
      package: '@solidjs/start',
      exposesHttp: true
    };
  }

  // TanStack Start
  if (deps['@tanstack/start'] !== undefined) {
    return {
      name: 'tanstack-start',
      package: '@tanstack/start',
      exposesHttp: true
    };
  }

  // NestJS
  if (deps['@nestjs/core'] !== undefined) {
    return { name: 'nestjs', package: '@nestjs/core' };
  }

  // Standard HTTP server libraries
  if (deps.express !== undefined) {
    return { name: 'express', package: 'express', exposesHttp: true };
  }
  if (deps.fastify !== undefined) {
    return { name: 'fastify', package: 'fastify', exposesHttp: true };
  }
  if (deps.hono !== undefined) {
    return { name: 'hono', package: 'hono', exposesHttp: true };
  }
  if (deps.koa !== undefined) {
    return { name: 'koa', package: 'koa', exposesHttp: true };
  }

  // Fallbacks from remaining dependencies:
  if (hasNextDep) return { name: 'nextjs', package: 'next', exposesHttp: true };
  if (hasNuxtDep) return { name: 'nuxt', package: 'nuxt', exposesHttp: true };
  if (hasAstroDep) return { name: 'astro', package: 'astro', exposesHttp: true };
  if (hasSvelteDep) return { name: 'sveltekit', package: '@sveltejs/kit', exposesHttp: true };
  if (hasRemixServerDep) {
    return {
      name: 'remix',
      package:
        deps['@remix-run/node'] !== undefined
          ? '@remix-run/node'
          : deps['@remix-run/serve'] !== undefined
            ? '@remix-run/serve'
            : 'remix',
      exposesHttp: true
    };
  }
  if (
    deps['@react-router/serve'] !== undefined &&
    typeof scripts.start === 'string' &&
    /\breact-router-serve\b/.test(scripts.start)
  ) {
    return { name: 'react-router', package: '@react-router/serve' };
  }

  return undefined;
};

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
    return {
      framework:
        manifest.dependencies.vue !== undefined ? 'vue' : manifest.dependencies.react !== undefined ? 'react' : 'vite',
      outputDirectory: 'dist'
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

export const manifestProbe: Probe = {
  name: 'manifest',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const manifestPaths = context.files.filter((file) => file === 'package.json' || file.endsWith('/package.json'));
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

    const staticSites = await Promise.all(
      manifests.map((manifest) =>
        typeof manifest.scripts.build !== 'string' ? undefined : staticSiteFor(manifest, context)
      )
    );

    for (let index = 0; index < manifests.length; index += 1) {
      const manifest = manifests[index]!;
      const hasStart = typeof manifest.scripts.start === 'string';
      const hasBuild = typeof manifest.scripts.build === 'string';
      const buildPlan = buildPlanFor(manifest);
      const staticSite = staticSites[index];
      const frameworkInfo = detectFramework(manifest, context);

      let exposesHttp = false;
      if (staticSite !== undefined) {
        exposesHttp = false;
      } else if (frameworkInfo?.name === 'react-router') {
        const startScript = manifest.scripts.start;
        const runsReactRouterServe = typeof startScript === 'string' && /\breact-router-serve\b/.test(startScript);
        exposesHttp = runsReactRouterServe || (hasStart && staticSite === undefined);
      } else if (frameworkInfo?.exposesHttp) {
        exposesHttp = true;
      } else {
        exposesHttp = Object.keys(manifest.dependencies).some((name) => HTTP_FRAMEWORKS.has(name));
      }

      const manifestPrefix = manifest.directory === '.' ? '' : `${manifest.directory}/`;
      const hasHandlerLayout = context.files.some(
        (file) =>
          file.startsWith(manifestPrefix) &&
          /(?:^|\/)(?:functions?|lambdas?|handlers?)(?:\/|$)/i.test(file.slice(manifestPrefix.length)) &&
          /\.(?:[cm]?js|tsx?|py)$/.test(file)
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
      const runnable = staticSite !== undefined || hasStart || exposesHttp;
      // Root scripts such as `turbo run start` orchestrate child packages; they are not a third
      // deployable service. A real root app still has its own framework signal and survives this.
      const orchestrationOnlyRoot = isWorkspaceRoot && frameworkInfo === undefined && staticSite === undefined;
      if (runnable && !orchestrationOnlyRoot && !handlerOnlyPackage) {
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
          frameworkInfo?.package ??
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
          ...(frameworkInfo
            ? { framework: frameworkInfo.name }
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
