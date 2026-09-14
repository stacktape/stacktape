/**
 * Everything the "rail" study says, in one place: the message, the six meta-features with the
 * reader's part of each, the example application and the quotes.
 *
 * The left column is a checklist. Items marked `done` are the things the reader actually does, and
 * their count is the "You · 4 things" summary in the sticky column header.
 */

export type CommandOption = {
  id: 'npx' | 'macos' | 'linux' | 'windows';
  label: string;
  command: string;
};

export const COMMANDS: CommandOption[] = [
  { id: 'npx', label: 'npx', command: 'npx stacktape init' },
  { id: 'macos', label: 'macOS', command: 'curl -L https://installs.stacktape.com/macos.sh | sh' },
  { id: 'linux', label: 'Linux', command: 'curl -L https://installs.stacktape.com/linux.sh | sh' },
  { id: 'windows', label: 'Windows', command: 'iwr https://installs.stacktape.com/windows.ps1 -useb | iex' }
];

export const LINKS = {
  docs: 'https://docs.stacktape.com',
  github: 'https://github.com/stacktape/stacktape',
  signIn: 'https://console.stacktape.com',
  demo: 'https://cal.com/stacktape/30min',
  discord: 'https://discord.gg/stacktape',
  privacy: 'https://stacktape.com/privacy-policy'
};

export const EYEBROW = 'Like a PaaS, but in your own AWS account';

export const HEADLINE = 'AWS DevOps, fully automated.';

export const SUBHEADLINE =
  'Stacktape puts your app on your own AWS account and does the DevOps work for you. It reads your code, sets up the infrastructure, deploys, and then keeps the app running: monitored, secured and within budget.';

export const HERO_TRUST =
  'Open-source CLI (MIT) · hosted Console · plain CloudFormation in your own AWS account · eject anytime';

export const TRUST_LINE =
  'Open-source CLI (MIT). Plain CloudFormation in your own AWS account. Extend with any AWS resource. Eject anytime.';

/** Plain object for `IsometricDiagram`; the diagram derives the private network and ingress itself. */
export const ACME_CONFIG = {
  resources: {
    web: { type: 'nextjs-web', properties: { appDirectory: './web', connectTo: ['apiService'] } },
    apiService: {
      type: 'web-service',
      properties: {
        packaging: {
          type: 'custom-dockerfile',
          properties: { buildContextPath: './api', dockerfilePath: './api/Dockerfile' }
        },
        resources: { cpu: 0.5, memory: 1024 },
        scaling: { minInstances: 2, maxInstances: 6 },
        connectTo: ['mainDatabase', 'cache', 'worker']
      }
    },
    worker: {
      type: 'function',
      properties: {
        packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'api/src/worker.ts' } },
        connectTo: ['mainDatabase']
      }
    },
    mainDatabase: {
      type: 'relational-database',
      properties: {
        engine: { type: 'aurora-postgresql', properties: { version: '16.4', port: 5432 } },
        accessibility: { accessibilityMode: 'vpc' }
      }
    },
    cache: { type: 'redis-cluster', properties: { engine: { type: 'redis7' }, instanceSize: 'cache.t3.micro' } },
    firewall: { type: 'web-app-firewall', properties: { scope: 'cloudfront' } }
  }
};

/**
 * Lines of the generated file with their provenance. `from` names the repository file a line was
 * derived from; `decided` marks a line the wizard chose and listed under "Decided for you".
 */
export type ConfigLine = { text: string; from?: string; decided?: boolean };

/** The whole file is 47 lines. The hero shows the first 14, a complete excerpt with no cut tokens. */
export const CONFIG_LINE_COUNT = 47;

