/**
 * Whether the repository already runs a migration that no probe could time.
 *
 * A migration tool in the dependencies says nothing about when it runs. Before composition reports one that nothing
 * runs, the scripts and deployment files a person or a pipeline starts are searched for its command: a package script
 * (`"db:migrate": "sequelize db:migrate"`), a `prestart.sh`, a Makefile target, a Dockerfile or Compose command. Found
 * there, it runs by hand or by that file, and composition neither adds a hook nor reports it. So does a container that
 * starts through a script init cannot read.
 */

import { posix } from 'node:path';
import type { MigrationFact } from '../facts/project-facts';
import { readText, type ProbeContext } from './probe';

/** What running each tool's migrations looks like on a command line. */
const RUN_SIGNATURES: Readonly<Record<string, RegExp>> = {
  alembic: /\balembic\s+upgrade\b/,
  django: /\bmanage\.py\s+migrate\b/,
  rails: /\b(?:rails|rake)\s+db:(?:migrate|prepare|setup)\b/,
  prisma: /\bprisma\s+(?:migrate\s+deploy|db\s+push)\b/,
  drizzle: /\bdrizzle-kit\s+(?:migrate|push)\b/,
  typeorm: /\bmigration:run\b/,
  knex: /\bknex\b[^\n]*\bmigrate:latest\b/,
  sequelize: /\bsequelize(?:-cli)?\b[^\n]*\bdb:migrate\b/,
  ecto: /\becto\.migrate\b/,
  'golang-migrate': /\bmigrate\b[^\n]*\s(?:up|-path)\b/,
  flyway: /\bflyway\b[^\n]*\bmigrate\b/,
  liquibase: /\bliquibase\b[^\n]*\bupdate\b/
};

/** Files a person, a container or a pipeline runs commands from. */
const RUNNABLE_FILE =
  /(?:^|\/)(?:package\.json|Makefile|justfile|Taskfile\.ya?ml|Procfile[^/]*|Dockerfile[^/]*|(?:docker-)?compose[^/]*\.ya?ml|[^/]+\.sh|fly\.toml|render\.ya?ml|railway\.json|app\.json|bin\/[^/.]+)$/;
const EXCLUDED = /(?:^|\/)(?:node_modules|vendor|dist|build|\.venv|venv|\.git)\//;
const MAX_FILES = 200;
const PACKAGE_MIGRATE_SCRIPT = /"(?:[\w-]+:)*migrat[\w:-]*"\s*:\s*"/;
/** A Dockerfile that starts the container through a script: `CMD ["bin/boot"]`, `ENTRYPOINT ["./docker-entrypoint.sh"]`. */
const STARTUP_SCRIPT = /^\s*(?:CMD|ENTRYPOINT)\b[^\n]*?((?:\.\/)?(?:[\w.-]+\/)*(?:bin\/[\w.-]+|[\w.-]+\.sh))\b/m;

/**
 * Whether a Dockerfile's startup script may migrate: its text when it can be read, and otherwise yes. Scripts under
 * `bin/` are outside what init reads, and a container that starts through one is not evidence that nothing migrates.
 */
const startupScriptMayMigrate = async (
  context: ProbeContext,
  dockerfile: string,
  raw: string,
  signature: RegExp
): Promise<boolean> => {
  const script = STARTUP_SCRIPT.exec(raw)?.[1];
  if (script === undefined) return false;
  const path = posix.normalize(posix.join(posix.dirname(dockerfile), script));
  const contents = path.startsWith('..') ? undefined : await readText(context, path);
  return contents === undefined || signature.test(contents);
};

export const markMigrationsRunElsewhere = async (
  context: ProbeContext,
  migrations: Iterable<MigrationFact>
): Promise<void> => {
  const unknown = [...migrations].filter(
    (migration) => migration.runsAt === 'unknown' && RUN_SIGNATURES[migration.tool] !== undefined
  );
  if (unknown.length === 0) return;
  const files = context.files
    .filter((file) => RUNNABLE_FILE.test(file) && !EXCLUDED.test(file))
    .toSorted((left, right) => posix.dirname(left).length - posix.dirname(right).length)
    .slice(0, MAX_FILES);
  for (const file of files) {
    // oxlint-disable-next-line no-await-in-loop -- bounded, small files read in a stable order.
    const raw = await readText(context, file);
    if (raw === undefined) continue;
    for (const migration of unknown) {
      if (migration.runsAt !== 'unknown') continue;
      const signature = RUN_SIGNATURES[migration.tool]!;
      const runs =
        signature.test(raw) ||
        // `"db:migrate": "tsx scripts/migrate.ts"`: the project's own migration command, whatever runs inside it.
        (posix.basename(file) === 'package.json' && PACKAGE_MIGRATE_SCRIPT.test(raw)) ||
        // oxlint-disable-next-line no-await-in-loop -- at most one script per Dockerfile.
        (/(?:^|\/)Dockerfile[^/]*$/.test(file) && (await startupScriptMayMigrate(context, file, raw, signature)));
      if (runs) migration.runsAt = 'manual';
    }
    if (unknown.every((migration) => migration.runsAt !== 'unknown')) return;
  }
};
