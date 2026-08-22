/**
 * What a `Procfile` declares.
 *
 * A Procfile is the closest thing to a deployment manifest that a Heroku-shaped project has, and it
 * is unusually good evidence: each line names a process and gives the exact command that starts it.
 * No inference, no framework detection, no guessing which script is the entrypoint.
 *
 * It matters most where we are currently weakest. Everything else that finds services reads
 * `package.json`, so a Django or Rails project produced no services at all and `init` reported that
 * the repository had nothing to deploy. A Procfile answers the two hard questions for those
 * projects — what runs, and how it starts — for the price of splitting on a colon.
 *
 * The convention it relies on is Heroku's, and it is genuinely a convention rather than a guess:
 * `web` is the process that receives HTTP traffic, `release` runs once before each deploy, and
 * everything else is a background worker.
 */

import { languageOf } from '../language';
import type { MigrationFact } from '../../facts/project-facts';
import type { EnvironmentVariableUse, ServiceFactInput } from '../../facts/service';
import { citeLine, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
import { declaredEnvironmentVariable } from './declared-environment';

/** `name: command`, where the name is a process type and everything after the colon is the command. */
const PROCESS_LINE = /^([A-Za-z0-9_-]+):\s*(.+)$/;
const LEADING_ENVIRONMENT_ASSIGNMENT =
  /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s]+)\s*/;
/** Remove shell-style values while retaining the command and the names the process expects. */
const commandWithoutEnvironmentValues = (
  command: string
): { command: string; environmentVariables: EnvironmentVariableUse[] } => {
  let remaining = command.trim();
  const environmentVariables: EnvironmentVariableUse[] = [];
  while (remaining !== '') {
    const match = LEADING_ENVIRONMENT_ASSIGNMENT.exec(remaining);
    if (match === null) break;
    const name = match[1]!;
    const assignment = match[0].trim();
    const rawValue = assignment.slice(assignment.indexOf('=') + 1).trim();
    const value = rawValue.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, '$1$2');
    environmentVariables.push(
      declaredEnvironmentVariable({
        name,
        dependencyName: undefined,
        evidence: [],
        value
      })
    );
    remaining = remaining.slice(match[0].length).trimStart();
  }
  return { command: remaining, environmentVariables };
};

/**
 * Process types that are not services.
 *
 * `release` is Heroku's pre-deploy hook, which is where almost every Heroku project runs its
 * database migrations. It becomes a migration fact, not something we deploy a container for.
 */
const LIFECYCLE_PROCESS = /^(?:release|migrate|migration|db-migrate|predeploy)$/;

/** Migration tools worth naming, recognised from the release command itself. */
const MIGRATION_TOOLS: ReadonlyArray<{ pattern: RegExp; tool: string }> = [
  { pattern: /manage\.py\s+migrate/, tool: 'django' },
  { pattern: /rails\s+db:migrate|rake\s+db:migrate/, tool: 'rails' },
  { pattern: /alembic\s+upgrade/, tool: 'alembic' },
  { pattern: /prisma\s+migrate/, tool: 'prisma' },
  { pattern: /drizzle-kit\s+migrate/, tool: 'drizzle' },
  { pattern: /knex\s+migrate/, tool: 'knex' },
  { pattern: /sequelize.*db:migrate/, tool: 'sequelize' },
  { pattern: /typeorm\s+migration:run/, tool: 'typeorm' },
  { pattern: /mix\s+ecto\.migrate/, tool: 'ecto' },
  { pattern: /migrat/, tool: 'unknown' }
];

/**
 * Split the only shell composition we can reduce without executing a shell: top-level `&&`.
 * Quotes are honoured; every other operator remains inside its clause and therefore fails the
 * command-shape guard below if it is the migration candidate. Unbalanced quotes and command
 * substitution fail closed.
 */
const splitTopLevelAnd = (command: string): string[] | undefined => {
  const clauses: string[] = [];
  let quote: '"' | "'" | undefined;
  let escaped = false;
  let start = 0;
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index]!;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote !== undefined) {
      if (character === quote) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '$' && command[index + 1] === '(') return undefined;
    if (character === '&' && command[index + 1] === '&') {
      const clause = command.slice(start, index).trim();
      if (clause === '') return undefined;
      clauses.push(clause);
      index += 1;
      start = index + 1;
    }
  }
  if (quote !== undefined || escaped) return undefined;
  const tail = command.slice(start).trim();
  if (tail === '') return undefined;
  clauses.push(tail);
  return clauses;
};

