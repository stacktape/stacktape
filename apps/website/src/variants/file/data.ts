/*
 * Everything the "file" study says and shows.
 *
 * The page copy, the file the wizard writes, the six comments pinned to its lines, the lens lines
 * that appear inside the file as the story advances, the screens and the testimonials live here so
 * wording stays consistent across components. The YAML highlighter at the bottom is a pure
 * function: the editor calls it per line in `.astro` frontmatter, and nothing here runs at import.
 */

/* ── Page copy ─────────────────────────────────────────────────────────────────────────────── */

export const EYEBROW = 'Deploy to your own AWS account. No DevOps team needed.';
export const HEADLINE = 'AWS DevOps, fully automated.';
export const SUBHEADLINE =
  'Stacktape reads your repository, designs the infrastructure like a senior DevOps team would, deploys it to your own AWS account and makes sure your app runs flawlessly forever after. It keeps you in the loop for any decision that requires human attention.';
export const TRUST_LINE = 'Open-source CLI (MIT) · extend with any AWS resource · eject anytime';
export const CLOSING_LINE = 'That is the whole DevOps job. Start with one command.';
export const TESTIMONIALS_TITLE = 'Teams running on Stacktape';

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

/* ── The example app ───────────────────────────────────────────────────────────────────────── */

export const PROJECT = {
  name: 'acme-project',
  repo: 'acme/acme-project',
  region: 'eu-west-1',
  account: '4128…9903',
  urls: { web: 'https://acme.com', api: 'https://api.acme.com' },
  read: { files: 41, seconds: '38 s' }
} as const;

/* ── The file ──────────────────────────────────────────────────────────────────────────────── */

/** `stacktape.yml` as the editor shows it: 48 lines, the comments are inserted between them. */
export const FILE = `# stacktape.yml — written by stacktape init. One file, the whole setup.
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
        properties: { buildContextPath: ./api, dockerfilePath: ./api/Dockerfile }
      resources: { cpu: 0.5, memory: 1024 }
      scaling: { minInstances: 2, maxInstances: 6 }
      connectTo: [mainDatabase, cache, worker]
  worker:
    type: function
    properties:
      packaging: { type: stacktape-lambda-buildpack, properties: { entryfilePath: api/src/worker.ts } }
      connectTo: [mainDatabase]
  mainDatabase:
    type: relational-database
    properties:
      engine: { type: aurora-postgresql, properties: { version: '16.4', port: 5432 } }
      accessibility: { accessibilityMode: vpc }
      automatedBackupRetentionDays: 7

  cache:
    type: redis-cluster
    properties: { engine: { type: redis7 }, instanceSize: cache.t3.micro }
  firewall:
    type: web-app-firewall
    properties: { scope: cloudfront }

hooks:
  afterDeploy:
    - scriptName: migrateDatabase
scripts:
  migrateDatabase:
    type: local-script
    properties:
      executeCommand: npx prisma migrate deploy
      connectTo: [mainDatabase]

# 14 AWS resources · $112.90 this month · budget $150`;

/* ── The six comments ──────────────────────────────────────────────────────────────────────── */

export type Tone = 'teal' | 'green' | 'blue' | 'violet' | 'red' | 'amber';

export type Screen = { app: 'wizard'; current: 'Review' | 'Deploy' } | { app: 'console'; section: string };

export type Chapter = {
  index: number;
  number: string;
  id: string;
  name: string;
  text: string;
  tone: Tone;
  /** The lines the comment refers to; the bracket in the gutter spans them. */
  bracket: readonly [number, number];
  /** What the slim bar of the nested window says. */
  screen: Screen;
};

