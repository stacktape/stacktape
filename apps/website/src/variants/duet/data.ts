/*
 * Everything the duet study says and shows, in one place.
 *
 * Copy lives here so the wording of the six sections, the left-track statements and the example
 * project stay consistent across every component. The YAML highlighter at the bottom runs on the
 * server: import this module from `.astro` frontmatter only.
 */

export const HEADLINE = 'AWS DevOps, fully automated.';
export const SUBHEADLINE =
  'Stacktape puts your app on your own AWS account and does the DevOps work for you. It reads your code, sets up the infrastructure, deploys, and then keeps the app running: monitored, secured, and within budget.';
export const EYEBROW = 'Like a PaaS, but in your own AWS account';
export const TRUST_LINE =
  'Open-source CLI (MIT). Plain CloudFormation in your own AWS account. Extend with any AWS resource. Eject anytime.';
export const CLOSING = 'That is the whole DevOps job.';

export const COMMANDS = [
  { id: 'npx', label: 'npx', command: 'npx stacktape init' },
  { id: 'macos', label: 'macOS', command: 'curl -L https://installs.stacktape.com/macos.sh | sh' },
  { id: 'linux', label: 'Linux', command: 'curl -L https://installs.stacktape.com/linux.sh | sh' },
  { id: 'windows', label: 'Windows', command: 'iwr https://installs.stacktape.com/windows.ps1 -useb | iex' }
] as const;

export const LINKS = {
  docs: 'https://docs.stacktape.com',
  github: 'https://github.com/stacktape/stacktape',
  console: 'https://console.stacktape.com',
  demo: 'https://cal.com/stacktape/30min',
  discord: 'https://discord.gg/stacktape',
  privacy: '/privacy'
} as const;

/* ── Inline markup helpers ─────────────────────────────────────────────────────────────────── */

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Backticks become `<code>`; everything else is escaped. For copy that names commands or files. */
export const inline = (text: string) => escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>');

/* ── The six sections ──────────────────────────────────────────────────────────────────────── */

export type Section = {
  index: string;
  id: string;
  name: string;
  /** Two or three plain sentences. Terms a Heroku or Vercel developer may not know are defined. */
  lead: string;
  you: { say: string; detail?: string; nothing?: boolean };
};

export const SECTIONS: Section[] = [
  {
    index: '01',
    id: 'designs',
    name: 'Designs your infrastructure.',
    lead: 'Stacktape reads your repository and works out what your app needs on AWS: where it runs, its database, cache and queues, and how they connect. It writes that down as one file you can read, `stacktape.yml`, with the production defaults you would otherwise have to know: a private network, least-privilege permissions, backups. Nothing is created until you say so.',
    you: {
      say: 'Run one command.',
      detail:
        '`npx stacktape init` opens a wizard in your browser. Read what it decided. Change anything with one click.'
    }
  },
  {
    index: '02',
    id: 'ships',
    name: 'Ships it.',
    lead: 'Stacktape builds your containers and functions from source and deploys them into your AWS account. After the first deploy, every push to your main branch deploys, and every pull request gets its own preview environment: a full copy of the app on its own URL. Deploys are zero-downtime and can be rolled back.',
    you: { say: 'Read it. Press Deploy.', detail: 'Then push code. Nothing else changes about how you work.' }
  },
  {
    index: '03',
    id: 'watches',
    name: 'Watches it.',
    lead: 'Metrics, logs, traces, uptime checks and alarms are wired up by the deploy itself. There are no agents to install and no dashboards to build. Everything is read from your own AWS account and shown in one place.',
    you: { say: 'Nothing.', detail: 'Look when you want to.', nothing: true }
  },
  {
    index: '04',
    id: 'incidents',
    name: 'Handles incidents.',
    lead: 'When something breaks, Stacktape opens an incident, tells you which release caused it, and packages everything a coding agent needs to fix it. You review the fix; nothing reaches production without your approval. Letting an agent fix and deploy on its own is opt-in and off by default.',
    you: { say: 'Respond when a human is needed.', detail: 'Review the fix. Approve the deploy.' }
  },
  {
    index: '05',
    id: 'secures',
    name: 'Secures it.',
    lead: 'Least-privilege permissions, private networking and managed secrets are the defaults of the generated setup. Guardrails block risky changes before they deploy, and every image you ship is scanned for known vulnerabilities.',
    you: { say: 'Nothing.', detail: 'Turn on stricter rules if you want them.', nothing: true }
  },
  {
    index: '06',
    id: 'costs',
    name: 'Keeps costs in check.',
    lead: 'See what every resource costs, per project and environment, straight from your AWS bill. Set a budget and Stacktape warns you before a surprise. AWS bills you directly.',
    you: { say: 'Set a budget once.', detail: 'A number and a threshold. That is all.' }
  }
];

