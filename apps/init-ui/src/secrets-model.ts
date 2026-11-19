/**
 * The secrets the Deploy step asks for, arranged the way a person fills them in: by the service that reads them, each
 * with the name the code uses, the line that reads it, and whether the page can make the value up.
 *
 * Pure functions over the session state, so the rules (what may be generated, how counts are explained) are checked
 * with tables rather than through a browser.
 */

import { requiredSecrets } from '@stacktape/config-inference/compose/required-secrets';
import type { WizardState } from './session';

const SECRET_REFERENCE = /\$Secret\('([^'.]+)(?:\.[^']*)?'\)/g;

/**
 * What a secret is to the person filling it in.
 *
 * `secret`: a credential or key. `outside`: the address of a service Stacktape does not create (RabbitMQ, NATS).
 * `setting`: a plain setting with a value in the project's deployment files, which init does not copy because those
 * files can hold credentials.
 */
export type SecretKind = 'secret' | 'outside' | 'setting';

export type SecretEntry = {
  /** The Stacktape secret, as `stacktape secret set` names it. */
  name: string;
  /** The environment variable the app reads it as, or the secret's own name when it is not in `environment`. */
  variable: string;
  kind: SecretKind;
  /** Where the code reads it, when the analysis saw that line. */
  source?: { file: string; line: number };
  /** The app owns the value (a session key, its own admin password), so a random one does. */
  canGenerate: boolean;
  /** One line about it from the analysis, for an outside service: "Your app needs a RabbitMQ broker…". */
  note?: string;
};

export type SecretGroup = {
  /** The resource that reads them, as stacktape.yml names it. */
  resourceName: string;
  kind: SecretKind;
  /** The deployment file the settings come from, for `setting` groups: "compose.yml". */
  from?: string;
  entries: SecretEntry[];
};

type Variable = {
  name?: unknown;
  role?: unknown;
  required?: unknown;
  evidence?: Array<{ file?: unknown; line?: unknown; quote?: unknown }>;
};

/** Names of services and products whose keys come from them, never from us: a random value would not work. */
const THIRD_PARTY = new Set(
  (
    'STRIPE GITHUB GITLAB BITBUCKET GOOGLE GCP AZURE MICROSOFT APPLE FACEBOOK TWITTER LINKEDIN DISCORD SLACK SMTP ' +
    'MAIL EMAIL SENDGRID MAILGUN POSTMARK RESEND SES SNS SMS TWILIO SENTRY DATADOG NEWRELIC HONEYCOMB POSTHOG ' +
    'SEGMENT MIXPANEL AMPLITUDE AWS S3 R2 CLOUDFLARE VERCEL NETLIFY HEROKU FLY RAILWAY RENDER SUPABASE FIREBASE ' +
    'CLERK AUTH0 OKTA WORKOS OAUTH OPENAI ANTHROPIC GEMINI MISTRAL COHERE REPLICATE HUGGINGFACE PINECONE ALGOLIA ' +
    'PUSHER ABLY CLOUDINARY MAPBOX PADDLE LEMONSQUEEZY PAYPAL BRAINTREE PLAID SHOPIFY INTERCOM HUBSPOT MAILCHIMP ' +
    'NOTION LINEAR JIRA ATLASSIAN UPSTASH NEON PLANETSCALE TURSO MONGO MONGODB REDIS DATABASE DB PG POSTGRES ' +
    'POSTGRESQL MYSQL RABBITMQ RMQ NATS KAFKA ELASTIC OPENSEARCH'
  ).split(' ')
);

/** Words that make a value something other than a key: an address, a user name, an identifier. */
const NOT_A_KEY = new Set(
  'URL URI DSN HOST PORT USER USERNAME EMAIL ID NAME REGION ENDPOINT ACCOUNT PUBLIC PUBLISHABLE WEBHOOK API CLIENT'.split(
    ' '
  )
);

const APP_KEY_WORDS = new Set(['JWT', 'SESSION', 'COOKIE', 'CSRF', 'HONEYPOT', 'SALT', 'PEPPER', 'PASSWORD']);

/**
 * Whether the page may fill this one with a random value: values the app owns (session and signing keys, its own
 * admin password, internal tokens), never credentials another service issues.
 */
export const canGenerateSecret = (variable: string): boolean => {
  const words = variable
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  if (words.some((word) => THIRD_PARTY.has(word) || NOT_A_KEY.has(word))) return false;
  if (words.some((word) => APP_KEY_WORDS.has(word))) return true;
  if (words.includes('SECRET')) return true;
  if (words.includes('KEY')) {
    return words.some((word) => ['SECRET', 'SIGNING', 'ENCRYPTION', 'APP', 'MASTER', 'CRYPTO', 'HMAC'].includes(word));
  }
  if (words.includes('TOKEN')) {
    return words.some((word) => ['INTERNAL', 'ADMIN', 'CRON', 'COMMAND'].includes(word));
  }
  return false;
};

/** A password a person may have to type stays readable and within the lengths sign-up forms accept. */
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/**
 * A strong random value in the shape the app expects. Laravel's `APP_KEY` is `base64:` and 32 bytes; Rails's
 * `SECRET_KEY_BASE` is 64 bytes of hex; a password is 24 readable characters; anything else is 32 bytes of hex.
 */
export const generateSecretValue = (
  variable: string,
  random: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes)
): string => {
  const name = variable.toUpperCase();
  const hex = (length: number) =>
    [...random(new Uint8Array(length))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  if (name === 'APP_KEY') {
    return `base64:${btoa(String.fromCharCode(...random(new Uint8Array(32))))}`;
  }
  if (name === 'SECRET_KEY_BASE') return hex(64);
  if (name.split(/[^A-Z0-9]+/).includes('PASSWORD')) {
    // Rejection sampling keeps every character equally likely.
    const limit = 256 - (256 % PASSWORD_ALPHABET.length);
    let password = '';
    while (password.length < 24) {
      for (const byte of random(new Uint8Array(32))) {
        if (byte < limit && password.length < 24) password += PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length];
      }
    }
    return password;
  }
  return hex(32);
};

