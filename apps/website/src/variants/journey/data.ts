/*
 * Everything the journey study says and shows, in one place.
 *
 * The six stops, the example project, the screens and the testimonials live here so wording stays
 * consistent across components. The YAML highlighter at the bottom runs on the server: import this
 * module from `.astro` frontmatter only (the command box island imports `COMMANDS` alone).
 */

export const HEADLINE = 'AWS DevOps, fully automated.';
export const SUBHEADLINE =
  'Stacktape reads your repository, designs the infrastructure a senior DevOps team would build, and deploys and operates it in your own AWS account. From the first deploy to a production incident, your developers stay in control of every decision.';
export const EYEBROW = 'Like a PaaS, but in your own AWS account';
export const TRUST_LINE =
  'Open-source CLI (MIT). Plain CloudFormation in your own AWS account. Extend with any AWS resource. Eject anytime.';
export const CLOSING = 'That is the whole DevOps job.';
export const JOURNEY_TITLE = 'From your repository to a running production, one stop at a time';

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

/* ── The six stops ─────────────────────────────────────────────────────────────────────────── */

export type Stop = {
  number: string;
  id: string;
  /** One word under the plate on the route. */
  verb: string;
  name: string;
  /** Two or three plain sentences. Terms a Heroku or Vercel developer may not know are defined. */
  lead: string;
  /** What the reader does at this stop. Absent where the honest answer is that there is nothing to do. */
  you?: string;
};

export const STOPS: Stop[] = [
  {
    number: '01',
    id: 'designs',
    verb: 'design',
    name: 'Designs your infrastructure.',
    lead: 'Stacktape reads your repository and works out what your app needs on AWS: where it runs, its database, cache and queues, and how they connect. It writes that down as one file you can read, `stacktape.yml`, with the production defaults you would otherwise have to know: a private network, least-privilege permissions, backups. Nothing is created until you say so.',
    you: 'Run `npx stacktape init`, read what it decided, change anything with one click.'
  },
  {
    number: '02',
    id: 'ships',
    verb: 'ship',
    name: 'Ships it.',
    lead: 'Stacktape builds your containers and functions from source and deploys them into your AWS account. After the first deploy, every push to your main branch deploys, and every pull request gets its own preview environment: a full copy of the app on its own URL. Deploys are zero-downtime and can be rolled back.',
    you: 'Press Deploy once. Then push code.'
  },
  {
    number: '03',
    id: 'watches',
    verb: 'watch',
    name: 'Watches it.',
    lead: 'Metrics, logs, traces, uptime checks and alarms are wired up by the deploy itself. There are no agents to install and no dashboards to build. Everything is read from your own AWS account and shown in one place.'
  },
  {
    number: '04',
    id: 'incidents',
    verb: 'respond',
    name: 'Handles incidents.',
    lead: 'When something breaks, Stacktape opens an incident, tells you which release caused it, and packages everything a coding agent needs to fix it. You review the fix; nothing reaches production without your approval. Letting an agent fix and deploy on its own is opt-in and off by default.',
    you: 'Review the fix and approve it.'
  },
  {
    number: '05',
    id: 'secures',
    verb: 'secure',
    name: 'Secures it.',
    lead: 'Least-privilege permissions, private networking and managed secrets are the defaults of the generated setup. Guardrails block risky changes before they deploy, and every image you ship is scanned for known vulnerabilities.'
  },
  {
    number: '06',
    id: 'costs',
    verb: 'budget',
    name: 'Keeps costs in check.',
    lead: 'See what every resource costs, per project and environment, straight from your AWS bill. Set a budget and Stacktape warns you before a surprise. AWS bills you directly.',
    you: 'Set a budget once.'
  }
];

/* ── The example project ───────────────────────────────────────────────────────────────────── */

export const PROJECT = {
  name: 'acme-project',
  repo: 'acme/acme-project',
  region: 'eu-west-1',
  summary: 'A Next.js app with a background worker, using a Postgres database and a Redis cache.',
  urls: { web: 'https://acme.com', api: 'https://api.acme.com' }
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
    firewall: { type: 'web-app-firewall', properties: { scope: 'cloudfront' } }
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
      scope: cloudfront

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
] as const;

export const ESTIMATE = { resources: 14, monthly: '~$112/month' } as const;

/* ── 02 Ships it ───────────────────────────────────────────────────────────────────────────── */

export const ENVIRONMENTS = [
  { name: 'staging', status: 'live', release: 'v42', when: '12 min ago', url: 'https://staging.acme.com' },
  {
    name: 'production',
    status: 'deploying',
    release: 'v42',
    when: '1m 40s',
    url: 'https://acme.com · https://api.acme.com'
  }
] as const;