/* ── The example project ───────────────────────────────────────────────────────────────────── */

export const PROJECT = {
  name: 'acme-project',
  repo: 'acme/acme-project',
  region: 'eu-west-1',
  summary: 'A Next.js app with a background worker, using a Postgres database and a Redis cache.'
} as const;

/** The plain object the isometric diagram draws. It derives the private network and ingress itself. */
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
    firewall: { type: 'web-app-firewall', properties: { scope: 'cdn' } }
  }
};

export const ACME_YAML = `# stacktape.yml — written by stacktape init. One file, the whole setup.
serviceName: acme-project

resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./web
      connectTo: [apiService]

  apiService:
    type: web-service
    properties:
      packaging:
        type: custom-dockerfile
        properties:
          buildContextPath: ./api
          dockerfilePath: ./api/Dockerfile
      resources: { cpu: 0.5, memory: 1024 }
      scaling:
        minInstances: 2   # one can fail without an interruption
        maxInstances: 6
      connectTo: [mainDatabase, cache, worker]

  worker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: api/src/worker.ts
      connectTo: [mainDatabase]

  mainDatabase:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql
        properties: { version: '16.4', port: 5432 }
      accessibility:
        accessibilityMode: vpc   # no public address
      automatedBackupRetentionDays: 7

  cache:
    type: redis-cluster
    properties:
      engine: { type: redis7 }
      instanceSize: cache.t3.micro

  firewall:
    type: web-app-firewall
    properties:
      scope: cdn

hooks:
  afterDeploy:
    - scriptName: migrateDatabase

scripts:
  migrateDatabase:
    type: local-script
    properties:
      executeCommand: npx prisma migrate deploy
      connectTo: [mainDatabase]`;

export const DECIDED = [
  {
    what: 'Keeping the database reachable only from your private network',
    why: 'No public address. Adds one small keyless jump box so local tools and migrations can tunnel in.'
  },
  {
    what: 'Running two copies of apiService',
    why: 'One can fail without an interruption. Roughly doubles its cost.'
  },
  { what: 'Keeping a week of database backups', why: 'Restore any day from the last seven.' },
  { what: 'Running prisma migrate deploy after every deploy', why: 'Found in package.json.' }
];

export const RESOURCES = [
  { name: 'web', type: 'nextjs-web', detail: 'https://acme.com', category: 'compute' },
  { name: 'apiService', type: 'web-service', detail: 'https://api.acme.com · 2–6 instances', category: 'compute' },
  { name: 'worker', type: 'function', detail: 'api/src/worker.ts', category: 'compute' },
  { name: 'mainDatabase', type: 'relational-database', detail: 'Aurora PostgreSQL 16 · private', category: 'database' },
  { name: 'cache', type: 'redis-cluster', detail: 'Redis 7 · cache.t3.micro', category: 'database' },
  { name: 'firewall', type: 'web-app-firewall', detail: 'in front of web and apiService', category: 'security' }
] as const;

export const CONSOLE_NAV = [
  { heading: null, items: ['Overview', 'Config editor'] },
  { heading: 'Organization', items: ['Projects', 'Activity', 'Users', 'Costs'] },
  {
    heading: 'Observability',
    items: ['Logs', 'Metrics', 'Traces', 'Uptime', 'Synthetics', 'Error tracking', 'Incidents']
  },
  { heading: 'Alerting', items: ['Channels', 'Notifications', 'Alarms', 'Budgets'] },
  { heading: 'Security', items: ['Security overview', 'Vulnerabilities', 'Posture'] },
  { heading: 'Configuration', items: ['Guardrails', 'Secrets', 'SSM Params', 'AWS Accounts', 'Domains'] }
] as const;

/* ── 02 Ships it ───────────────────────────────────────────────────────────────────────────── */

export const PHASES = [
  { name: 'Initialize', state: 'done', note: '4s' },
  { name: 'Package', state: 'done', note: 'web 41s · apiService 58s · worker 6s' },
  { name: 'Deploy', state: 'running', note: '21 of 33 resources' },
  { name: 'Outputs', state: 'todo', note: 'URLs and endpoints' }
] as const;