/** The loose resource shape the page holds; only `environment` is read. */
type Resources = Record<string, { type?: string; properties?: Record<string, unknown> }>;

const environmentOf = (resource: Resources[string]): Array<{ name: string; value: string }> => {
  const environment = resource.properties?.environment;
  if (Array.isArray(environment)) {
    return environment.flatMap((entry: { name?: unknown; value?: unknown }) =>
      typeof entry.name === 'string' && typeof entry.value === 'string'
        ? [{ name: entry.name, value: entry.value }]
        : []
    );
  }
  if (typeof environment === 'object' && environment !== null) {
    return Object.entries(environment).flatMap(([name, value]) => (typeof value === 'string' ? [{ name, value }] : []));
  }
  return [];
};

const secretsIn = (value: string): string[] => [...value.matchAll(SECRET_REFERENCE)].map((match) => match[1]!);

const normalized = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

/** A line that reads the variable in code, over a manifest or an example file that only mentions it. */
const readingLine = (variable: Variable): { file: string; line: number } | undefined => {
  const lines = (variable.evidence ?? []).filter(
    (entry): entry is { file: string; line: number; quote?: unknown } =>
      typeof entry.file === 'string' && typeof entry.line === 'number'
  );
  const inCode = lines.find(
    (entry) => !/(^|\/)(\.env[^/]*|package\.json|compose\.ya?ml|docker-compose[^/]*|go\.mod)$/.test(entry.file)
  );
  const chosen = inCode ?? lines[0];
  return chosen === undefined ? undefined : { file: chosen.file, line: chosen.line };
};

/** The scanned service a resource came from: the same name, or the same name once dashes and case are ignored. */
const factsServiceFor = (state: WizardState, resourceName: string) => {
  const services = state.facts?.services ?? [];
  return (
    services.find((service) => service.name === resourceName) ??
    services.find((service) => normalized(service.name) === normalized(resourceName)) ??
    (services.length === 1 ? services[0] : undefined)
  );
};

const variablesOf = (service: unknown): Variable[] => {
  const variables = (service as { environmentVariables?: unknown } | undefined)?.environmentVariables;
  return Array.isArray(variables) ? (variables as Variable[]) : [];
};

/** The analysis's sentence about an outside service whose address arrives through this secret. */
const outsideNote = (state: WizardState, secretName: string): string | undefined => {
  const gap = (state.composition?.gaps ?? []).find((entry) =>
    new RegExp(`\\bthe ${secretName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} secret\\b`).test(entry.message)
  );
  return gap === undefined ? undefined : firstSentence(gap.message);
};

