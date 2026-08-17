/**
 * Turning detected migrations into the deploy hook the user was promised.
 *
 * Three probes find the tool and the command, the assembler forwards the attribution through
 * service renames, and the wizard shows a "runs as a deploy hook" decision — so the composer has
 * to actually emit the hook, or the decision card describes machinery that does not exist and a
 * Rails or Django first deploy ships a schema-less database. The emission is the documented
 * canonical pattern: a `local-script` with `connectTo`, referenced from `hooks.afterDeploy`.
 * A public database uses `local-script`. A VPC-only database uses
 * `local-script-with-bastion-tunneling`, keeping the same reviewed command and environment while
 * the CLI substitutes its remote database endpoints with local SSM tunnel endpoints.
 *
 * Two guards, both about running commands on the user's machine:
 *
 * - **Only command-shaped commands.** The string lands in `executeCommand`, so shell metacharacters
 *   are rejected outright and the first token must be a known package manager or migration runner.
 *   A migration fact can originate from an agent that read untrusted repository content; the
 *   allowlist means the worst a hostile fact can do is run a well-known tool with odd arguments,
 *   visibly, in a file the user reviews.
 * - **Timing is the user's decision.** An observed release phase (`runsAt: 'ci'`) is proof the
 *   project already migrates on deploy. Anything else emits only when the migration-timing
 *   decision resolved to `deploy-hook` — a `manual` or `service-startup` answer means no hook.
 */

import type { DependencyFact } from '../facts/dependency';
import type { MigrationFact } from '../facts/project-facts';
import type { ServiceFact } from '../facts/service';
import type { Assumption } from './assumptions';
import { generatedDatabasePasswordSecretReference, wiringFor } from './env-wiring';

const DATABASE_KINDS: ReadonlySet<DependencyFact['kind']> = new Set(['postgres', 'mysql', 'mssql', 'mongodb']);

/** Plain tokens only: anything a shell would interpret has no business in a generated command. */
const COMMAND_SHAPE = /^[A-Za-z0-9_./-]+(?: [A-Za-z0-9_.:=@/-]+)*$/;

const KNOWN_RUNNERS: ReadonlySet<string> = new Set([
  'npm',
  'npx',
  'pnpm',
  'yarn',
  'bun',
  'node',
  'bundle',
  'rails',
  'rake',
  'python',
  'python3',
  'alembic',
  'flask',
  'php',
  'mvn',
  'gradle',
  './gradlew',
  'gradlew',
  'dotnet',
  'go',
  'prisma',
  'drizzle-kit',
  'sequelize',
  'sequelize-cli',
  'knex',
  'typeorm',
  'migrate',
  'sqlx',
  'diesel',
  'mix',
  'flyway',
  'liquibase',
  'goose',
  'dbmate'
]);

export const isRunnableMigrationCommand = (command: string): boolean => {
  if (!COMMAND_SHAPE.test(command)) return false;
  const first = command.split(' ')[0];
  return first !== undefined && KNOWN_RUNNERS.has(first);
};

const pascalCase = (value: string): string =>
  value
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, character: string) => character.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^(.)/, (character) => character.toUpperCase());

type ComposedScript = {
  type: 'local-script' | 'local-script-with-bastion-tunneling';
  properties: Record<string, unknown>;
};

export type ComposedMigrationHooks = {
  scripts: Record<string, ComposedScript>;
  afterDeploy: Array<{ scriptName: string }>;
  /**
   * Services whose migration this deploy now owns. Their packaging must suppress Nixpacks' own
   * Procfile `release` replay — caught on the first real-AWS lane run, where the image build ran
   * `node migrate.js` against a database that does not exist at build time.
   */
  hookedServices: string[];
  gaps: Array<{ subject: string; message: string }>;
};

const shouldRunOnDeploy = (migration: MigrationFact, assumptions: readonly Assumption[]): boolean => {
  // The application migrates itself on boot; adding a hook would run the migration twice.
  if (migration.runsAt === 'service-startup') return false;
  const decision = assumptions.find(
    (assumption) =>
      assumption.kind === 'migration-timing-unknown' &&
      (assumption.parameters as Record<string, unknown>).serviceName === migration.serviceName
  );
  if (decision !== undefined) return decision.chosen === 'deploy-hook';
  // A Procfile release phase is the repository saying, in its own words, "run this on deploy".
  return migration.runsAt === 'ci';
};