/* ── 03 Watches it ─────────────────────────────────────────────────────────────────────────── */

export const METRICS = [
  { label: 'Requests', value: '184', unit: 'req/s', points: [52, 48, 55, 61, 58, 66, 63, 70, 74, 68, 72, 78, 75, 80] },
  { label: 'p95 latency', value: '212', unit: 'ms', points: [40, 44, 38, 46, 42, 48, 45, 41, 47, 44, 50, 46, 43, 45] },
  { label: '5xx rate', value: '0.02', unit: '%', points: [6, 5, 7, 6, 4, 6, 5, 8, 6, 5, 6, 4, 6, 5] }
] as const;

/** Spans of one request. Offsets and durations in milliseconds; the root is 212 ms long. */
export const TRACE = {
  name: 'GET /orders',
  total: 212,
  spans: [
    { name: 'GET /orders', start: 0, duration: 212, kind: 'http' },
    { name: 'handler', start: 6, duration: 198, kind: 'app' },
    { name: 'SELECT … FROM orders', start: 14, duration: 48, kind: 'db' },
    { name: 'redis GET', start: 66, duration: 2, kind: 'cache' },
    { name: 'POST /events', start: 168, duration: 31, kind: 'http' }
  ]
} as const;

export const UPTIME = [
  { region: 'Ireland', code: 'eu-west-1', latency: '212 ms' },
  { region: 'Virginia', code: 'us-east-1', latency: '318 ms' },
  { region: 'Singapore', code: 'ap-southeast-1', latency: '402 ms' }
] as const;

/* ── 04 Handles incidents ──────────────────────────────────────────────────────────────────── */

export const INCIDENT = {
  id: 'inc_8f2k',
  title: 'Uptime check down · https://api.acme.com/health',
  signals: [
    { kind: 'Uptime check down', text: 'https://api.acme.com/health', meta: '3 of 3 regions' },
    {
      kind: 'Application error',
      text: 'PrismaClientKnownRequestError: column "fulfillment_status" does not exist',
      meta: 'apiService · 214 occurrences'
    }
  ],
  timeline: [
    { time: '13:58', text: 'v41 deployed to production', tone: 'plain' },
    { time: '14:02', text: 'Incident opened · uptime check down in 3 of 3 regions', tone: 'error' },
    { time: '14:02', text: 'Application error linked · 214 occurrences in apiService', tone: 'error' },
    { time: '14:03', text: 'Narrowed to release v41 · what changed: 3 commits · config unchanged', tone: 'plain' },
    { time: '14:05', text: 'Details copied for agent', tone: 'plain' },
    {
      time: '14:08',
      text: 'Agent found the migration was never applied · PR #131 opened · you reviewed and merged it',
      tone: 'you'
    },
    { time: '14:12', text: 'v42 deployed through the pipeline', tone: 'plain' },
    { time: '14:13', text: 'Resolved · recovered on its own signals · 11 min', tone: 'ok' }
  ]
} as const;

/* ── 05 Secures it ─────────────────────────────────────────────────────────────────────────── */

export const POSTURE = {
  passing: 27,
  total: 30,
  failing: [
    {
      rule: 'Require recoverable data stores',
      finding: 'mainDatabase backups retained 1 day (staging)',
      note: 'Deployed before the rule was turned on.',
      action: 'Fix'
    },
    {
      rule: 'No plaintext secrets in config',
      finding: 'plaintext STRIPE_KEY in config',
      note: 'One click moves it to a managed secret.',
      action: 'Convert to $Secret'
    },
    {
      rule: 'No critical vulnerabilities in shipped images',
      finding: 'apiService image: 2 critical CVEs in openssl 3.0.13',
      note: 'Fix PR opened.',
      action: 'View PR'
    }
  ]
} as const;

export const GUARDRAILS = [
  { rule: 'Keep SQL and OpenSearch private', on: true },
  { rule: 'Require WAF on load balancers', on: true },
  { rule: 'Require recoverable data stores', on: true },
  { rule: 'Require deletion protection', on: false },
  { rule: 'Require dead-letter queue', on: false },
  { rule: 'Require multiple container instances', on: false }
] as const;

/* ── 06 Keeps costs in check ───────────────────────────────────────────────────────────────── */