/** Plain argv-like syntax only. Redirects, pipes, expansion and shell control flow never survive. */
const SAFE_MIGRATION_CLAUSE = /^[A-Za-z0-9_./-]+(?: [A-Za-z0-9_.:=@/-]+)*$/;
const SEED_OR_FIXTURE = /(?:^|[\s:_-])(?:seed|fixture|faker|dummy)(?:$|[\s:_-])/i;

export const safeMigrationClauseOf = (command: string): string | undefined => {
  const clauses = splitTopLevelAnd(command);
  if (clauses === undefined) return undefined;
  const candidates = clauses.filter(
    (clause) =>
      !SEED_OR_FIXTURE.test(clause) &&
      SAFE_MIGRATION_CLAUSE.test(clause) &&
      MIGRATION_TOOLS.some((entry) => entry.pattern.test(clause))
  );
  return candidates.length === 1 ? candidates[0] : undefined;
};

export const procfileProbe: Probe = {
  name: 'procfile',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    if (!context.files.includes('Procfile')) return {};

    const raw = await readText(context, 'Procfile');
    if (raw === undefined) return {};

    const lines = raw.split(/\r?\n/);
    const language = languageOf(context.files, '.');
    const services: ServiceFactInput[] = [];
    const migrations: MigrationFact[] = [];
    let webService: string | undefined;

    for (const [index, line] of lines.entries()) {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('#')) continue;

      const match = PROCESS_LINE.exec(trimmed);
      if (match === null) continue;
      const [, name, rawCommand] = match as unknown as [string, string, string];
      const { command, environmentVariables } = commandWithoutEnvironmentValues(rawCommand);
      // A line containing only assignments is not runnable. More importantly, retaining it would
      // make the facts document a second store for those values.
      if (command === '') continue;
      const commandCitation = {
        ...citeLine('Procfile', lines, index, 'startCommand'),
        // The runnable suffix appears verbatim on the line; the discarded assignment values do not.
        quote: command.slice(0, 200)
      };

      if (LIFECYCLE_PROCESS.test(name)) {
        const migrationCommand = safeMigrationClauseOf(command);
        // A release process may only warm caches, seed demo data or perform other lifecycle work.
        // It is not a migration unless a migration-shaped clause is actually present.
        if (migrationCommand === undefined && !MIGRATION_TOOLS.some((entry) => entry.pattern.test(command))) {
          continue;
        }
        migrations.push({
          // Attributed to the web process, which is the one a release phase belongs to. When there
          // is no web process the first service named in the file is the next best owner, and
          // `checkFactsCompleteness` catches it if neither exists.
          serviceName: webService ?? services[0]?.name ?? 'web',
          tool: MIGRATION_TOOLS.find((entry) => entry.pattern.test(migrationCommand ?? command))?.tool ?? 'unknown',
          // A shell chain is never copied whole. When exactly one safe migration clause can be
          // isolated, only that argv-like command reaches the deploy hook. Otherwise the original
          // remains as evidence and composition raises a review gap instead of executing it.
          command: migrationCommand ?? command,
          // Release/migration process declarations run as part of deployment, not forever.
          runsAt: 'ci',
          evidence: [
            {
              ...commandCitation,
              field: undefined,
              quote: migrationCommand ?? commandCitation.quote
            }
          ]
        });
        continue;
      }

      const isWeb = name === 'web';
      if (isWeb) webService = name;

      services.push({
        name,
        path: '.',
        // The web process is the application itself, so it folds into whatever the manifest already
        // found in this directory rather than becoming a second copy of it. Every other process is
        // a genuinely separate deployable thing and says so.
        ...(isWeb ? { processType: 'procfile:web' } : { processType: name }),
        // A Procfile says nothing about the language, so the marker files next to it answer that.
        // Without one there is no honest value to give, and the service is left for another probe.
        language: language ?? 'unknown',
        exposesHttp: isWeb,
        executionModel: 'long-running',
        startCommand: command,
        environmentVariables,
        evidence: [commandCitation],
        source: 'probe'
      });
    }

    // A release phase found before any process line still belongs to the web process, if there is
    // one. Cheaper to fix up here than to make the loop two passes.
    for (const migration of migrations) {
      if (migration.serviceName === 'web' && webService === undefined && services[0] !== undefined) {
        migration.serviceName = services[0].name;
      }
    }

    return {
      ...(services.length > 0 ? { services } : {}),
      ...(migrations.length > 0 ? { migrations } : {})
    };
  }
};
