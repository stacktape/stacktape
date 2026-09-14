/*
 * Everything the "keys" study says and shows, in one place.
 *
 * Page copy, the six stages, the example project, the screens and the testimonials live here so
 * wording stays consistent across components. The YAML highlighter at the bottom runs on the
 * server: import this module from `.astro` frontmatter only (the command box island imports
 * `COMMANDS` alone).
 */

/* ── Page copy ─────────────────────────────────────────────────────────────────────────────── */

export const EYEBROW = 'Deploy to your own AWS account. No DevOps team needed.';
export const HEADLINE_A = 'AWS DevOps,';
export const HEADLINE_B = 'fully automated.';
export const HEADLINE = `${HEADLINE_A} ${HEADLINE_B}`;
export const SUBHEADLINE =
  'Stacktape reads your repository, designs the infrastructure like a senior DevOps team would, deploys it to your own AWS account and makes sure your app runs flawlessly forever after. It keeps you in the loop for any decision that requires human attention.';
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

/* ── The six stages ────────────────────────────────────────────────────────────────────────── */

export type StageKey = {
  /** The key's label. */
  label: string;
  /** Mono for the command key, sans for the others. */
  mono?: boolean;
  /** The small plate on the floor beside the key. */
  plate: string;
};

export type Stage = {
  number: string;
  id: string;
  name: string;
  text: string;
  /** The horizon glow while this stage is centred. */
  tone: 'teal' | 'green' | 'blue' | 'violet' | 'red' | 'gold';
  /** Present only where the visitor makes a decision. */
  key?: StageKey;
};

export const STAGES: Stage[] = [
  {
    number: '01',
    id: 'designs',
    name: 'Designs your infrastructure',
    text: 'Run one command. Stacktape reads your project on your machine and writes the whole AWS setup into one file: the app, the API, the worker, the database, the cache, with production defaults already applied. You see the picture, every decision it made and the monthly price before anything exists.',
    tone: 'teal',
    key: { label: '⏎ npx stacktape init', mono: true, plate: 'opens the wizard in your browser' }
  },
  {
    number: '02',
    id: 'deploys',
    name: 'Deploys it',
    text: 'Press Deploy and Stacktape builds your app and creates everything in your own AWS account, as plain CloudFormation you own. From then on a push to main ships with zero downtime, every pull request gets its own preview URL, and any release can be rolled back.',
    tone: 'green',
    key: { label: 'Deploy', plate: 'then: git push' }
  },
  {
    number: '03',
    id: 'monitors',
    name: 'Monitors it',
    text: 'Logs, metrics, traces and uptime checks are wired up by the deploy, with nothing to install. Stacktape follows a request through your services and checks from several regions that your app answers. Alerts go to Slack, email or a webhook.',
    tone: 'blue'
  },
  {
    number: '04',
    id: 'secures',
    name: 'Secures it',
    text: 'The setup is safe by default: a private network, permissions limited to what each part needs, managed secrets. Guardrails your team sets block a deploy that would break them, and what you ship is scanned for known vulnerabilities.',
    tone: 'violet'
  },
  {
    number: '05',
    id: 'incidents',
    name: 'Handles incidents',
    text: 'When the site goes down, errors spike or a critical vulnerability appears, Stacktape opens an incident and names the release that caused it. One click hands the evidence to your coding agent; you review its fix. Letting an agent fix and deploy on its own is opt-in.',
    tone: 'red',
    key: { label: 'Approve fix', plate: "the agent's pull request, your call" }
  },
  {
    number: '06',
    id: 'costs',
    name: 'Tracks costs',
    text: 'See what the app costs this month per environment and per resource, straight from your AWS bill. Set a budget once and get an alert before you reach it. AWS bills you; Stacktape never sits in the middle.',
    tone: 'gold',
    key: { label: 'Set budget', plate: '$150 / month · alert at 80 %' }
  }
];

/* ── The example project ───────────────────────────────────────────────────────────────────── */

export const PROJECT = {
  name: 'acme-project',
  region: 'eu-west-1',
  urls: { web: 'https://acme.com', api: 'https://api.acme.com' }
} as const;

export const ACCOUNT = { id: '4128…9903' } as const;

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

export const ACME_YAML = `# stacktape.yml — written by stacktape init
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
      scope: cloudfront`;

export const REVIEW = {
  title: "Here's your app on AWS",
  line: 'Read 41 files on this machine in 38 s. Nothing has been created on AWS.',
  decided: [
    'Database reachable only from the private network',
    'Two copies of apiService',
    'A week of database backups'
  ],
  estimate: '14 AWS resources · ~$112 / month'
} as const;

/* ── 02 Deploys ────────────────────────────────────────────────────────────────────────────── */