export const CHAPTERS: Chapter[] = [
  {
    index: 1,
    number: '01',
    id: 'designs',
    name: 'Designs your infrastructure',
    tone: 'teal',
    bracket: [1, 9],
    screen: { app: 'wizard', current: 'Review' },
    text: 'Run one command. Stacktape reads your project on your machine and writes the whole AWS setup into one file: the app, the API, the worker, the database, the cache, with production defaults already applied. You see the picture, every decision it made and the monthly price before anything exists.'
  },
  {
    index: 2,
    number: '02',
    id: 'deploys',
    name: 'Deploys it',
    tone: 'green',
    bracket: [10, 18],
    screen: { app: 'wizard', current: 'Deploy' },
    text: 'Press Deploy and Stacktape builds your app and creates everything in your own AWS account, as plain CloudFormation you own. From then on a push to main ships with zero downtime, every pull request gets its own preview URL, and any release can be rolled back.'
  },
  {
    index: 3,
    number: '03',
    id: 'monitors',
    name: 'Monitors it',
    tone: 'blue',
    bracket: [19, 23],
    screen: { app: 'console', section: 'apiService' },
    text: 'Logs, metrics, traces and uptime checks are wired up by the deploy, with nothing to install. Stacktape follows a request through your services and checks from several regions that your app answers. Alerts go to Slack, email or a webhook.'
  },
  {
    index: 4,
    number: '04',
    id: 'secures',
    name: 'Secures it',
    tone: 'violet',
    bracket: [24, 33],
    screen: { app: 'console', section: 'Security' },
    text: 'The setup is safe by default: a private network, permissions limited to what each part needs, managed secrets. Guardrails your team sets block a deploy that would break them, and what you ship is scanned for known vulnerabilities.'
  },
  {
    index: 5,
    number: '05',
    id: 'incidents',
    name: 'Handles incidents',
    tone: 'red',
    bracket: [38, 40],
    screen: { app: 'console', section: 'Incident inc_8f2k' },
    text: 'When the site goes down, errors spike or a critical vulnerability appears, Stacktape opens an incident and names the release that caused it. One click hands the evidence to your coding agent; you review its fix. Letting an agent fix and deploy on its own is opt-in.'
  },
  {
    index: 6,
    number: '06',
    id: 'costs',
    name: 'Tracks costs',
    tone: 'amber',
    bracket: [41, 48],
    screen: { app: 'console', section: 'Costs' },
    text: 'See what the app costs this month per environment and per resource, straight from your AWS bill. Set a budget once and get an alert before you reach it. AWS bills you; Stacktape never sits in the middle.'
  }
];

/** Which lines precede which comment: the comment sits after the last line of its segment. */
export const SEGMENTS: { from: number; to: number; chapter: number }[] = [
  { from: 1, to: 9, chapter: 1 },
  { from: 10, to: 18, chapter: 2 },
  { from: 19, to: 23, chapter: 3 },
  { from: 24, to: 33, chapter: 4 },
  { from: 34, to: 40, chapter: 5 },
  { from: 41, to: 48, chapter: 6 }
];

export const WIZARD_RAIL = ['Start', 'Read', 'Review', 'Deploy'] as const;

/* ── Lens lines: what the file learns as the story advances ────────────────────────────────── */

export type Lens = {
  /** The line the lens row sits above. */
  above: number;
  /** The comment whose arrival reveals it. */
  chapter: number;
  kind: 'live' | 'metrics' | 'lock' | 'incident';
  text: string;
};

export const LENSES: Lens[] = [
  { above: 5, chapter: 2, kind: 'live', text: 'live · https://acme.com' },
  { above: 10, chapter: 2, kind: 'live', text: 'live · https://api.acme.com · v42 · 2 of 2 running' },
  { above: 19, chapter: 3, kind: 'metrics', text: '1.2k runs today · 0 errors · p95 340 ms · logs' },
  { above: 28, chapter: 4, kind: 'lock', text: 'no public address · reachable from apiService and worker only' },
  { above: 31, chapter: 4, kind: 'lock', text: 'no public address' },
  {
    above: 38,
    chapter: 5,
    kind: 'incident',
    text: 'incident inc_8f2k · v41 · migration not applied · resolved in 11 min by PR #131'
  }
];

/** The month's price of each resource, shown at the end of its own line once the costs comment is reached. */
export const PRICES: { line: number; amount: string }[] = [
  { line: 5, amount: '$3.80' },
  { line: 10, amount: '$34.20' },
  { line: 19, amount: '$0.70' },
  { line: 24, amount: '$61.40' },
  { line: 31, amount: '$11.90' },
  { line: 34, amount: '$0.90' }
];