export const CONFIG_LINES: ConfigLine[] = [
  { text: 'resources:' },
  { text: '  web:', from: 'web/next.config.ts' },
  { text: '    type: nextjs-web' },
  { text: '    properties: { appDirectory: ./web }' },
  { text: '  apiService:', from: 'api/Dockerfile' },
  { text: '    type: web-service' },
  { text: '    properties:' },
  { text: '      scaling: { minInstances: 2, maxInstances: 6 }', decided: true },
  { text: '      connectTo: [mainDatabase, cache, worker]', from: 'api/src/server.ts' },
  { text: '  mainDatabase:', from: 'api/prisma/schema.prisma' },
  { text: '    type: relational-database' },
  { text: '    properties:' },
  { text: '      accessibility: { accessibilityMode: vpc }', decided: true },
  { text: "      engine: { type: aurora-postgresql, properties: { version: '16.4' } }" },
  { text: '  cache:', from: 'docker-compose.yml' },
  { text: '    type: redis-cluster' },
  { text: '    properties: { engine: { type: redis7 } }' },
  { text: '  worker:', from: 'api/src/worker.ts' },
  { text: '    type: function' },
  { text: '    properties:' },
  { text: '      packaging: { type: stacktape-lambda-buildpack }' },
  { text: '      connectTo: [mainDatabase]' },
  { text: '  firewall:', decided: true },
  { text: '    type: web-app-firewall' }
];

/** The hero shows lines 1–13: three complete resource blocks, ending on a decision. */
export const HERO_LINES = CONFIG_LINES.slice(0, 13);

/** Phone-sized proof: the database block alone (lines 10–13), short enough to sit under the headline. */
export const PHONE_LINES = CONFIG_LINES.slice(9, 13);
export const PHONE_START = 10;

export const CONFIG_REST = 'the rest: worker, cache, firewall, a week of backups, the migration hook';

export type Decision = { statement: string; detail: string };

export const DECISIONS: Decision[] = [
  {
    statement: 'Keeping the database reachable only from your private network',
    detail: 'No public address. Adds one small keyless jump box so local tools and migrations can tunnel in.'
  },
  {
    statement: 'Running two copies of apiService',
    detail: 'One can fail without an interruption. Roughly doubles its cost.'
  },
  { statement: 'Keeping a week of database backups', detail: 'Accidental deletion is blocked either way.' },
  {
    statement: 'Running `prisma migrate deploy` after every deploy',
    detail: 'Found in package.json. Runs against the private database through the jump box.'
  }
];

export type ChecklistItem = {
  text: string;
  /** Ticked: something the reader does. Counted in the header summary. */
  done?: boolean;
  /** Only if a human is needed: a hollow mark, not counted. */
  maybe?: boolean;
  code?: boolean;
};

export type Feature = {
  id: 'design' | 'ship' | 'watch' | 'incidents' | 'security' | 'costs';
  number: string;
  chapter: string;
  name: string;
  /** One-line gloss for the index in the hero. */
  short: string;
  /** What it means for the reader, in plain words. */
  explain: string;
  /** The reader's part, as a serif statement, a checklist and an optional note. */
  statement: string;
  items: ChecklistItem[];
  note?: string;
};

