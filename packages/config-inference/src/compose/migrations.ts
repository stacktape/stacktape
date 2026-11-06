/**
 * Turning detected migrations into the deploy hook the user was promised.
 *
 * Three probes find the tool and the command, the assembler forwards the attribution through
 * service renames, and the wizard shows a "runs as a deploy hook" decision — so the composer has
 * to actually emit the hook, or the decision card describes machinery that does not exist and a
 * Rails or Django first deploy ships a schema-less database.
 *
 * A container service gets a `releaseCommand`: the migration runs inside the VPC in the deployed image with the service's
 * own environment, before anything switches to the new code, and a failure stops the deploy. Everything else keeps the
 * `local-script` pattern with `connectTo`, referenced from `hooks.afterDeploy`: a function has no container image to run
 * it in, and a project's own Dockerfile may leave out a tool that is only in `devDependencies`. A public database uses
 * `local-script`. A VPC-only database uses `local-script-with-bastion-tunneling`, keeping the same reviewed command and
 * environment while the CLI substitutes its remote database endpoints with local SSM tunnel endpoints.
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

import { posix } from 'node:path';
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

const isRunnableMigrationCommand = (command: string): boolean => {
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

/** What decides whether a migration can run in a service's image. Absent for anything that is not a container service. */
export type ReleaseCommandTarget = {
  packagingType: string;
  /** The directory the image is built from. */
  buildRoot: string;
  /** Where the service's code is, and so where its migration tool runs unless the migration says otherwise. */
  servicePath: string;
};

export type ComposedReleaseCommand = string | { command: string; runWhenChanged: string[] };

export type ComposedMigrationHooks = {
  /** By service name. */
  releaseCommands: Map<string, ComposedReleaseCommand>;
  scripts: Record<string, ComposedScript>;
  afterDeploy: Array<{ scriptName: string }>;
  /**
   * Services whose migration this deploy now owns. Their image build must not replay it: the old Nixpacks
   * Procfile `release` replay — caught on the first real-AWS lane run, where the image build ran
   * `node migrate.js` against a database that does not exist at build time.
   */
  hookedServices: string[];
  gaps: Array<{ subject: string; message: string }>;
};

/**
 * The command as it runs in the service's image, or undefined when it can't run there. A Stacktape-built image holds the
 * tool whatever kind of dependency it is; a `js-bundle` service gets a full-project image for the command. A project's
 * own Dockerfile decides for itself what it installs and where it puts files, so it only qualifies when the command needs
 * no assumption about either.
 */
