/**
 * What the ecosystem defines when the repository writes nothing down.
 *
 * A Spring Boot project has no start command in it because every Spring Boot project starts the
 * same way — the convention IS the documentation. Demanding textual proof from the repository for
 * these ecosystems produced dead ends on precisely the projects that follow their conventions most
 * faithfully. This table is the missing knowledge, ported from the previous generation's prompt
 * tables into data that can be tested.
 *
 * The delivery mechanism keeps every safety property: nothing here writes a fact directly. A
 * convention becomes the suggestion on a `command-unknown` uncertainty, which the assumption
 * machinery auto-answers and the wizard shows as a changeable "decided for you" card, cited by the
 * manifest lines that proved the framework. A wrong convention is therefore a visible one-click
 * correction — never silent infrastructure.
 *
 * What earns an entry: the recommended command must be the ecosystem's canonical way to run in a
 * container, not a development server, and it must not require knowledge the scan does not have.
 * Django and Flask are deliberately absent — their production commands need the WSGI module path,
 * and a guessed module is a broken deploy with a confusing face. When source-level probes prove
 * the entrypoint, those frameworks never reach this table anyway.
 */

import { SELF_PACKAGING_FRAMEWORKS } from '../facts/project-facts';
import type { ServiceFactInput } from '../facts/service';
import type { Uncertainty } from '../facts/uncertainty';

/** Ordered: the first entry is the recommendation, the rest are real alternatives on the card. */
export type ConventionalCommands = {
  start: string[];
  build?: string[];
};

type ConventionContext = {
  framework: string | undefined;
  language: string;
  /** Whether a file exists at the service's root (repository-relative check, path-aware). */
  has: (relativePath: string) => boolean;
  /** Paths under the service root, for layout checks like Go's `cmd/` convention. */
  filesUnderRoot: readonly string[];
};

const JVM_FRAMEWORKS = new Set(['spring-boot', 'quarkus', 'micronaut']);

const jvmCommands = (context: ConventionContext): ConventionalCommands | undefined => {
  const maven = context.has('pom.xml');
  const gradle = context.has('build.gradle') || context.has('build.gradle.kts');
  if (!maven && !gradle) return undefined;
  // The wrapper is the project's own pinned toolchain; prefer it whenever it is checked in.
  const mvn = context.has('mvnw') ? './mvnw' : 'mvn';
  const gradlew = context.has('gradlew') ? './gradlew' : 'gradle';

  // A `build` entry is attached only when the recommended start command needs one to have run
  // first. The self-building forms (`spring-boot:run`, `bootRun`, `mn:run`) would make the build a
  // decided-for-you card that changes nothing, and every needless card is friction.
  if (context.framework === 'spring-boot') {
    return maven
      ? { start: [`${mvn} spring-boot:run`, 'java -jar target/*.jar'] }
      : { start: [`${gradlew} bootRun`, 'java -jar build/libs/*.jar'] };
  }
  if (context.framework === 'quarkus') {
    // Quarkus' run-from-source mode is explicitly a dev mode, so the recommendation is the packaged
    // form its own build produces.
    return maven
      ? {
          start: ['java -jar target/quarkus-app/quarkus-run.jar'],
          build: [`${mvn} -DskipTests package`]
        }
      : {
          start: ['java -jar build/quarkus-app/quarkus-run.jar'],
          build: [`${gradlew} build -x test`]
        };
  }
  if (context.framework === 'micronaut') {
    return maven ? { start: [`${mvn} mn:run`] } : { start: [`${gradlew} run`, 'java -jar build/libs/*-all.jar'] };
  }
  return undefined;
};

const goCommands = (context: ConventionContext): ConventionalCommands | undefined => {
  if (!context.has('go.mod')) return undefined;
  if (context.has('main.go')) return { start: ['go run .'] };
  // The `cmd/<name>/main.go` layout: unambiguous only when there is exactly one command.
  const commandMains = context.filesUnderRoot.filter((file) => /^cmd\/[^/]+\/main\.go$/.test(file));
  if (commandMains.length === 1) {
    const directory = commandMains[0]!.slice(0, -'/main.go'.length);
    return { start: [`go run ./${directory}`] };
  }
  return undefined;
};

/**
 * The conventional way to build and start a service of this shape, or nothing.
 *
 * Returning nothing is a real answer: it means the ecosystem's convention cannot be stated without
 * guessing, and the honest outcome is the same open question the pipeline raises today.
 */
export const conventionalCommandsFor = (context: ConventionContext): ConventionalCommands | undefined => {
  if (context.framework !== undefined && JVM_FRAMEWORKS.has(context.framework)) return jvmCommands(context);

  switch (context.framework) {
    case 'rails':
      // `bin/rails` is generated into every Rails app; the server it starts (Puma) is the
      // production server, not a development stand-in.
      return {
        start: [`${context.has('bin/rails') ? 'bin/rails' : 'bundle exec rails'} server -b 0.0.0.0`]
      };
    case 'phoenix':
      return { start: ['mix phx.server'] };
    case 'laravel':
      return { start: ['php artisan serve --host 0.0.0.0 --port 8000'] };
    case 'symfony':
      // The PHP built-in server rooted at `public/` — no Symfony CLI assumed.
      return context.has('public/index.php') ? { start: ['php -S 0.0.0.0:8000 -t public'] } : undefined;
    case 'aspnet':
      return { start: ['dotnet run'] };
    case 'axum':
    case 'actix':
    case 'rocket':
    case 'warp':
      return context.has('Cargo.toml') ? { start: ['cargo run --release'] } : undefined;
    case 'gin':
    case 'echo':
    case 'fiber':
    case 'chi':
    case 'gorilla':
      return goCommands(context);
    default:
      break;
  }

  // Language-level conventions, for services whose framework the table does not name.
  if (context.language === 'dotnet') return { start: ['dotnet run'] };
  if (context.language === 'go') return goCommands(context);
  return undefined;
};

