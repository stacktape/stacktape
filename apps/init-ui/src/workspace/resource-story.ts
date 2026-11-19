/**
 * What the workspace says about each resource, and the order it tells it in.
 *
 * One story per resource: its plain name, why it is there (the line of code that called for it), its price. The reveal
 * plays the stories one at a time, the diagram's hover cards and the editor's code lenses read them afterwards. Pure
 * functions over the session state, so the words and the order can be tested without a browser.
 */

import type { WizardState } from '../session';
import { plainResourceName, technologyOf } from '../steps/review-model';

type Resources = Record<string, { type: string; properties: Record<string, unknown> }>;
type Service = NonNullable<WizardState['facts']>['services'][number];
export type Evidence = { file: string; line: number; quote: string };

export type ResourceStory = {
  name: string;
  type: string;
  /** "Postgres database", "Next.js app", "Web service (FastAPI)". */
  plainName: string;
  /** Why it is there, in our words (never the agent's). Absent for a resource added by hand. */
  reason?: string;
  /** The one line of code that best shows why: the framework or the dependency, when one is cited. */
  evidence?: Evidence;
  /** `$15/mo`, `Pay per use`, or absent until the price arrives. */
  priceLabel?: string;
  /** The fixed monthly amount, for adding up. Absent when unknown; 0 for pay-per-use. */
  monthly?: number;
};

export type Chip = { id: string; label: string; kind: 'resource' | 'secrets' | 'external'; type?: string };

/** The app first, then its data, then the rest: the order a person explains an architecture in. */
const RANKS: ReadonlyArray<readonly [RegExp, number]> = [
  [/^(nextjs|nuxt|sveltekit|astro|remix|solid-start)-web$|^web-service$/, 0],
  [/^(private-service|worker-service|multi-container-workload|function|batch-job|hosting-bucket)$/, 1],
  [/^(relational-database|redis-cluster|upstash-redis|dynamo-db-table|mongo-db-atlas-cluster|efs-filesystem)$/, 2],
  [/^(bucket|sqs-queue|sns-topic|event-bus|open-search-domain|user-auth-pool|state-machine)$/, 3]
];
const rankOf = (type: string): number => RANKS.find(([pattern]) => pattern.test(type))?.[1] ?? 4;

const squash = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The scanned service a resource runs, matched loosely: `go-clean-template` became `goCleanTemplate`. */
export const serviceFor = (state: WizardState, resourceName: string): Service | undefined =>
  state.facts?.services.find((service) => squash(service.name) === squash(resourceName));

const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );

/**
 * The citation that shows best why a resource exists. For an app: the line naming its framework (`"next"`, `FastAPI(`),
 * else a marker line that is not a build detail. For anything else: the first citation the composition gave.
 */
export const bestEvidence = (state: WizardState, resourceName: string): Evidence | undefined => {
  const service = serviceFor(state, resourceName);
  const provenance = state.composition?.provenance[resourceName]?.evidence ?? [];
  if (service === undefined) return provenance[0];
  const candidates: Array<Evidence & { field?: string }> = [...service.evidence, ...provenance];
  const framework = service.framework?.toLowerCase().replace(/js$/, '');
  return (
    (framework === undefined ? undefined : candidates.find((entry) => words(entry.quote).has(framework))) ??
    candidates.find((entry) => entry.field === undefined) ??
    provenance[0] ??
    candidates[0]
  );
};

/** `"postgres"` reads as `postgres`; anything longer is shown as written. */
export const quoteLabel = (quote: string): string => {
  const trimmed = quote.trim();
  return /^"[^"]+":?$/.test(trimmed) ? trimmed.replace(/^"|":?$|"$/g, '') : trimmed;
};

const parseMonthly = (label: string | undefined): number | undefined => {
  if (label === undefined) return undefined;
  if (label === 'pay-per-use') return 0;
  const amount = /^\$([\d,]+(?:\.\d+)?)/.exec(label)?.[1];
  return amount === undefined ? undefined : Number(amount.replaceAll(',', ''));
};

export const storyOf = (state: WizardState, name: string, resource: Resources[string]): ResourceStory => {
  const service = serviceFor(state, name);
  const technology = technologyOf(service);
  const provenance = state.composition?.provenance[name];
  const plainName = plainResourceName(resource, technology);
  // A runtime's own reason is about Stacktape ("first-class support for Next.js"); say what it runs instead.
  const reason =
    provenance === undefined
      ? undefined
      : technology !== undefined && provenance.reason.startsWith('Stacktape has first-class support')
        ? `Runs your ${technology} app, built the way ${technology} expects.`
        : provenance.reason;
  const evidence = bestEvidence(state, name);
  const raw = state.composition?.price?.byResource[name];
  const priceLabel = raw === undefined ? undefined : raw === 'pay-per-use' ? 'Pay per use' : raw;
  const monthly = parseMonthly(raw);
  return {
    name,
    type: resource.type,
    plainName,
    ...(reason === undefined ? {} : { reason }),
    ...(evidence === undefined ? {} : { evidence }),
    ...(priceLabel === undefined ? {} : { priceLabel }),
    ...(monthly === undefined ? {} : { monthly })
  };
};

export const storiesOf = (state: WizardState, resources: Resources): Record<string, ResourceStory> =>
  Object.fromEntries(Object.entries(resources).map(([name, resource]) => [name, storyOf(state, name, resource)]));

