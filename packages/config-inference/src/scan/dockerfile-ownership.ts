/**
 * Whether a Dockerfile is somebody's work, or a template that wandered in.
 *
 * A hand-tuned Dockerfile is the most faithful description of how a service runs and must stay
 * authoritative. But a large share of real Dockerfiles are copied from a tutorial or generated
 * once and never touched — and for those, Stacktape's own packaging is the better path: optimized,
 * tested, and maintained, where the copied file is frozen at whatever its source knew. The user
 * asked for exactly this judgment: manage packaging for the normal case, defer for the custom one.
 *
 * The mechanism is the house pattern, not a silent override: a recognizably-boilerplate Dockerfile
 * raises a `dockerfile-ownership` decision recommending Stacktape's packaging. The wizard shows it
 * as a changed-in-one-click card, the file itself is never modified, and a service whose Dockerfile
 * is its *only* proven way to run is never asked — taking the file away would leave nothing.
 *
 * Classification is conservative in the custom direction: any signal of real work — extra system
 * packages, custom entrypoint scripts, healthchecks, volumes, unusual bases — keeps the file
 * authoritative. Being wrong toward "custom" costs nothing; being wrong toward "boilerplate" swaps
 * a packaging the preflight would then have to catch.
 */

import type { ServiceFactInput } from '../facts/service';
import type { Uncertainty } from '../facts/uncertainty';
import { citeFirstMatch } from './probe';
import type { SourceRead } from './read-source';

/** Base images whose presence says "standard setup" rather than "custom infrastructure". */
const STANDARD_BASE_IMAGE =
  /^(?:public\.ecr\.aws\/docker\/library\/|docker\.io\/library\/)?(?:node|python|ruby|golang|go|php|openjdk|eclipse-temurin|amazoncorretto|maven|gradle|rust|elixir|erlang|dotnet|mcr\.microsoft\.com\/dotnet|nginx|alpine|debian|ubuntu|busybox|distroless|gcr\.io\/distroless)(?:[:/@].*)?$/i;

/** System packages a template installs without meaning anything by it. */
const INNOCUOUS_PACKAGES: ReadonlySet<string> = new Set([
  'curl',
  'wget',
  'ca-certificates',
  'tini',
  'dumb-init',
  'tzdata',
  'git',
  'openssl',
  'libc6-compat',
  'bash',
  '--no-cache',
  '--no-install-recommends',
  '-y',
  '--yes',
  'update',
  'install',
  'add',
  '&&',
  'apk',
  'apt-get',
  'apt',
  'rm',
  '-rf',
  '/var/lib/apt/lists/*',
  'clean'
]);

export type DockerfileReading = 'boilerplate' | 'custom';

/** One instruction per entry, continuation lines folded in, comments and blanks dropped. */
const instructionsOf = (contents: string): string[] => {
  const folded = contents.replace(/\\\r?\n/g, ' ');
  return folded
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
};

export const classifyDockerfile = (contents: string): DockerfileReading => {
  const instructions = instructionsOf(contents);

  const fromImages = instructions
    .filter((line) => /^FROM\s/i.test(line))
    .map((line) => line.replace(/^FROM\s+(?:--platform=\S+\s+)?/i, '').split(/\s+/)[0] ?? '');
  if (fromImages.length === 0 || fromImages.length > 2) return 'custom';
  // `FROM builder` in a two-stage file references the earlier stage by its alias, which is fine.
  const stageAliases = new Set(
    instructions
      .map((line) => /^FROM\s+.*\sAS\s+(\S+)/i.exec(line)?.[1]?.toLowerCase())
      .filter((alias): alias is string => alias !== undefined)
  );
  for (const image of fromImages) {
    if (!stageAliases.has(image.toLowerCase()) && !STANDARD_BASE_IMAGE.test(image)) return 'custom';
  }

  for (const line of instructions) {
    if (/^(HEALTHCHECK|VOLUME|ONBUILD|STOPSIGNAL)\b/i.test(line)) return 'custom';
    // An entrypoint pointing at a script of their own is authored behavior, not template noise.
    if (/^ENTRYPOINT\b/i.test(line) && /\.sh\b/.test(line)) return 'custom';
    if (
      /^RUN\b/i.test(line) &&
      /\b(apk\s+add|apt-get\s+install|apt\s+install|yum\s+install|dnf\s+install)\b/i.test(line)
    ) {
      const tokens = line
        .replace(/^RUN\s+/i, '')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0 && !token.startsWith('$'));
      const meaningful = tokens.filter(
        (token) => !INNOCUOUS_PACKAGES.has(token) && !token.startsWith('-') && !/[=/;]/.test(token)
      );
      if (meaningful.length > 0) return 'custom';
    }
  }

  // A template is short. Twelve real instructions of COPY/RUN/ENV is somebody building something.
  const working = instructions.filter((line) => /^(RUN|COPY|ADD|ENV|ARG)\b/i.test(line));
  if (working.length > 12) return 'custom';

  return 'boilerplate';
};

/**
 * Raise the ownership decision for every service whose Dockerfile reads as a template.
 *
 * Only when another proven way to run the service exists: without one, taking the Dockerfile away
 * would leave the service unstartable, and a decision with one survivable answer is not a decision.
 */
export const raiseDockerfileOwnership = async ({
  services,
  read
}: {
  services: readonly ServiceFactInput[];
  read: (repoRelativePath: string) => Promise<SourceRead>;
}): Promise<Uncertainty[]> => {
  const uncertainties: Uncertainty[] = [];

  for (const service of services) {
    if (service.dockerfile === undefined) continue;
    if (service.containerEntrypoint === undefined && service.startCommand === undefined) continue;

    // oxlint-disable-next-line no-await-in-loop -- one Dockerfile per service, read in order.
    const result = await read(service.dockerfile);
    if (result.kind !== 'contents') continue;
    if (classifyDockerfile(result.contents) !== 'boilerplate') continue;

    const citation = citeFirstMatch(service.dockerfile, result.contents, /^FROM\s/i);
    uncertainties.push({
      kind: 'dockerfile-ownership',
      id: `dockerfile-ownership:${service.name}`,
      blocksDeploy: false,
      evidence: citation === undefined ? [] : [citation],
      source: 'probe',
      serviceName: service.name,
      dockerfilePath: service.dockerfile,
      recommended: 'stacktape-packaging'
    });
  }

  return uncertainties;
};
