/**
 * What the workspace says about each resource, and the order it tells it in.
 *
 * One story per resource: its plain name, why it is there (the line of code that called for it), its price. The reveal
 * plays the stories one at a time, the diagram's hover cards and the editor's code lenses read them afterwards. Pure
 * functions over the session state, so the words and the order can be tested without a browser.
 */

import type { FileView, WizardState } from '../session';
import { resourceTitle, splitMonthly, technologyOf } from '../steps/review-model';

type Resources = Record<string, { type: string; properties: Record<string, unknown> }>;
type Service = NonNullable<WizardState['facts']>['services'][number];
export type Evidence = { file: string; line: number; quote: string };

export type ResourceStory = {
  name: string;
  type: string;
  /** "Postgres database", "Next.js site", "FastAPI service": the diagram's name for it too (`resourceTitle`). */
  plainName: string;
  /** Why it is there, in our words (never the agent's). Absent for a resource added by hand. */
  reason?: string;
  /** The one line of code that best shows why: the framework or the dependency, when one is cited. */
  evidence?: Evidence;
  /** Every citation behind the resource, so lines next to the best one can be shown with it. */
  citations?: Evidence[];
  /** A word the right line contains (`sqlite`, `postgres`), for finding it when a citation's line number is off. */
  hint?: string;
  /** What it is built from, in a person's words: the app's framework ("Next.js") or the data's engine ("Postgres"). */
  technology?: string;
  /**
   * Stacktape adds it for another resource rather than because the code asks for it, and why, said after "Added by
   * Stacktape": "so you can reach the private database". Its citations are the other resource's, so it shows none.
   */
  designChoice?: string;
  /** `$15/mo`, `Pay per use`, or absent until the price arrives. */
  priceLabel?: string;
  /** The fixed monthly amount, for adding up. Absent when unknown; 0 for pay-per-use. */
  monthly?: number;
};

/**
 * A citation checked against the file it names: the lines that really say it, and their text.
 *
 * Citations come from the scan and from the agent, and their line numbers are not always right: a probe that matched
 * `pgx` inside `otelpgx`, or the first `provider =` of a Prisma schema rather than the datasource's. The page shows
 * what the file really says, so it looks for the quote on the cited line, then as a whole word elsewhere in the file
 * (nearest first, preferring a line that also has the hint), and keeps the cited line when the quote is nowhere.
 */
export type Citation = {
  file: string;
  /** The line the finding points at, 1-based. */
  line: number;
  /** Every line to light up, ascending: the line and cited lines right next to it in the same file. */
  lines: number[];
  /** Each lit line's text, trimmed. */
  text: string[];
};

const squashSpaces = (text: string) => text.trim().replace(/\s+/g, ' ');
const isWordCharacter = (character: string | undefined) => character !== undefined && /[A-Za-z0-9_]/.test(character);

/** Whether `line` contains `quote` as written, not as part of a longer word: `pgx` is in `jackc/pgx/v5`, not `otelpgx`. */
export const quotedOn = (line: string, quote: string): boolean => {
  const needle = squashSpaces(quote).toLowerCase();
  if (needle === '') return false;
  const haystack = squashSpaces(line).toLowerCase();
  for (let at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, at + 1)) {
    const startsClean = !isWordCharacter(needle[0]) || !isWordCharacter(haystack[at - 1]);
    const endsClean = !isWordCharacter(needle.at(-1)) || !isWordCharacter(haystack[at + needle.length]);
    if (startsClean && endsClean) return true;
  }
  return false;
};

/** The line (1-based) that really holds `evidence`, in a file split into lines. */
export const locate = (lines: readonly string[], evidence: Evidence, hint?: string): number => {
  const found = lines.flatMap((text, index) => (quotedOn(text, evidence.quote) ? [index + 1] : []));
  if (found.length === 0) return evidence.line;
  const hinted = hint === undefined ? [] : found.filter((line) => lines[line - 1]!.toLowerCase().includes(hint));
  const candidates = hinted.length > 0 ? hinted : found;
  if (candidates.includes(evidence.line)) return evidence.line;
  return candidates.reduce((best, line) =>
    Math.abs(line - evidence.line) < Math.abs(best - evidence.line) ? line : best
  );
};

/** "29", or "10–11" for a citation lit with the line next to it. */
export const lineRange = (citation: Citation | undefined, evidence: { line: number }): string =>
  citation === undefined || citation.lines.length < 2
    ? String(citation?.line ?? evidence.line)
    : `${citation.lines[0]}–${citation.lines.at(-1)}`;

/** How close another citation in the same file has to be to be lit with the main one. */
const NEARBY_LINES = 3;