/** Whether anything textual already establishes how this service runs. */
const hasTextualStartAnswer = (service: ServiceFactInput): boolean =>
  service.startCommand !== undefined ||
  service.dockerfile !== undefined ||
  service.containerEntrypoint !== undefined ||
  service.functionEntrypoint !== undefined ||
  service.servesStaticAssets !== undefined ||
  SELF_PACKAGING_FRAMEWORKS.has(service.framework ?? '');

/**
 * Raise the open question the convention can answer, for every service that would otherwise be a
 * dead end.
 *
 * Fires only where nothing textual established how the service runs — no command, no entrypoint,
 * no Dockerfile, not a static bundle, not a self-packaging framework. The uncertainty it raises is
 * the same `command-unknown` the completeness check names as the honest escape hatch; the pack's
 * commands ride in as suggestions, so the assumption machinery answers with the convention and the
 * wizard shows it as a changeable decision, cited by the evidence that proved the framework.
 */
export const raiseConventionalCommands = ({
  services,
  files
}: {
  services: readonly ServiceFactInput[];
  files: readonly string[];
}): Uncertainty[] => {
  const fileSet = new Set(files);
  const uncertainties: Uncertainty[] = [];

  for (const service of services) {
    if (hasTextualStartAnswer(service)) continue;

    const prefix = service.path === '.' ? '' : `${service.path}/`;
    const commands = conventionalCommandsFor({
      framework: service.framework,
      language: service.language,
      has: (relativePath) => fileSet.has(`${prefix}${relativePath}`),
      filesUnderRoot: files
        .filter((file) => prefix === '' || file.startsWith(prefix))
        .map((file) => file.slice(prefix.length))
    });
    if (commands === undefined) continue;

    const evidence = (service.evidence ?? []).slice(0, 2);
    uncertainties.push({
      kind: 'command-unknown',
      id: `command-unknown:${service.name}:start`,
      blocksDeploy: true,
      evidence,
      source: 'probe',
      serviceName: service.name,
      command: 'start',
      suggestions: commands.start
    });
    if (commands.build !== undefined && service.buildCommand === undefined) {
      uncertainties.push({
        kind: 'command-unknown',
        id: `command-unknown:${service.name}:build`,
        blocksDeploy: false,
        evidence,
        source: 'probe',
        serviceName: service.name,
        command: 'build',
        suggestions: commands.build
      });
    }
  }

  return uncertainties;
};

/**
 * An external build-planner the CLI can inject. This package runs no binaries itself — the
 * capability arrives from outside, which is what keeps the scan testable without one.
 */
export type CommandPlanner = {
  /** The start command the container builder would generate for this directory, or null. */
  planStart: (serviceRelativePath: string) => Promise<string | null>;
};

/** Planner invocations are subprocess executions; a pathological monorepo must not spawn dozens. */
const MAX_PLANNER_CALLS = 4;

/**
 * Ask the container builder itself, for the services nothing else could answer.
 *
 * This is the strongest kind of suggestion there is, because it is not a guess about the build —
 * it is the build. Nixpacks' `plan` is the exact analysis its `build` runs later, so the suggested
 * command is what the packaged container would do anyway; accepting it merely writes reality down
 * where the user can see and change it. It covers the ecosystems the curated table deliberately
 * refuses (a WSGI module path the scan cannot know, Nixpacks' Python provider derives from the
 * files), and it runs last: the curated table's commands are tuned for the card, so where both
 * know an answer the table has already spoken.
 */
export const raisePlannedCommands = async ({
  services,
  planner,
  alreadyRaised
}: {
  services: readonly ServiceFactInput[];
  planner: CommandPlanner;
  /** Ids the assembler already holds, so the oracle never overrides the curated table. */
  alreadyRaised: (id: string) => boolean;
}): Promise<Uncertainty[]> => {
  const uncertainties: Uncertainty[] = [];
  let calls = 0;

  for (const service of services) {
    if (hasTextualStartAnswer(service)) continue;
    const id = `command-unknown:${service.name}:start`;
    if (alreadyRaised(id)) continue;
    if (calls >= MAX_PLANNER_CALLS) break;
    calls += 1;
    // oxlint-disable-next-line no-await-in-loop -- bounded by MAX_PLANNER_CALLS; order is identity.
    const planned = await planner.planStart(service.path);
    if (planned === null || planned.trim().length === 0) continue;
    uncertainties.push({
      kind: 'command-unknown',
      id,
      blocksDeploy: true,
      evidence: (service.evidence ?? []).slice(0, 2),
      source: 'probe',
      serviceName: service.name,
      command: 'start',
      suggestions: [planned.trim()]
    });
  }

  return uncertainties;
};