export const DEPLOY = {
  number: '#42',
  trigger: 'push to main',
  commit: 'c9e41f0',
  message: 'orders: apply pending migration',
  phases: [
    { name: 'Initialize', state: 'done', note: '4s' },
    { name: 'Package', state: 'done', chips: ['web 41s', 'apiService 58s', 'worker 6s'] },
    { name: 'Deploy', state: 'running', note: '21 of 33 resources' },
    { name: 'Outputs', state: 'todo', note: 'URLs and endpoints' }
  ]
} as const;

export const PULL_REQUEST = {
  number: '#128',
  title: 'checkout: retry payment webhook',
  stage: 'pr-128',
  url: 'https://pr-128.acme-preview.com'
} as const;

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

export const UPTIME = {
  url: 'https://api.acme.com/health',
  thirtyDay: '99.98%',
  regions: [
    { region: 'Ireland', code: 'eu-west-1', latency: '212 ms' },
    { region: 'Virginia', code: 'us-east-1', latency: '318 ms' },
    { region: 'Singapore', code: 'ap-southeast-1', latency: '402 ms' }
  ]
} as const;

/* ── 04 Handles incidents ──────────────────────────────────────────────────────────────────── */

export const INCIDENT = {
  id: 'inc_8f2k',
  title: 'Uptime check down · https://api.acme.com/health',
  release: {
    opened: 'Opened 4m after the last deploy',
    version: 'v41',
    commit: 'a1b2c3d',
    message: 'orders: add fulfillment status column',
    previous: 'v40',
    changed: 'what changed (3 commits)'
  },
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
    { time: '14:05', text: 'Details copied for agent', tone: 'plain' },
    {
      time: '14:08',
      text: 'Agent found the migration was never applied · PR #131 opened · you reviewed and merged it',
      tone: 'you'
    },
    { time: '14:12', text: 'v42 deployed through the pipeline', tone: 'plain' },
    { time: '14:13', text: 'Resolved · recovered on its own signals · 11 min', tone: 'ok' }
  ],
  optIn: 'Let an agent apply verified fixes and deploy them — opt-in, off by default'
} as const;

/* ── 05 Secures it ─────────────────────────────────────────────────────────────────────────── */

export const POSTURE = {
  passing: 27,
  total: 30,
  findings: [
    {
      finding: 'mainDatabase backups retained 1 day (staging)',
      rule: 'Require recoverable data stores',
      action: 'Fix in config'
    },
    {
      finding: 'apiService image: 2 critical CVEs in openssl 3.0.13',
      rule: 'No critical vulnerabilities in shipped images',
      badge: 'Fix PR opened',
      action: 'View PR'
    },
    {
      finding: 'plaintext STRIPE_KEY in config',
      rule: 'No plaintext secrets in config',
      action: 'Convert to $Secret'
    }
  ]
} as const;

export const GUARDRAILS_ON = [
  'Keep SQL private',
  'Require WAF on load balancers',
  'Require recoverable data stores'
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
      "As a startup founder & CTO, every hour is crucial. With Stacktape, we fast-tracked our AWS deployment process. Our development and production environments were operational in just two days. Stacktape's speed and efficiency have been game-changing for us",
    name: 'Eric Allam',
    role: 'CTO & Founder, Trigger.dev',
    fact: 'Series A startup, London. Runs ECS and Aurora PostgreSQL on Stacktape.'
  },
  {
    quote:
      'Stacktape (the product) and Stacktape (the team) have helped us move extremely fast. They abstract away so much of the complexity of AWS, and let us focus on our application logic, instead of infrastructure configuration. The team is second to none, hopping in to be true partners with us on our development journey. We would not be where we are today without Stacktape.',
    name: 'Henry Garrett',
    role: 'Founding Engineer, Receipts',
    fact: 'Early-stage startup, US. Runs ECS, Lambda, RDS and SQS on Stacktape.'
  },
  {
    quote:
      "Stacktape has been a game-changer for Lastmyle, providing a secure and intuitive way to manage our AWS deployments. It's allowed our small team to efficiently handle environments using GitOps, all while keeping a tight rein on costs.",
    name: 'Rhys Williams',
    role: 'CTO & Founder, Lastmyle',
    fact: 'Early-stage startup, New Zealand. GitOps with Java, Node.js and Next.js.'
  }
] as const;

/* ── YAML highlighter ──────────────────────────────────────────────────────────────────────── */

const RESOURCE_NAMES = new Set(Object.keys(ACME_CONFIG.resources));
const span = (cls: string, text: string) => `<span class="jn-y-${cls}">${escapeHtml(text)}</span>`;

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