/** The story's citation as its file shows it. Undefined until the file's text is there. */
export const citationOf = (story: ResourceStory, file: FileView | undefined): Citation | undefined => {
  const evidence = story.evidence;
  if (evidence === undefined || file === undefined || file.status !== 'shown' || file.path !== evidence.file) {
    return undefined;
  }
  const lines = file.text.split('\n');
  const line = locate(lines, evidence, story.hint);
  const nearby = (story.citations ?? [])
    .filter((entry) => entry.file === evidence.file && entry !== evidence)
    .map((entry) => locate(lines, entry, story.hint))
    .filter((other) => Math.abs(other - line) <= NEARBY_LINES);
  const lit = [...new Set([line, ...nearby])].filter((entry) => entry >= 1 && entry <= lines.length).toSorted();
  return {
    file: evidence.file,
    line,
    lines: lit.length > 0 ? lit : [line],
    text: lit.map((entry) => lines[entry - 1]!.trim())
  };
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

/** Resources Stacktape adds for another one, and why, in a developer's words, after "Added by Stacktape". */
const DESIGN_CHOICES: Readonly<Record<string, string>> = {
  bastion: 'so you can reach the private database'
};

/** The data a dependency stands for, by its kind, as people name it. */
const DATA_ENGINES: Readonly<Record<string, string>> = {
  postgres: 'Postgres',
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  sqlite: 'SQLite',
  redis: 'Redis',
  mongodb: 'MongoDB',
  dynamodb: 'DynamoDB',
  opensearch: 'OpenSearch',
  elasticsearch: 'Elasticsearch'
};

const sameCitation = (left: Evidence | undefined, right: Evidence | undefined) =>
  left !== undefined &&
  right !== undefined &&
  left.file === right.file &&
  left.line === right.line &&
  left.quote === right.quote;

/** The word the cited line should contain: the framework's (`next`), or the dependency's kind (`sqlite`). */
const hintFor = (state: WizardState, service: Service | undefined, citations: readonly Evidence[]) => {
  if (service !== undefined) return service.framework?.toLowerCase().replace(/js$/, '');
  return state.facts?.dependencies.find((dependency) => sameCitation(dependency.evidence[0], citations[0]))?.kind;
};

export const storyOf = (state: WizardState, name: string, resource: Resources[string]): ResourceStory => {
  const service = serviceFor(state, name);
  const technology = technologyOf(service);
  const provenance = state.composition?.provenance[name];
  const plainName = resourceTitle(resource, technology);
  // A runtime's own reason is about Stacktape ("first-class support for Next.js"); say what it runs instead.
  const reason =
    provenance === undefined
      ? undefined
      : technology !== undefined && provenance.reason.startsWith('Stacktape has first-class support')
        ? `Runs your ${technology} app, built the way ${technology} expects.`
        : provenance.reason;
  const evidence = bestEvidence(state, name);
  const citations = [...(service?.evidence ?? []), ...(provenance?.evidence ?? [])];
  const hint = hintFor(state, service, provenance?.evidence ?? []);
  // A disk added for a SQLite file is named for what it keeps.
  const named = resource.type === 'efs-filesystem' && hint === 'sqlite' ? 'Disk for SQLite data' : plainName;
  const designChoice = provenance === undefined ? undefined : DESIGN_CHOICES[resource.type];
  const engine =
    resource.type === 'relational-database' ? plainName.replace(/ database$/, '') : DATA_ENGINES[hint ?? ''];
  const builtFrom = service === undefined ? engine : technology;
  const raw = state.composition?.price?.byResource[name];
  const priceLabel = raw === undefined ? undefined : raw === 'pay-per-use' ? 'Pay per use' : raw;
  const monthly = parseMonthly(raw);
  return {
    name,
    type: resource.type,
    plainName: named,
    ...(reason === undefined ? {} : { reason }),
    ...(evidence === undefined ? {} : { evidence }),
    ...(citations.length === 0 ? {} : { citations }),
    ...(hint === undefined ? {} : { hint }),
    ...(builtFrom === undefined ? {} : { technology: builtFrom }),
    ...(designChoice === undefined ? {} : { designChoice }),
    ...(priceLabel === undefined ? {} : { priceLabel }),
    ...(monthly === undefined ? {} : { monthly })
  };
};

/**
 * What stacktape.yml written so far costs, for the editor's header while the reveal writes it ("Estimate so far ·
 * $31/mo + usage"): "estimating…" until every resource written has a price (never "$0" beside a database), "Pay per
 * use" when nothing has a fixed price, then the fixed amount with "+ usage" once something is billed by use. Once every
 * resource is told, it is the estimate's own total (`whole`, "$31/mo + pay-per-use costs"), so the reveal ends on
 * Review's number rather than on a sum of rounded parts.
 */
export const runningPrice = (
  written: ReadonlyArray<Pick<ResourceStory, 'priceLabel' | 'monthly'>>,
  whole?: string
): { text: string; amount?: number } => {
  const total = whole === undefined ? undefined : splitMonthly(whole);
  const totalAmount = total?.amount === undefined ? undefined : Number(total.amount.slice(1).replaceAll(',', ''));
  if (total !== undefined && totalAmount !== undefined && Number.isFinite(totalAmount)) {
    return { text: `${total.amount}/mo${total.usage ? ' + usage' : ''}`, amount: totalAmount };
  }
  if (written.length === 0 || written.some((story) => story.monthly === undefined)) return { text: 'estimating…' };
  const amount = written.reduce((sum, story) => sum + (story.monthly ?? 0), 0);
  const usage = written.some((story) => story.priceLabel === 'Pay per use');
  if (amount === 0) return { text: 'Pay per use' };
  const rounded = Math.round(amount);
  return { text: `$${rounded.toLocaleString('en-US')}/mo${usage ? ' + usage' : ''}`, amount: rounded };
};

/** What a resource is, in the one word its own price is said with: "for this database". */
const PRICE_NOUNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^(relational-database|mongo-db-atlas-cluster)$/, 'database'],
  [/-web$|^hosting-bucket$/, 'site'],
  [/^(web-service|private-service|multi-container-workload)$/, 'service'],
  [/^worker-service$/, 'worker'],
  [/^(function|batch-job)$/, 'job'],
  [/^bastion$/, 'server'],
  [/^efs-filesystem$/, 'disk'],
  [/^(redis-cluster|upstash-redis)$/, 'cache'],
  [/^bucket$/, 'bucket'],
  [/^dynamo-db-table$/, 'table'],
  [/^sqs-queue$/, 'queue']
];

