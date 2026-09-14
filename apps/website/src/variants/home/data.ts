/*
 * Everything the "home" study says and shows, in one place.
 *
 * The page copy, the six moments, the example project, the screens and the testimonials live here
 * so wording stays consistent across components. The YAML highlighter at the bottom runs on the
 * server: import this module from `.astro` frontmatter only (the command box island imports
 * `COMMANDS` alone).
 */

/* ── Page copy ─────────────────────────────────────────────────────────────────────────────── */

export const EYEBROW = 'Deploy to your own AWS account. No DevOps team needed.';
export const HEADLINE = 'AWS DevOps, fully automated.';
export const SUBHEADLINE =
  'Stacktape reads your repository, designs the infrastructure like a senior DevOps team would, deploys it to your own AWS account, and makes sure your app runs flawlessly forever after. It keeps you in the loop for any decision that requires human attention.';
export const TRUST_LINE = 'Open-source CLI (MIT) · extend with any AWS resource · eject anytime';
export const CLOSING_TITLE = 'That is the whole DevOps job. Start with one command.';
export const VOICES_TITLE = 'Teams running on Stacktape';

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

/* ── The six steps ─────────────────────────────────────────────────────────────────────────── */

export type Step = {
  number: string;
  id: string;
  /** What Stacktape does, in the third person: the step's name. */
  name: string;
  /** Plain sentences. Terms a Heroku or Vercel developer may not know are defined or avoided. */
  text: string;
  /** What the reader does at this step. Absent where they do nothing. */
  you?: string;
  /** Which side the card sits on, on desktop; the path runs in the free strip beside it. */
  side: 'left' | 'right';
};

export const STEPS: Step[] = [
  {
    number: '01',
    id: 'designs',
    name: 'Designs your infrastructure',
    text: 'Run one command and Stacktape reads your project on your machine: the web app, the API, the worker, the database, the cache. It writes the whole setup into one file with production defaults already applied — a private network, permissions limited to what each part needs, backups — and shows you the picture, every decision it made, and the estimated monthly price. Nothing is created on AWS yet.',
    you: 'Run `npx stacktape init`. Read what it decided; change anything with one click.',
    side: 'left'
  },
  {
    number: '02',
    id: 'deploys',
    name: 'Deploys it',
    text: 'When you press Deploy, Stacktape builds your containers and functions from source and creates everything in the AWS account you name, through CloudFormation, AWS’s own provisioning service, so it is plain AWS you own. Stacktape does not host your app: it runs in your account, and AWS bills you. From then on a push to your main branch ships an update with no downtime, every pull request gets its own preview URL, and any release can be rolled back.',
    you: 'Press Deploy. After that, push to ship.',
    side: 'right'
  },
  {
    number: '03',
    id: 'monitors',
    name: 'Monitors it',
    text: 'Logs, metrics, traces and uptime checks come with the deploy; there is no agent to install and no dashboard to build. Stacktape reads them from the AWS account your app runs in, follows a single request through your services, and checks from several regions that the app answers. Alerts go to Slack, email or a webhook.',
    side: 'left'
  },
  {
    number: '04',
    id: 'secures',
    name: 'Secures it',
    text: 'The setup it writes is safe by default: databases have no public address, each part gets only the access it needs, secrets are stored as managed secrets. Rules your team sets, like keeping SQL private, block a deploy that would break them before anything changes. What you ship is scanned for known vulnerabilities, and the running setup is checked against the same rules.',
    side: 'right'
  },
  {
    number: '05',
    id: 'incidents',
    name: 'Handles incidents',
    text: 'When the site goes down, errors spike, or a critical vulnerability appears, Stacktape opens an incident and names the release that caused it, with the evidence. One button packages everything a coding agent needs to fix it; you review its pull request. The incident closes only when the same signals that opened it confirm recovery. Letting an agent fix and deploy on its own is opt-in and off by default.',
    you: 'Copy the details to your agent. Review and approve the fix.',
    side: 'left'
  },
  {
    number: '06',
    id: 'costs',
    name: 'Tracks costs',
    text: 'See what the app costs this month, per environment and per resource, straight from your own AWS billing data. Set a budget once and get an alert before you reach it. AWS bills you directly; Stacktape never sits in the middle.',
    you: 'Set a budget once.',
    side: 'right'
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

/** The customer's own AWS account, shown on every Console window so ownership needs no legend. */
export const ACCOUNT = { id: '4128…9903', alias: 'acme-dev', user: 'matus' } as const;

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

/* ── 02 Deploys ────────────────────────────────────────────────────────────────────────────── */

export const DEPLOY = {
  intro: `Deploying to AWS account ${ACCOUNT.id} (${ACCOUNT.alias}) as ${ACCOUNT.user}. 14 resources will be created.`,
  reach: 'web and apiService get a public URL. Nothing else is reachable from the internet.',
  phases: [
    { name: 'Initialize', note: 'config compiled to CloudFormation' },
    { name: 'Package', chips: ['web 41s', 'apiService 58s', 'worker 6s'] },
    { name: 'Deploy', note: '33 of 33 resources created in your account' },
    { name: 'Outputs', note: '2 public URLs' }
  ],
  duration: '3m 08s'
} as const;

/** What deploying looks like after the first time: a push, a preview per pull request, a rollback. */
export const AFTER_FIRST = {
  push: { release: 'v42', trigger: 'push to main', commit: 'c9e41f0', note: 'zero downtime · 3m 08s' },
  pullRequest: {
    number: '#128',
    title: 'checkout: retry payment webhook',
    stage: 'pr-128',
    url: 'https://pr-128.acme-preview.com'
  },
  rollback: 'v41'
} as const;

/* ── 03 Watches ────────────────────────────────────────────────────────────────────────────── */

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

/* ── 04 Incident ───────────────────────────────────────────────────────────────────────────── */

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
  optIn: 'Let an agent apply verified fixes and deploy them on its own'
} as const;

/* ── 05 Secures ────────────────────────────────────────────────────────────────────────────── */

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

/* ── 06 Costs ──────────────────────────────────────────────────────────────────────────────── */

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
const span = (cls: string, text: string) => `<span class="hm-y-${cls}">${escapeHtml(text)}</span>`;

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