/* ── 01 Review ─────────────────────────────────────────────────────────────────────────────── */

export const REVIEW = {
  heading: "Here's your app on AWS",
  note: `Read ${PROJECT.read.files} files on this machine in ${PROJECT.read.seconds}. Nothing has been created on AWS.`
} as const;

export const DECIDED = [
  { what: 'Database reachable only from the private network', why: 'No public address.' },
  { what: 'Two copies of apiService', why: 'One can fail without an interruption.' },
  { what: 'A week of database backups', why: 'Restore any day from the last seven.' }
] as const;

export const ESTIMATE = { resources: '14 AWS resources', monthly: '~$112 / month' } as const;

/* ── 02 Deploy ─────────────────────────────────────────────────────────────────────────────── */

export const DEPLOY = {
  duration: '3 m 08 s',
  rollback: 'Roll back to v41',
  phases: [
    { name: 'Package', note: 'web 41 s · apiService 58 s · worker 6 s' },
    { name: 'Deploy', note: '33 resources created in your account' },
    { name: 'Outputs', note: '2 public URLs' }
  ]
} as const;

export const AFTER_FIRST = {
  push: { trigger: 'push to main', result: 'v42 live', note: 'zero downtime' },
  pullRequest: { trigger: 'PR #128', result: 'pr-128.acme-preview.com' },
  release: { trigger: 'any release' }
} as const;

/* ── 03 Monitor ────────────────────────────────────────────────────────────────────────────── */

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
  thirtyDay: '99.98 % over 30 days',
  regions: [
    { region: 'Ireland', latency: '212 ms' },
    { region: 'Virginia', latency: '318 ms' },
    { region: 'Singapore', latency: '402 ms' }
  ]
} as const;

export const ALERTS = 'Alerts → Slack #alerts';

/* ── 04 Security ───────────────────────────────────────────────────────────────────────────── */

export const POSTURE = {
  passing: 27,
  total: 30,
  findings: [
    { finding: 'apiService image: 2 critical CVEs in openssl 3.0.13', badge: 'Fix PR opened', action: 'View PR' },
    { finding: 'Plaintext STRIPE_KEY in config', action: 'Convert to $Secret' },
    { finding: 'mainDatabase backups retained 1 day (staging)', action: 'Fix in config' }
  ]
} as const;

export const GUARDRAILS_ON = [
  'Keep SQL private',
  'Require WAF on load balancers',
  'Require recoverable data stores'
] as const;
export const GUARDRAIL_RULE = 'A deploy that would break a rule is blocked before anything changes.';

/* ── 05 Incident ───────────────────────────────────────────────────────────────────────────── */