/**
 * A resource's own price, said so it cannot be read as the total: "$31/mo for this database", "Pay per use". Undefined
 * until the estimate has it.
 */
export const resourcePrice = (story: Pick<ResourceStory, 'type' | 'priceLabel'>): string | undefined => {
  if (story.priceLabel === undefined || story.priceLabel === 'Pay per use') return story.priceLabel;
  const noun = PRICE_NOUNS.find(([pattern]) => pattern.test(story.type))?.[1] ?? 'resource';
  return `${story.priceLabel} for this ${noun}`;
};

const MANIFEST =
  /^(package\.json|requirements[\w.-]*\.txt|pyproject\.toml|pipfile|setup\.py|go\.mod|gemfile|composer\.json|cargo\.toml|pom\.xml|build\.gradle(\.kts)?|mix\.exs)$/i;
const COMPOSE = /^(docker-)?compose([.-][\w-]+)?\.ya?ml$/i;
const SOURCE = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rb|php|rs|java|kt|cs|ex|exs)$/i;
const DATA_TYPES =
  /^(relational-database|redis-cluster|upstash-redis|dynamo-db-table|mongo-db-atlas-cluster|efs-filesystem|open-search-domain|bucket)$/;
const SQL_ENGINES: ReadonlySet<string> = new Set(['Postgres', 'MySQL', 'MariaDB', 'SQL', 'SQLite']);

/**
 * What a resource's evidence shows, in plain words with any name from the code in backticks: "Postgres driver",
 * "Postgres container", "FastAPI app", "Next.js dependency", "`BUCKET_NAME` setting". Undefined when the line says
 * nothing a person would name (a Dockerfile's `FROM`): the page quotes the line instead.
 */
export const evidenceSays = (story: Pick<ResourceStory, 'type' | 'technology' | 'hint'>, evidence: Evidence) => {
  const file = evidence.file.split('/').at(-1) ?? evidence.file;
  const quote = quoteLabel(evidence.quote);
  const named = story.hint !== undefined && words(quote).has(story.hint);
  const isApp = !DATA_TYPES.test(story.type);
  const technology = story.technology;
  const setting = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(quote)?.[1];
  if (setting !== undefined && /^\.env/i.test(file)) return `\`${setting}\` setting`;
  if (technology === undefined) return undefined;
  if (!isApp) {
    if (MANIFEST.test(file)) return `${technology} ${SQL_ENGINES.has(technology) ? 'driver' : 'client'}`;
    if (COMPOSE.test(file)) return `${technology} container`;
    if (/\.prisma$/i.test(file)) return `${technology} datasource`;
    return undefined;
  }
  if (MANIFEST.test(file)) {
    const name = /^[@\w./-]+$/.exec(quote)?.[0];
    return named ? `${technology} dependency` : name === undefined ? undefined : `\`${name}\` dependency`;
  }
  if (SOURCE.test(file) && named) return `${technology} app`;
  return undefined;
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

/** One line per resource in the chips row, in the words the diagram uses: "Next.js site", "Postgres", "3 secrets". */
const chipLabel = (story: ResourceStory, resource: Resources[string]): string => {
  if (resource.type === 'relational-database') return story.plainName.replace(/ database$/, '');
  if (story.plainName === 'Disk for SQLite data') return 'SQLite data';
  return story.plainName;
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

/**
 * How long a resource takes to appear, its scroll into line and the pause after it included: a second each, quicker
 * past four so the whole reveal stays near 4 s. Long enough to read the finding, short enough not to wait for it.
 */
export const stepDuration = (count: number): number =>
  Math.round(Math.max(600, Math.min(1000, 4000 / Math.max(1, count))));

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
      { id: name, label: chipLabel(story, resource), kind: 'resource', type: resource.type },
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
