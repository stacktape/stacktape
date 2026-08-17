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

import type { Citation } from '../../facts/citation';
import { defaultDependencyName, type DependencyFact, type DependencyKind } from '../../facts/dependency';
import type { MigrationFact, PackageManager } from '../../facts/project-facts';
import type { ServiceFactInput } from '../../facts/service';
import { citeFirstMatchOnly, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';

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
  { packages: ['kafkajs', '@confluentinc/kafka-javascript'], kinds: ['kafka'] }
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
  'restify',
  'sveltekit',
  '@sveltejs/kit',
  '@solidjs/start',
  '@tanstack/start'
]);

/** Frameworks worth naming, because the composer has dedicated handling for several of them. */
const FRAMEWORK_NAMES: ReadonlyArray<{ package: string; name: string }> = [
  { package: 'next', name: 'nextjs' },
  { package: 'nuxt', name: 'nuxt' },
  { package: '@sveltejs/kit', name: 'sveltekit' },
  { package: 'astro', name: 'astro' },
  { package: '@remix-run/node', name: 'remix' },
  { package: '@solidjs/start', name: 'solid-start' },
  { package: '@tanstack/start', name: 'tanstack-start' },
  { package: '@nestjs/core', name: 'nestjs' },
  { package: 'express', name: 'express' },
  { package: 'fastify', name: 'fastify' },
  { package: 'hono', name: 'hono' },
  { package: 'koa', name: 'koa' }
];

/** Build-only browser frameworks that produce a directory for `hosting-bucket`. */
const staticSiteFor = (
  manifest: ParsedManifest
):
  | {
      framework: 'angular' | 'gatsby' | 'react' | 'vite' | 'vue';
      outputDirectory: string;
    }
  | undefined => {
  if (manifest.dependencies['@angular/core'] !== undefined) {
    return {
      framework: 'angular',
      outputDirectory: `dist/${manifest.name?.replace(/^@[^/]+\//, '') ?? serviceNameFor(manifest)}`
    };
  }
  if (manifest.dependencies.gatsby !== undefined) return { framework: 'gatsby', outputDirectory: 'public' };
  if (manifest.dependencies['react-scripts'] !== undefined) return { framework: 'react', outputDirectory: 'build' };
  if (manifest.dependencies.vite !== undefined) {
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
): Promise<{ kind: DependencyKind; citation: Citation } | undefined> => {
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
  return citation === undefined ? undefined : { kind, citation };
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
    const dependencyConsumers = new Map<DependencyKind, { consumers: Set<string>; evidence: Citation[] }>();
    const migrations: MigrationFact[] = [];

    for (const manifest of manifests) {
      const hasStart = typeof manifest.scripts.start === 'string';
      const hasBuild = typeof manifest.scripts.build === 'string';
      const frameworkEntry = FRAMEWORK_NAMES.find((entry) => manifest.dependencies[entry.package] !== undefined);
      const exposesHttp = Object.keys(manifest.dependencies).some((name) => HTTP_FRAMEWORKS.has(name));
      // A Vite/CRA/Angular/Gatsby development server is not a production service. Its build output
      // is uploaded to static hosting; treating `ng serve` or `gatsby develop` as a worker is both
      // expensive and non-functional.
      const staticSite = exposesHttp ? undefined : staticSiteFor(manifest);
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
      const orchestrationOnlyRoot = isWorkspaceRoot && frameworkEntry === undefined && staticSite === undefined;
      if (runnable && !orchestrationOnlyRoot && !handlerOnlyPackage) {
        const evidence: Citation[] = [];
        const startCitation =
          staticSite === undefined
            ? citeFirstMatchOnly(manifest.path, manifest.raw, /"start"\s*:/, 'startCommand')
            : undefined;
        if (startCitation) evidence.push(startCitation);
        const buildCitation = citeFirstMatchOnly(manifest.path, manifest.raw, /"build"\s*:/, 'buildCommand');
        if (buildCitation) evidence.push(buildCitation);
        const evidencedFrameworkPackage =
          frameworkEntry?.package ??
          (staticSite?.framework === 'angular'
            ? '@angular/core'
            : staticSite?.framework === 'gatsby'
              ? 'gatsby'
              : staticSite?.framework === 'react' && manifest.dependencies['react-scripts'] !== undefined
                ? 'react-scripts'
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
          ...(hasBuild ? { buildCommand: runCommand(packageManager, 'build') } : {}),
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
            evidence: []
          };
          entry.consumers.add(consumerName);
          if (citation && entry.evidence.length < 4) entry.evidence.push(citation);
          dependencyConsumers.set(kind, entry);
        }
      }

      for (const tool of MIGRATION_TOOLS) {
        if (manifest.dependencies[tool.package] === undefined) continue;
        const citation = citeFirstMatchOnly(manifest.path, manifest.raw, new RegExp(`"${tool.package}"`));
        migrations.push({
          serviceName: consumerName,
          tool: tool.tool,
          command: tool.command,
          // When migrations run is not written in a manifest. Saying `unknown` puts it in front of
          // the user as a question rather than inventing a deployment hook nobody asked for.
          runsAt: 'unknown',
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
        evidence: []
      };
      for (const manifest of manifests) {
        if (manifest.dependencies['@prisma/client'] !== undefined || manifest.dependencies.prisma !== undefined) {
          entry.consumers.add(serviceNameFor(manifest));
        }
      }
      entry.evidence.unshift(prisma.citation);
      dependencyConsumers.set(prisma.kind, entry);
    }

    const dependencies: DependencyFact[] = [...dependencyConsumers.entries()].map(([kind, entry]) => ({
      name: defaultDependencyName(kind),
      kind,
      extensions: [],
      consumedBy: [...entry.consumers],
      // A manifest names the client library, never the variable that carries the address; that is
      // the environment probe's contribution, and the merge unions the two.
      addressedBy: [],
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