/** "Your app needs a RabbitMQ broker, which Stacktape does not create. Use a hosted one…" → the first sentence. */
export const firstSentence = (text: string): string => {
  const match = /^(.+?[.!?])(?:\s+(?=[A-Z`"])|$)/s.exec(text.trim());
  return (match?.[1] ?? text).trim();
};

export type SecretsPlan = {
  groups: SecretGroup[];
  /** Every secret the deploy needs, in the order shown. */
  entries: SecretEntry[];
  /** Read by the app but set by Stacktape: the database password, as `POSTGRES_PASSWORD`. */
  setByStacktape: string[];
  /** Found in the code as secrets, but the deploy does not need them: optional, or only a build or test tool reads them. */
  notNeeded: string[];
  /** Gaps that a group already explains, so the page does not list them twice. */
  explainedGaps: string[];
};

/**
 * Which secrets the deploy needs, grouped by the resource that reads them and by what kind of value they are, with what
 * the analysis knows about each.
 */
export const planSecrets = (state: WizardState, resources: Resources): SecretsPlan => {
  const required = requiredSecrets(resources);
  const requiredSet = new Set(required);
  const groups = new Map<string, SecretGroup>();
  const placed = new Set<string>();
  const setByStacktape: string[] = [];
  const explainedGaps = new Set<string>();
  const usedVariables = new Set<string>();

  for (const [resourceName, resource] of Object.entries(resources)) {
    const service = factsServiceFor(state, resourceName);
    const variables = variablesOf(service);
    for (const { name: variable, value } of environmentOf(resource)) {
      usedVariables.add(variable);
      for (const secretName of secretsIn(value)) {
        if (!requiredSet.has(secretName)) {
          if (!setByStacktape.includes(variable)) setByStacktape.push(variable);
          continue;
        }
        if (placed.has(secretName)) continue;
        placed.add(secretName);
        const fact = variables.find((entry) => entry.name === variable);
        const note = outsideNote(state, secretName);
        const kind: SecretKind =
          fact?.role === 'runtime-config'
            ? 'setting'
            : fact?.role === 'infra-dependency' || note !== undefined
              ? 'outside'
              : 'secret';
        const source = fact === undefined ? undefined : readingLine(fact);
        const from = kind === 'setting' ? source?.file : undefined;
        const key = `${resourceName}|${kind}`;
        const group = groups.get(key) ?? {
          resourceName,
          kind,
          ...(from === undefined ? {} : { from }),
          entries: []
        };
        group.entries.push({
          name: secretName,
          variable,
          kind,
          ...(source === undefined || kind === 'setting' ? {} : { source }),
          canGenerate: kind === 'secret' && canGenerateSecret(variable),
          ...(note === undefined ? {} : { note })
        });
        groups.set(key, group);
      }
    }
  }

  // A secret referenced outside `environment` (a resource property) still has to exist; it keeps its own name.
  for (const name of required) {
    if (placed.has(name)) continue;
    const key = `|secret`;
    const group = groups.get(key) ?? { resourceName: '', kind: 'secret' as const, entries: [] };
    group.entries.push({ name, variable: name, kind: 'secret', canGenerate: false });
    groups.set(key, group);
  }

  // Settings found in deployment files are one gap that names them all; the group says the same thing.
  for (const gap of state.composition?.gaps ?? []) {
    if (gap.subject.endsWith('.runtime-settings') && [...groups.values()].some((group) => group.kind === 'setting')) {
      explainedGaps.add(gap.subject);
    }
    if (
      [...groups.values()].some((group) =>
        group.entries.some((entry) => entry.note !== undefined && gap.message.includes(`the ${entry.name} secret`))
      )
    ) {
      explainedGaps.add(gap.subject);
    }
  }

  const KIND_ORDER: Record<SecretKind, number> = { secret: 0, outside: 1, setting: 2 };
  for (const group of groups.values()) {
    // The ones the page can fill come first, so "Generate all" is next to them.
    group.entries.sort(
      (left, right) =>
        Number(right.canGenerate) - Number(left.canGenerate) || left.variable.localeCompare(right.variable)
    );
  }
  const ordered = [...groups.values()].toSorted((left, right) => KIND_ORDER[left.kind] - KIND_ORDER[right.kind]);

  const notNeeded = (state.facts?.services ?? []).flatMap((service) =>
    variablesOf(service)
      .filter(
        (variable) =>
          variable.role === 'third-party-secret' &&
          typeof variable.name === 'string' &&
          !usedVariables.has(variable.name)
      )
      .map((variable) => variable.name as string)
  );

  return {
    groups: ordered,
    entries: ordered.flatMap((group) => group.entries),
    setByStacktape,
    notNeeded: [...new Set(notNeeded)],
    explainedGaps: [...explainedGaps]
  };
};

/**
 * What the user does about a secret, which is how the Deploy step groups them.
 *
 * `generate`: a value only the app uses, which a random one fills. `import`: the project's `.env` has a value for it,
 * which the user checks and keeps. `provide`: a key or address from somewhere else, typed in by hand.
 */
export type SecretTask = 'generate' | 'provide' | 'import';

export type SecretTaskGroup = { task: SecretTask; entries: SecretEntry[] };

/** A value from the project's `.env`, as the CLI read it for this page. */
export type EnvironmentValues = { file: string; values: ReadonlyMap<string, string> };

/**
 * The secrets by what the user does about them, in the order they do it: what one click fills, then what they type,
 * then what they check. A value the app owns is generated even when `.env` has one: the local one is a development
 * value, and a random one is stronger. An empty `.env` value is nothing to import.
 */
export const taskGroups = (plan: SecretsPlan, environment: EnvironmentValues | undefined): SecretTaskGroup[] => {
  const taskOf = (entry: SecretEntry): SecretTask =>
    entry.canGenerate
      ? 'generate'
      : (environment?.values.get(entry.variable) ?? '').trim() !== ''
        ? 'import'
        : 'provide';
  return (['generate', 'provide', 'import'] as const).flatMap((task) => {
    const entries = plan.entries.filter((entry) => taskOf(entry) === task);
    return entries.length === 0 ? [] : [{ task, entries }];
  });
};

/**
 * Why a value from `.env` should not go to AWS as it is: it points at this machine (`localhost`, `ENVIRONMENT=local`),
 * or it is the template's placeholder (`changethis`, `admin@example.com`). Undefined when it looks deployable.
 */
export const localValueReason = (value: string): 'local' | 'example' | undefined => {
  const trimmed = value.trim();
  if (/\blocalhost\b|\b127\.0\.0\.1\b|\b0\.0\.0\.0\b|host\.docker\.internal/i.test(trimmed)) return 'local';
  if (/^local$/i.test(trimmed)) return 'local';
  if (/^(change[-_ ]?(this|me|it)|replace[-_ ]?(this|me)|your[-_ ].+|x{3,}|todo|placeholder)$/i.test(trimmed)) {
    return 'example';
  }
  if (/@example\.(com|org|net)\b|\bexample\.(com|org|net)$/i.test(trimmed)) return 'example';
  return undefined;
};

/**
 * The `.env` values split by whether they can go to AWS as they are: `ready` looks deployable, `review` points at this
 * machine or is a template's placeholder. Decided by the value in `.env`, so a row does not move while it is edited.
 */
export const splitImports = (
  entries: readonly SecretEntry[],
  environment: EnvironmentValues | undefined
): { ready: SecretEntry[]; review: SecretEntry[] } => {
  const flagged = (entry: SecretEntry) => localValueReason(environment?.values.get(entry.variable) ?? '') !== undefined;
  return { ready: entries.filter((entry) => !flagged(entry)), review: entries.filter(flagged) };
};

/**
 * Where the `.env` group stands, which is what its "Next" asks for: `use` the values (they are not in the fields yet),
 * `save` the ready ones in one click, or `review` the ones that would deploy a local or example value.
 */
export type ImportStep = { step: 'use' | 'save' | 'review'; entries: SecretEntry[] };

export const importStep = (
  remaining: readonly SecretEntry[],
  environment: EnvironmentValues | undefined,
  imported: ReadonlySet<string>,
  drafts: Readonly<Record<string, string>>
): ImportStep => {
  const unused = remaining.filter((entry) => !imported.has(entry.name));
  if (unused.length > 0) return { step: 'use', entries: unused };
  const { ready, review } = splitImports(remaining, environment);
  const saveable = ready.filter((entry) => {
    const draft = drafts[entry.name] ?? '';
    return draft !== '' && localValueReason(draft) === undefined;
  });
  if (saveable.length > 0) return { step: 'save', entries: saveable };
  return { step: 'review', entries: review.length > 0 ? review : [...remaining] };
};

const values = (count: number) => (count === 1 ? 'value' : 'values');

/**
 * "Next: …" for the group the user is working in: a verb and a count, the same words as the control it points at.
 * `step` is where the `.env` group stands; without it the group's first step is assumed.
 */
export const taskNextText = (
  group: SecretTaskGroup,
  remaining: readonly SecretEntry[],
  file: string | undefined,
  step?: ImportStep
): string => {
  if (group.task === 'generate') {
    return remaining.length === 1 ? `generate ${remaining[0]!.variable}` : `generate ${remaining.length} secrets`;
  }
  if (group.task === 'import') {
    const current = step ?? { step: 'use', entries: [...remaining] };
    const count = current.entries.length;
    if (current.step === 'use') return `use the ${count} ${values(count)} from ${file ?? '.env'}`;
    if (current.step === 'save') return `save ${count} ${values(count)}`;
    return `review ${count} ${values(count)} before saving`;
  }
  if (remaining.length === 1) return `enter ${remaining[0]!.variable}`;
  if (remaining.every((entry) => entry.kind === 'outside')) return `enter ${remaining.length} service URLs`;
  return `enter ${remaining.length} values`;
};