/** Resource names in telling order; resources of the same rank keep the file's order. */
export const tellingOrder = (resources: Resources): string[] =>
  Object.entries(resources)
    .map(([name, resource], index) => ({ name, rank: rankOf(resource.type), index }))
    .toSorted((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ name }) => name);

/**
 * The generated YAML cut into what the reveal types: everything up to and including `resources:`, one block per
 * resource (its key line to the next key), and whatever follows the resources. Joined in order they are the text.
 */
export const yamlSegments = (
  yaml: string
): { header: string; blocks: Array<{ name: string; text: string }>; trailer: string } => {
  const lines = yaml.split('\n');
  let offset = 0;
  let inResources = false;
  let headerEnd: number | undefined;
  let trailerStart: number | undefined;
  const starts: Array<{ name: string; at: number }> = [];
  for (const line of lines) {
    if (!inResources && trailerStart === undefined && /^resources:\s*$/.test(line)) {
      inResources = true;
      headerEnd = offset + line.length + 1;
    } else if (inResources) {
      const key = /^ {2}([^\s#][^:]*):\s*$/.exec(line);
      if (key !== null) starts.push({ name: key[1]!.replace(/^["']|["']$/g, ''), at: offset });
      else if (/^[^\s#]/.test(line)) {
        inResources = false;
        trailerStart = offset;
      }
    }
    offset += line.length + 1;
  }
  if (headerEnd === undefined || starts.length === 0) return { header: yaml, blocks: [], trailer: '' };
  const end = Math.min(trailerStart ?? yaml.length, yaml.length);
  const header = yaml.slice(0, Math.min(headerEnd, starts[0]!.at));
  const blocks = starts.map((start, index) => ({
    name: start.name,
    text: yaml.slice(start.at, index + 1 < starts.length ? starts[index + 1]!.at : end)
  }));
  return { header, blocks, trailer: yaml.slice(end) };
};

/** One line per resource in the chips row: "Next.js app", "Postgres", "3 secrets". */
const chipLabel = (story: ResourceStory, resource: Resources[string], technology: string | undefined): string => {
  if (resource.type === 'relational-database') return story.plainName.replace(/ database$/, '');
  if (technology === undefined || resource.type.endsWith('-web')) return story.plainName;
  return resource.type === 'hosting-bucket' ? `${technology} site` : `${technology} app`;
};

/** The secrets a service reads that only the user can supply: API keys and the like, not generated passwords. */
export const secretsOf = (service: Service | undefined): string[] => {
  const variables = (service as { environmentVariables?: Array<{ name?: unknown; role?: unknown }> } | undefined)
    ?.environmentVariables;
  return (variables ?? []).flatMap((variable) =>
    variable.role === 'third-party-secret' && typeof variable.name === 'string' ? [variable.name] : []
  );
};

const EXTERNAL_NAMES: Readonly<Record<string, string>> = {
  amqp: 'RabbitMQ',
  nats: 'NATS',
  kafka: 'Kafka',
  email: 'Email sending'
};

export type RevealStep = {
  story: ResourceStory;
  /** Which block of `yamlSegments(text).blocks` it types. */
  blockIndex: number;
  chips: Chip[];
  durationMs: number;
};

export type RevealPlan = { text: string; header: string; trailer: string; blocks: string[]; steps: RevealStep[] };

/** How long a resource takes to appear: 1.4 s each, quicker past five so the whole reveal stays near 8 s. */
export const stepDuration = (count: number): number =>
  Math.round(Math.max(700, Math.min(1400, 8000 / Math.max(1, count))));

/** The whole reveal, from the state the analysis finished with. Undefined when there is nothing to reveal. */
export const revealPlan = (state: WizardState): RevealPlan | undefined => {
  const text = state.composition?.configText?.yaml;
  const resources = state.composition?.resources ?? {};
  if (text === undefined || Object.keys(resources).length === 0) return undefined;
  const { header, blocks, trailer } = yamlSegments(text);
  const order = tellingOrder(resources).filter((name) => blocks.some((block) => block.name === name));
  if (order.length === 0) return undefined;
  const durationMs = stepDuration(order.length);
  const external = (state.facts?.dependencies ?? []).filter((dependency) => EXTERNAL_NAMES[dependency.kind]);
  const steps = order.map((name, index): RevealStep => {
    const resource = resources[name]!;
    const story = storyOf(state, name, resource);
    const service = serviceFor(state, name);
    const secrets = secretsOf(service);
    const chips: Chip[] = [
      { id: name, label: chipLabel(story, resource, technologyOf(service)), kind: 'resource', type: resource.type },
      ...(secrets.length === 0
        ? []
        : [
            {
              id: `${name}-secrets`,
              label: secrets.length === 1 ? '1 secret' : `${secrets.length} secrets`,
              kind: 'secrets' as const
            }
          ]),
      ...(index === order.length - 1
        ? external.map((dependency) => ({
            id: `external-${dependency.name}`,
            label: `${EXTERNAL_NAMES[dependency.kind]}, not created`,
            kind: 'external' as const
          }))
        : [])
    ];
    return { story, blockIndex: blocks.findIndex((block) => block.name === name), chips, durationMs };
  });
  return { text, header, trailer, blocks: blocks.map((block) => block.text), steps };
};

/** Every chip the reveal shows, in order: what the review keeps after a skip or a reload. */
export const allChips = (plan: RevealPlan | undefined): Chip[] => plan?.steps.flatMap((step) => step.chips) ?? [];