export const FEATURES: Feature[] = [
  {
    id: 'design',
    number: '01',
    chapter: 'Design',
    name: 'Designs your infrastructure.',
    short: 'reads your repository, writes one file you can read',
    explain:
      'Stacktape reads your repository and works out what your app needs on AWS: where it runs, its database, cache and queues, and how they connect. It writes that down as one file you can read, with the production defaults you would otherwise have to know about: a private network, least-privilege permissions, backups. Nothing is created until you say so.',
    statement: 'Run one command.',
    items: [{ text: 'npx stacktape init', done: true, code: true }],
    note: 'Then read what it decided. Change anything with one click.'
  },
  {
    id: 'ship',
    number: '02',
    chapter: 'Ship',
    name: 'Ships it.',
    short: 'builds, deploys, and previews every pull request',
    explain:
      'Stacktape builds your containers and functions from source and deploys them into your AWS account. After the first deploy, every push to your main branch deploys, and every pull request gets its own preview environment with its own URL. Deploys are zero-downtime and can be rolled back.',
    statement: 'Press Deploy once. Then push code.',
    items: [
      { text: 'Press Deploy', done: true },
      { text: 'Push to main', done: true }
    ],
    note: 'Pull requests get a preview on their own.'
  },
  {
    id: 'watch',
    number: '03',
    chapter: 'Watch',
    name: 'Watches it.',
    short: 'metrics, logs, traces, uptime and alarms, wired by the deploy',
    explain:
      'Metrics, logs, traces, uptime checks and alarms are wired up by the deploy itself. There are no agents to install and no dashboards to build. Everything is read from your own AWS account.',
    statement: 'Nothing.',
    items: [],
    note: 'Look when you want to.'
  },
  {
    id: 'incidents',
    number: '04',
    chapter: 'Incidents',
    name: 'Handles incidents.',
    short: 'names the release that broke it, hands your agent the fix',
    explain:
      'When something breaks, Stacktape opens an incident, tells you which release caused it, and packages everything a coding agent needs to fix it. You review the fix; nothing reaches production without your approval. Letting an agent fix and deploy on its own is opt-in and off by default.',
    statement: 'Respond only when a human is needed.',
    items: [{ text: 'Review the fix, if there is one', maybe: true }],
    note: 'An agent proposes it. You approve it, or not.'
  },
  {
    id: 'security',
    number: '05',
    chapter: 'Security',
    name: 'Secures it.',
    short: 'private by default, guardrails, vulnerability scanning',
    explain:
      'Least-privilege permissions, private networking and managed secrets are the defaults of the generated setup. Guardrails block risky changes before they deploy, and what you ship is scanned for known vulnerabilities.',
    statement: 'Nothing.',
    items: [],
    note: 'Turn on stricter rules if you want them.'
  },
  {
    id: 'costs',
    number: '06',
    chapter: 'Costs',
    name: 'Keeps costs in check.',
    short: 'every resource priced from your AWS bill, one budget',
    explain:
      'See what every resource costs, per project and environment, straight from your AWS bill. Set a budget once, and Stacktape warns you before a surprise.',
    statement: 'Set a budget once.',
    items: [{ text: 'Budget: $150 a month', done: true }]
  }
];

export const YOU_TOTAL = FEATURES.reduce((sum, feature) => sum + feature.items.filter((item) => item.done).length, 0);

export type Testimonial = { name: string; role: string; company: string; url: string; quote: string; facts: string };

export const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Eric Allam',
    role: 'CTO & Founder',
    company: 'Trigger.dev',
    url: 'https://trigger.dev',
    facts: 'Series A startup · London · runs ECS + Aurora PostgreSQL on Stacktape',
    quote:
      "As a startup founder & CTO, every hour is crucial. With Stacktape, we fast-tracked our AWS deployment process. Our development and production environments were operational in just two days. Stacktape's speed and efficiency have been game-changing for us."
  },
  {
    name: 'Henry Garrett',
    role: 'Founding Engineer',
    company: 'Receipts',
    url: 'https://receipts.xyz',
    facts: 'Early-stage startup · US · runs ECS + Lambda + RDS + SQS on Stacktape',
    quote:
      'Stacktape (the product) and Stacktape (the team) have helped us move extremely fast. They abstract away so much of the complexity of AWS, and let us focus on our application logic, instead of infrastructure configuration. The team is second to none, hopping in to be true partners with us on our development journey. We would not be where we are today without Stacktape.'
  },
  {
    name: 'Rhys Williams',
    role: 'CTO & Founder',
    company: 'Lastmyle',
    url: 'https://www.lastmyle.co.nz',
    facts: 'Early-stage startup · New Zealand · GitOps deployments with Java, Node.js and Next.js',
    quote:
      "Stacktape has been a game-changer for Lastmyle, providing a secure and intuitive way to manage our AWS deployments. It's allowed our small team to efficiently handle environments using GitOps, all while keeping a tight rein on costs."
  }
];