const commandInImage = (migration: MigrationFact, target: ReleaseCommandTarget): string | undefined => {
  if (target.packagingType === 'prebuilt-image') return undefined;
  const root = target.packagingType === 'js-bundle' ? '.' : target.buildRoot;
  const directory = posix.relative(root, migration.directory ?? target.servicePath);
  if (directory.startsWith('..')) return undefined;
  if (target.packagingType === 'dockerfile' && (directory !== '' || migration.toolIsDevDependency === true)) {
    return undefined;
  }
  return directory === '' ? migration.command : `cd ${directory} && ${migration.command}`;
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

const TOOL_LABELS: Readonly<Record<string, string>> = {
  alembic: 'Alembic',
  django: 'Django migrations',
  rails: 'Rails migrations',
  prisma: 'Prisma Migrate',
  drizzle: 'Drizzle Kit',
  knex: 'Knex migrations',
  typeorm: 'TypeORM migrations',
  sequelize: 'Sequelize migrations',
  ecto: 'Ecto migrations',
  flyway: 'Flyway',
  liquibase: 'Liquibase',
  'golang-migrate': 'golang-migrate'
};
const toolLabel = (tool: string): string => TOOL_LABELS[tool] ?? `${tool} migrations`;

/**
 * A migration tool in the dependencies that nothing runs: no release phase, no decision, and not in the service's own
 * start command. Its first deploy and its first `stacktape dev` start then serve a database without tables.
 */
const runsNowhere = (
  migration: MigrationFact,
  assumptions: readonly Assumption[],
  services: readonly ServiceFact[]
): boolean => {
  if (migration.runsAt !== 'unknown') return false;
  const decided = assumptions.some(
    (assumption) =>
      assumption.kind === 'migration-timing-unknown' &&
      (assumption.parameters as Record<string, unknown>).serviceName === migration.serviceName
  );
  if (decided) return false;
  const startCommand = services.find((service) => service.name === migration.serviceName)?.startCommand;
  return startCommand === undefined || !startCommand.includes(migration.command.replace(/^npx /, ''));
};

export const composeMigrationHooks = ({
  migrations,
  services,
  dependencies,
  composedDependencies,
  assumptions,
  projectName,
  privateDatabaseResourceNames = new Set<string>(),
  bastionResourceName,
  serviceResourceNames,
  releaseCommandTargetOf = () => undefined
}: {
  migrations: readonly MigrationFact[];
  services: readonly ServiceFact[];
  dependencies: readonly DependencyFact[];
  composedDependencies: ReadonlyMap<string, { kind: DependencyFact['kind']; resourceName: string }>;
  assumptions: readonly Assumption[];
  projectName: string | undefined;
  privateDatabaseResourceNames?: ReadonlySet<string>;
  bastionResourceName?: string;
  /** The config's name for each service, which is what an item tells the user to edit. */
  serviceResourceNames?: ReadonlyMap<string, string>;
  releaseCommandTargetOf?: (service: ServiceFact) => ReleaseCommandTarget | undefined;
}): ComposedMigrationHooks => {
  const releaseCommands = new Map<string, ComposedReleaseCommand>();
  /** A web service and a worker that share one database and one tool migrate it once. */
  const migratedOnce = new Set<string>();
  const scripts: Record<string, ComposedScript> = {};
  const afterDeploy: Array<{ scriptName: string }> = [];
  const hookedServices: string[] = [];
  const gaps: Array<{ subject: string; message: string }> = [];
  const taken = new Set<string>();

  for (const migration of migrations) {
    if (!shouldRunOnDeploy(migration, assumptions)) {
      // A SQLite file is only reachable from inside the app; composition already asks for a start-command migration.
      const usesSqlite = dependencies.some(
        (dependency) => dependency.kind === 'sqlite' && dependency.consumedBy.includes(migration.serviceName)
      );
      // Only a service the config deploys: the item names the resource to edit.
      const resourceName = serviceResourceNames?.get(migration.serviceName) ?? migration.serviceName;
      const deployed = services.some((service) => service.name === migration.serviceName);
      if (deployed && !usesSqlite && runsNowhere(migration, assumptions, services)) {
        gaps.push({
          subject: `${migration.serviceName}.migrations`,
          message: `${resourceName} depends on ${toolLabel(migration.tool)}, but nothing we found runs "${migration.command}". Set it as ${resourceName}'s releaseCommand, or run it at the start of ${resourceName}'s start command.`
        });
      }
      continue;
    }

    if (!isRunnableMigrationCommand(migration.command)) {
      gaps.push({
        subject: `${migration.serviceName}.migrations`,
        message: `We found ${migration.tool} migrations for ${migration.serviceName} but did not wire the command "${migration.command}" automatically. Set it as the service's releaseCommand once you have reviewed it.`
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

    const service = services.find(({ name }) => name === migration.serviceName);
    const target = service === undefined ? undefined : releaseCommandTargetOf(service);
    const command = target === undefined ? undefined : commandInImage(migration, target);
    if (command !== undefined) {
      const sameMigration = JSON.stringify([
        command,
        databases.map(({ composed }) => composed.resourceName).sort()
      ]);
      if (!migratedOnce.has(sameMigration)) {
        migratedOnce.add(sameMigration);
        releaseCommands.set(
          migration.serviceName,
          migration.migrationsPath === undefined
            ? command
            : { command, runWhenChanged: [migration.migrationsPath] }
        );
      }
      if (!hookedServices.includes(migration.serviceName)) hookedServices.push(migration.serviceName);
      continue;
    }

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
        // Scripts run from the project root; `api/Procfile`'s `python manage.py migrate` needs `api/`.
        ...(migration.directory === undefined || migration.directory === '.' ? {} : { cwd: migration.directory }),
        ...(usesPrivateDatabase ? { bastionResource: bastionResourceName } : {}),
        ...(databases.length > 0 ? { connectTo: databases.map((entry) => entry.composed.resourceName) } : {}),
        ...(environment.length > 0 ? { environment } : {})
      }
    };
    afterDeploy.push({ scriptName });
    if (!hookedServices.includes(migration.serviceName)) hookedServices.push(migration.serviceName);
  }

  return { releaseCommands, scripts, afterDeploy, hookedServices, gaps };
};