export const composeMigrationHooks = ({
  migrations,
  services,
  dependencies,
  composedDependencies,
  assumptions,
  projectName,
  privateDatabaseResourceNames = new Set<string>(),
  bastionResourceName
}: {
  migrations: readonly MigrationFact[];
  services: readonly ServiceFact[];
  dependencies: readonly DependencyFact[];
  composedDependencies: ReadonlyMap<string, { kind: DependencyFact['kind']; resourceName: string }>;
  assumptions: readonly Assumption[];
  projectName: string | undefined;
  privateDatabaseResourceNames?: ReadonlySet<string>;
  bastionResourceName?: string;
}): ComposedMigrationHooks => {
  const scripts: Record<string, ComposedScript> = {};
  const afterDeploy: Array<{ scriptName: string }> = [];
  const hookedServices: string[] = [];
  const gaps: Array<{ subject: string; message: string }> = [];
  const taken = new Set<string>();

  for (const migration of migrations) {
    if (!shouldRunOnDeploy(migration, assumptions)) continue;

    if (!isRunnableMigrationCommand(migration.command)) {
      gaps.push({
        subject: `${migration.serviceName}.migrations`,
        message: `We found ${migration.tool} migrations for ${migration.serviceName} but did not wire the command "${migration.command}" automatically. Add it as a script and an afterDeploy hook once you have reviewed it.`
      });
      continue;
    }

    // The databases this service actually consumes are the ones the migration needs to reach.
    const databases = dependencies
      .filter((dependency) => dependency.consumedBy.includes(migration.serviceName))
      .map((dependency) => ({ dependency, composed: composedDependencies.get(dependency.name) }))
      .filter(
        (
          entry
        ): entry is { dependency: DependencyFact; composed: { kind: DependencyFact['kind']; resourceName: string } } =>
          entry.composed !== undefined && DATABASE_KINDS.has(entry.composed.kind)
      );

    // The migration tool reads the same variable names the application does, so the script gets
    // the service's own proven database variables, wired identically. Nothing is invented: a name
    // that was never observed is not written.
    const owner = services.find((service) => service.name === migration.serviceName);
    const environment: Array<{ name: string; value: unknown }> = [];
    for (const variable of owner?.environmentVariables ?? []) {
      if (variable.role !== 'infra-dependency' || variable.dependencyName === undefined) continue;
      const composed = composedDependencies.get(variable.dependencyName);
      if (composed === undefined || !DATABASE_KINDS.has(composed.kind)) continue;
      const wiring = wiringFor(composed.kind, variable.name);
      if (wiring.kind === 'param') {
        environment.push({
          name: variable.name,
          value: `$ResourceParam('${composed.resourceName}', '${wiring.param}')`
        });
      } else if (wiring.kind === 'password-secret') {
        // This must be byte-for-byte the same reference used by the database credentials.
        environment.push({
          name: variable.name,
          value: generatedDatabasePasswordSecretReference(projectName, composed.resourceName)
        });
      }
    }

    const preferred = migrations.length === 1 ? 'migrateDatabase' : `migrate${pascalCase(migration.serviceName)}`;
    let scriptName = preferred;
    for (let suffix = 2; taken.has(scriptName); suffix += 1) scriptName = `${preferred}${suffix}`;
    taken.add(scriptName);

    const usesPrivateDatabase = databases.some((entry) =>
      privateDatabaseResourceNames.has(entry.composed.resourceName)
    );
    if (usesPrivateDatabase && bastionResourceName === undefined) {
      gaps.push({
        subject: `${migration.serviceName}.migrations`,
        message: `The migration for ${migration.serviceName} needs a private database, but no bastion was composed. Add a bastion and a tunneled local script before deploying.`
      });
      continue;
    }

    scripts[scriptName] = {
      type: usesPrivateDatabase ? 'local-script-with-bastion-tunneling' : 'local-script',
      properties: {
        executeCommand: migration.command,
        ...(usesPrivateDatabase ? { bastionResource: bastionResourceName } : {}),
        ...(databases.length > 0 ? { connectTo: databases.map((entry) => entry.composed.resourceName) } : {}),
        ...(environment.length > 0 ? { environment } : {})
      }
    };
    afterDeploy.push({ scriptName });
    if (!hookedServices.includes(migration.serviceName)) hookedServices.push(migration.serviceName);
  }

  return { scripts, afterDeploy, hookedServices, gaps };
};
