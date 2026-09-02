/*
 * The one fictional project every surface on this site shows.
 *
 * Every screen the homepage embeds — the wizard run, the deploy transcript, the console, the
 * metrics, the traces, the issues, the pipeline, the bill — is the same application seen from a
 * different angle. That only works if the cast never drifts: a reader who notices `apiService` in
 * the terminal and then finds it again in the trace waterfall has learned that these are screenshots
 * of one product rather than eight unrelated illustrations.
 *
 * So the names, types and URLs live here and nowhere else. Nothing in this module touches the
 * filesystem or the config schema, so it is safe to import from a `.tsx` surface as well as from
 * `.astro` frontmatter.
 */

export const PROJECT_NAME = 'acme-project';
export const ORG_NAME = 'Stacktape';
export const REGION = 'eu-west-1';
export const GIT_REPOSITORY = 'acme/acme-project';

export const WEB_URL = 'https://acme.com';
export const API_URL = 'https://api.acme.com';

/** The address the Console surfaces put in their browser frame. */
export const CONSOLE_URL = `console.stacktape.com/projects/${PROJECT_NAME}/staging`;

export type StoryResource = {
  name: string;
  /**
   * The Stacktape resource type. It is the key to `@stacktape/ui-react`'s icon catalogue, which is
   * also what decides the AWS category colour — so this field, not a hand-picked colour, is what
   * makes `mainDatabase` blue and `firewall` red on every surface at once.
   */
  type: string;
  /**
   * The AWS category the icon catalogue assigns to `type`. Restated here only because the catalogue
   * itself is internal to `@stacktape/ui-react` — surfaces that tint something other than an icon
   * (the cost bars) need the same answer, and two resources sharing a colour is correct: `apiService`
   * and `worker` really are both compute.
   */
  category: 'compute' | 'database' | 'network' | 'security';
  /** What the Console's resource card prints under the name. Product wording, not the type id. */
  consoleLabel: string;
  /** What the deploy transcript prints. More specific than the card: it names the engine. */
  terminalLabel: string;
};

/**
 * The six resources, in the order the Console lists them. Two rows of three, and the order is
 * load-bearing: compute first, then the things compute depends on.
 */
export const RESOURCES: readonly StoryResource[] = [
  { name: 'web', type: 'nextjs-web', category: 'network', consoleLabel: 'Nextjs Web', terminalLabel: 'Next.js Web' },
  {
    name: 'apiService',
    type: 'web-service',
    category: 'compute',
    consoleLabel: 'Web Service',
    terminalLabel: 'Web Service · Fargate'
  },
  { name: 'worker', type: 'function', category: 'compute', consoleLabel: 'Function', terminalLabel: 'Lambda Function' },
  {
    name: 'mainDatabase',
    type: 'relational-database',
    category: 'database',
    consoleLabel: 'SQL database',
    terminalLabel: 'Aurora · PostgreSQL 16'
  },
  {
    name: 'cache',
    type: 'redis-cluster',
    category: 'database',
    consoleLabel: 'Redis Cluster',
    terminalLabel: 'Redis · ElastiCache'
  },
  {
    name: 'firewall',
    type: 'web-app-firewall',
    category: 'security',
    consoleLabel: 'Web App Firewall',
    terminalLabel: 'Web Application Firewall'
  }
];

export type StoryStage = {
  name: string;
  region: string;
  /** The second line of the Console's stage row. Mirrors the product's own three states. */
  status: { kind: 'updated'; label: string } | { kind: 'deploying'; label: string };
};

export const STAGES: readonly StoryStage[] = [
  { name: 'staging', region: REGION, status: { kind: 'updated', label: 'Updated 2 hours ago' } },
  { name: 'production', region: REGION, status: { kind: 'deploying', label: 'Deploying…' } }
];