export const COSTS = [
  { name: 'mainDatabase', amount: 61.4 },
  { name: 'apiService', amount: 34.2 },
  { name: 'cache', amount: 11.9 },
  { name: 'web', amount: 3.8 },
  { name: 'worker', amount: 0.7 },
  { name: 'other', amount: 0.9 }
] as const;
export const COST_TOTAL = 112.9;
export const BUDGET = { limit: 150, alertAt: 80 } as const;

/* ── Testimonials ──────────────────────────────────────────────────────────────────────────── */

export const TESTIMONIALS = [
  {
    quote:
      'With Stacktape, we fast-tracked our AWS deployment process. Our development and production environments were operational in just two days.',
    name: 'Eric Allam',
    role: 'CTO & Founder, Trigger.dev',
    fact: 'Series A startup, London. Runs ECS and Aurora PostgreSQL on Stacktape.'
  },
  {
    quote:
      'They abstract away so much of the complexity of AWS, and let us focus on our application logic, instead of infrastructure configuration.',
    name: 'Henry Garrett',
    role: 'Founding Engineer, Receipts',
    fact: 'Early-stage startup, US. Runs ECS, Lambda, RDS and SQS.'
  },
  {
    quote:
      'It’s allowed our small team to efficiently handle environments using GitOps, all while keeping a tight rein on costs.',
    name: 'Rhys Williams',
    role: 'CTO & Founder, Lastmyle',
    fact: 'Early-stage startup, New Zealand. GitOps with Java, Node.js and Next.js.'
  }
] as const;

/* ── YAML highlighter ──────────────────────────────────────────────────────────────────────── */

const RESOURCE_NAMES = new Set(Object.keys(ACME_CONFIG.resources));
const span = (cls: string, text: string) => `<span class="du-y-${cls}">${escapeHtml(text)}</span>`;

const highlightValue = (raw: string, key?: string): string => {
  const value = raw.trim();
  if (!value) return '';
  if (/^(['"]).*\1$/.test(value)) return span('str', value);
  if (/^-?\d+(\.\d+)?$/.test(value)) return span('num', value);
  if (value === 'true' || value === 'false') return span('bool', value);
  if (value.startsWith('[') && value.endsWith(']')) {
    const items = value
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const inner = items.map((item) => span(RESOURCE_NAMES.has(item) ? 'ref' : 'val', item)).join(span('punc', ', '));
    return span('punc', '[') + inner + span('punc', ']');
  }
  if (value.startsWith('{') && value.endsWith('}')) {
    const pairs = value
      .slice(1, -1)
      .split(',')
      .map((pair) => pair.trim())
      .filter(Boolean);
    const inner = pairs
      .map((pair) => {
        const at = pair.indexOf(':');
        const pairKey = pair.slice(0, at).trim();
        return span('key', pairKey) + span('punc', ': ') + highlightValue(pair.slice(at + 1), pairKey);
      })
      .join(span('punc', ', '));
    return span('punc', '{ ') + inner + span('punc', ' }');
  }
  if (key === 'type') return span('type', value);
  return span('val', value);
};

/** A small YAML tokenizer, enough for the file the wizard writes. Returns HTML for a `<code>`. */
export const highlightYaml = (source: string): { html: string; lineCount: number } => {
  const lines = source.split('\n');
  const html = lines
    .map((line) => {
      let code = line;
      let comment = '';
      const at = line.search(/(^|\s)#/);
      if (at >= 0) {
        const start = line[at] === '#' ? at : at + 1;
        code = line.slice(0, start);
        comment = line.slice(start);
      }
      const parts = code.match(/^(\s*)(- )?(.*)$/);
      const indent = parts?.[1] ?? '';
      const dash = parts?.[2] ?? '';
      const rest = parts?.[3] ?? '';
      let out = indent + (dash ? span('dash', dash) : '');
      const pair = rest.match(/^([\w.-]+):(\s*)(.*)$/);
      if (pair) {
        const [, key, gap, value] = pair;
        const trailing = value.slice(value.trimEnd().length);
        const cls = RESOURCE_NAMES.has(key) && indent.length === 2 ? 'res' : 'key';
        out += span(cls, key) + span('punc', ':') + gap + highlightValue(value, key) + trailing;
      } else {
        out += highlightValue(rest) + rest.slice(rest.trimEnd().length);
      }
      if (comment) out += span('com', comment);
      return out;
    })
    .join('\n');
  return { html, lineCount: lines.length };
};