export const DEPLOY = {
  meta: `3 m 08 s · ${PROJECT.region} · your AWS account ${ACCOUNT.id}`,
  phases: [
    { name: 'Package', note: 'web 41 s · apiService 58 s · worker 6 s' },
    { name: 'Deploy', note: '33 resources created in your account' },
    { name: 'Outputs', note: '2 public URLs' }
  ],
  fromNowOn: [
    { from: 'push to main', to: 'v42 live · zero downtime' },
    { from: 'PR #128', to: 'pr-128.acme-preview.com' }
  ],
  rollback: 'Roll back to v41'
} as const;

/* ── 03 Monitors ───────────────────────────────────────────────────────────────────────────── */

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
    { name: 'handler', start: 6, duration: 198, kind: 'app' },
    { name: 'SELECT … FROM orders', start: 14, duration: 48, kind: 'db' },
    { name: 'redis GET', start: 66, duration: 2, kind: 'cache' },
    { name: 'POST /events', start: 168, duration: 31, kind: 'http' }
  ]
} as const;

export const UPTIME = {
  url: 'api.acme.com/health',
  status: 'Up',
  regions: [
    { region: 'Ireland', latency: '212 ms' },
    { region: 'Virginia', latency: '318 ms' },
    { region: 'Singapore', latency: '402 ms' }
  ],
  thirtyDay: '99.98 % over 30 days',
  alerts: 'Alerts → Slack #alerts'
} as const;

/* ── 04 Secures ────────────────────────────────────────────────────────────────────────────── */

export const POSTURE = {
  passing: 27,
  total: 30,
  findings: [
    { finding: 'apiService image: 2 critical CVEs in openssl 3.0.13', badge: 'Fix PR opened', action: 'View PR' },
    { finding: 'Plaintext STRIPE_KEY in config', action: 'Convert to $Secret' },
    { finding: 'mainDatabase backups retained 1 day (staging)', action: 'Fix in config' }
  ],
  guardrails: ['Keep SQL private', 'Require WAF on load balancers', 'Require recoverable data stores'],
  guardrailsLine: 'A deploy that would break a rule is blocked before anything changes.'
} as const;

/* ── 05 Incident ───────────────────────────────────────────────────────────────────────────── */

export const INCIDENT = {
  id: 'inc_8f2k',
  title: 'Uptime check down · https://api.acme.com/health',
  release: {
    opened: 'Opened 4 min after deploy v41',
    commit: 'a1b2c3d',
    message: 'orders: add fulfillment status column',
    link: 'What changed'
  },
  signals: [
    { text: 'Uptime check down', meta: '3 of 3 regions' },
    {
      text: 'PrismaClientKnownRequestError: column "fulfillment_status" does not exist',
      meta: 'apiService · 214 occurrences'
    }
  ],
  handoff: 'Copy details for agent',
  timeline: [
    { time: '13:58', text: 'v41 deployed', tone: 'plain' },
    { time: '14:02', text: 'Incident opened', tone: 'error' },
    { time: '14:05', text: 'Details copied for agent', tone: 'plain' },
    { time: '14:08', text: 'Fix PR #131 opened, reviewed and merged', tone: 'you' },
    { time: '14:13', text: 'Resolved, recovered on its own signals · 11 min', tone: 'ok' }
  ],
  optIn: 'Let an agent apply verified fixes and deploy on its own',
  optInState: 'Opt-in. Off by default.'
} as const;

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
export const BUDGET = { limit: 150, used: 75, alertAt: 80, alertAmount: 120 } as const;
export const BILLED_LINE = `Billed by AWS to account ${ACCOUNT.id}.`;

/* ── Testimonials ──────────────────────────────────────────────────────────────────────────── */

export const TESTIMONIALS = [
  {
    quote:
      "As a startup founder & CTO, every hour is crucial. With Stacktape, we fast-tracked our AWS deployment process. Our development and production environments were operational in just two days. Stacktape's speed and efficiency have been game-changing for us",
    name: 'Eric Allam',
    role: 'CTO & Founder, Trigger.dev'
  },
  {
    quote:
      'Stacktape (the product) and Stacktape (the team) have helped us move extremely fast. They abstract away so much of the complexity of AWS, and let us focus on our application logic, instead of infrastructure configuration. The team is second to none, hopping in to be true partners with us on our development journey. We would not be where we are today without Stacktape.',
    name: 'Henry Garrett',
    role: 'Founding Engineer, Receipts'
  },
  {
    quote:
      "Stacktape has been a game-changer for Lastmyle, providing a secure and intuitive way to manage our AWS deployments. It's allowed our small team to efficiently handle environments using GitOps, all while keeping a tight rein on costs.",
    name: 'Rhys Williams',
    role: 'CTO & Founder, Lastmyle'
  }
] as const;

/* ── YAML highlighter ──────────────────────────────────────────────────────────────────────── */

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const RESOURCE_NAMES = new Set(Object.keys(ACME_CONFIG.resources));
const span = (cls: string, text: string) => `<span class="ky-y-${cls}">${escapeHtml(text)}</span>`;

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