export const INCIDENT = {
  id: 'inc_8f2k',
  title: 'Uptime check down · https://api.acme.com/health',
  release: {
    opened: 'Opened 4 min after deploy',
    version: 'v41',
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
    { time: '14:02', text: 'incident opened', tone: 'error' },
    { time: '14:05', text: 'details copied for agent', tone: 'plain' },
    { time: '14:08', text: 'fix PR #131 opened, reviewed and merged', tone: 'you' },
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
export const BUDGET = { limit: 150, alertAt: 80 } as const;

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

/* ── The editor's rows ─────────────────────────────────────────────────────────────────────── */

export type LineRow = { kind: 'line'; n: number; text: string; html: string; price?: string };
export type LensRow = { kind: 'lens'; lens: Lens; indent: number };
export type Row = LineRow | LensRow;

export type Segment = {
  chapter: Chapter;
  /** File lines and the lens rows above them, in order; each is one grid row. */
  rows: Row[];
  /** Grid rows the gutter bracket spans (`from` inclusive, `to` exclusive, 1-based). */
  bracket: { from: number; to: number };
};

/** When a line of the first segment types itself on load: its delay, its duration, its length. */
export type Typing = { delay: number; duration: number; chars: number };

/** The file cut into segments, each ending where its comment is inserted. */
export const buildSegments = (): Segment[] => {
  const lines = FILE.split('\n');
  return SEGMENTS.flatMap((segment) => {
    const chapter = CHAPTERS.find((candidate) => candidate.index === segment.chapter);
    if (!chapter) return [];
    const rows: Row[] = [];
    for (let n = segment.from; n <= segment.to; n += 1) {
      const text = lines[n - 1] ?? '';
      const indent = text.length - text.trimStart().length;
      for (const lens of LENSES) if (lens.above === n) rows.push({ kind: 'lens', lens, indent });
      const price = PRICES.find((candidate) => candidate.line === n)?.amount;
      rows.push(
        price
          ? { kind: 'line', n, text, html: highlightLine(text), price }
          : { kind: 'line', n, text, html: highlightLine(text) }
      );
    }
    const rowOf = (n: number) => rows.findIndex((row) => row.kind === 'line' && row.n === n) + 1;
    return [{ chapter, rows, bracket: { from: rowOf(chapter.bracket[0]), to: rowOf(chapter.bracket[1]) + 1 } }];
  });
};

/* ── Helpers ───────────────────────────────────────────────────────────────────────────────── */

/** Points for a 100×32 sparkline `<polyline>`, the newest value on the right. */
export const sparkline = (points: readonly number[]): string => {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(1, max - min);
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 30 - ((point - min) / range) * 24;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
};

/* ── YAML highlighter ──────────────────────────────────────────────────────────────────────── */

/** The things the file names: the six resources and the one script. Their definitions are white; a mention elsewhere is a reference. */
const NAMED = new Set(['web', 'apiService', 'worker', 'mainDatabase', 'cache', 'firewall', 'migrateDatabase']);

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const span = (cls: string, text: string) => `<span class="fl-y-${cls}">${escapeHtml(text)}</span>`;

/** Splits a flow collection's body on the commas at its own depth, leaving nested `{}`/`[]` and quotes intact. */
const splitTop = (body: string): string[] => {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let quote = '';
  for (const char of body) {
    if (quote) {
      current += char;
      if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"') quote = char;
    else if (char === '{' || char === '[') depth += 1;
    else if (char === '}' || char === ']') depth -= 1;
    else if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
};

const highlightValue = (raw: string, key?: string): string => {
  const value = raw.trim();
  if (!value) return '';
  if (/^(['"]).*\1$/.test(value)) return span('str', value);
  if (/^-?\d+(\.\d+)?$/.test(value)) return span('num', value);
  if (value === 'true' || value === 'false') return span('bool', value);
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = splitTop(value.slice(1, -1))
      .map((item) => span(NAMED.has(item) ? 'ref' : 'val', item))
      .join(span('punc', ', '));
    return span('punc', '[') + inner + span('punc', ']');
  }
  if (value.startsWith('{') && value.endsWith('}')) {
    const inner = splitTop(value.slice(1, -1))
      .map((pair) => {
        const at = pair.indexOf(':');
        if (at < 0) return highlightValue(pair);
        const pairKey = pair.slice(0, at).trim();
        return span('key', pairKey) + span('punc', ': ') + highlightValue(pair.slice(at + 1), pairKey);
      })
      .join(span('punc', ', '));
    return span('punc', '{ ') + inner + span('punc', ' }');
  }
  if (key === 'type') return span('type', value);
  if (NAMED.has(value)) return span('ref', value);
  return span('val', value);
};

/** One line of the file as HTML for a `<code>`: keys, names, types, strings, numbers, references, comments. */
export const highlightLine = (line: string): string => {
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
    const [, key = '', gap = '', value = ''] = pair;
    const trailing = value.slice(value.trimEnd().length);
    const cls = NAMED.has(key) && indent.length === 2 ? 'res' : 'key';
    out += span(cls, key) + span('punc', ':') + gap + highlightValue(value, key) + trailing;
  } else {
    out += highlightValue(rest) + rest.slice(rest.trimEnd().length);
  }
  if (comment) out += span('com', comment);
  return out;
};
