/*
 * Everything the "stage" study says and shows.
 *
 * The page copy, the six surfaces, the example project, the strips and the stage chapters (which
 * overlay tags sit on which diagram node, and where the camera looks) live here so the Astro
 * components, the stage island and the mobile chip lines read one source. Nothing here runs at
 * import time and nothing is server-only, so both islands may import it.
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

/* ── The six surfaces ──────────────────────────────────────────────────────────────────────── */

export type Surface = {
  number: string;
  id: string;
  name: string;
  text: string;
  /** The wizard or Console screen the strip is an excerpt of; a caption line, not a bar. */
  screen: string;
};

export const SURFACES: Surface[] = [
  {
    number: '01',
    id: 'designs',
    name: 'Designs your infrastructure',
    screen: 'stacktape init · Review',
    text: 'Run one command. Stacktape reads your project on your machine and writes the whole AWS setup into one file: the app, the API, the worker, the database, the cache, with production defaults already applied. You see the picture, every decision it made and the monthly price before anything exists.'
  },
  {
    number: '02',
    id: 'deploys',
    name: 'Deploys it',
    screen: 'stacktape init · Deploy',
    text: 'Press Deploy and Stacktape builds your app and creates everything in your own AWS account, as plain CloudFormation you own. From then on a push to main ships with zero downtime, every pull request gets its own preview URL, and any release can be rolled back.'
  },
  {
    number: '03',
    id: 'monitors',
    name: 'Monitors it',
    screen: 'Console · apiService · production',
    text: 'Logs, metrics, traces and uptime checks are wired up by the deploy, with nothing to install. Stacktape follows a request through your services and checks from several regions that your app answers. Alerts go to Slack, email or a webhook.'
  },
  {
    number: '04',
    id: 'secures',
    name: 'Secures it',
    screen: 'Console · Security · production',
    text: 'The setup is safe by default: a private network, permissions limited to what each part needs, managed secrets. Guardrails your team sets block a deploy that would break them, and what you ship is scanned for known vulnerabilities.'
  },
  {
    number: '05',
    id: 'incidents',
    name: 'Handles incidents',
    screen: 'Console · Incident inc_8f2k',
    text: 'When the site goes down, errors spike or a critical vulnerability appears, Stacktape opens an incident and names the release that caused it. One click hands the evidence to your coding agent; you review its fix. Letting an agent fix and deploy on its own is opt-in.'
  },
  {
    number: '06',
    id: 'costs',
    name: 'Tracks costs',
    screen: 'Console · Costs · production',
    text: 'See what the app costs this month per environment and per resource, straight from your AWS bill. Set a budget once and get an alert before you reach it. AWS bills you; Stacktape never sits in the middle.'
  }
];

/* ── The stage: one chapter per surface, plus the hero ─────────────────────────────────────── */

export type TagDot = 'green' | 'red' | 'gold' | 'brand';

export type StageTag = {
  /** A diagram node id, or `corner` for the caption slot at the stage's bottom-left. */
  anchor: string;
  text: string;
  dot?: TagDot;
  icon?: 'lock' | 'spark' | 'repo';
  tone?: 'gold';
  /** The incident tag: 1.5 s into the chapter it turns into this. */
  after?: { text: string; dot: TagDot };
};

export type Chapter = {
  index: number;
  /** The word in the stage bar. */
  label: string;
  /** How the stage camera looks at the model: a scale and the nodes it leans toward. */
  camera: { scale: number; focus?: string[] };
  tags: StageTag[];
};

export const CHAPTERS: Chapter[] = [
  {
    index: 0,
    label: 'Your repository',
    camera: { scale: 1 },
    tags: [{ anchor: 'corner', icon: 'repo', text: 'acme/acme-project · read on your machine' }]
  },
  {
    index: 1,
    label: 'Designing',
    camera: { scale: 1 },
    tags: [
      { anchor: 'mainDatabase', text: 'private network · no public address' },
      { anchor: 'mainDatabase', text: 'backups · 7 days' },
      { anchor: 'apiService', text: '2 copies' },
      { anchor: 'corner', text: '14 resources · ~$112 / month · nothing created yet' }
    ]
  },
  {
    index: 2,
    label: 'Live',
    camera: { scale: 1.06, focus: ['user', 'web'] },
    tags: [
      { anchor: 'web', dot: 'green', text: 'https://acme.com' },
      { anchor: 'apiService', dot: 'green', text: 'https://api.acme.com' },
      { anchor: 'corner', dot: 'green', text: 'CloudFormation stack in your AWS account 4128…9903 · 3 m 08 s' }
    ]
  },
  {
    index: 3,
    label: 'Monitoring',
    camera: { scale: 1.12, focus: ['apiService'] },
    tags: [
      { anchor: 'apiService', icon: 'spark', text: '184 req/s · p95 212 ms' },
      { anchor: 'web', dot: 'green', text: 'up · 3 regions' },
      { anchor: 'mainDatabase', text: '48 ms' },
      { anchor: 'cache', text: '2 ms' }
    ]
  },
  {
    index: 4,
    label: 'Security',
    camera: { scale: 1.08, focus: ['mainDatabase', 'cache'] },
    tags: [
      { anchor: 'mainDatabase', icon: 'lock', text: 'no public address' },
      { anchor: 'cache', icon: 'lock', text: 'no public address' },
      { anchor: 'firewall', icon: 'lock', text: 'WAF' },
      { anchor: 'apiService', dot: 'red', text: '2 critical CVEs · fix PR opened' },
      { anchor: 'corner', text: '27 of 30 checks passing' }
    ]
  },
  {
    index: 5,
    label: 'Incident',
    camera: { scale: 1.12, focus: ['apiService'] },
    tags: [
      {
        anchor: 'apiService',
        dot: 'red',
        text: 'uptime check down · v41 · 4 min after deploy',
        after: { dot: 'green', text: 'resolved · v42 · 11 min' }
      }
    ]
  },
  {
    index: 6,
    label: 'Costs',
    camera: { scale: 1 },
    tags: [
      { anchor: 'mainDatabase', tone: 'gold', text: '$61.40' },
      { anchor: 'apiService', tone: 'gold', text: '$34.20' },
      { anchor: 'cache', tone: 'gold', text: '$11.90' },
      { anchor: 'web', tone: 'gold', text: '$3.80' },
      { anchor: 'worker', tone: 'gold', text: '$0.70' },
      { anchor: 'corner', tone: 'gold', text: '$112.90 this month · budget $150' }
    ]
  }
];

/* ── 01 Review ─────────────────────────────────────────────────────────────────────────────── */

export const DECIDED = [
  { what: 'Database reachable only from the private network', why: 'No public address.' },
  { what: 'Two copies of apiService', why: 'One can fail without an interruption.' },
  { what: 'A week of database backups', why: 'Restore any day from the last seven.' }
] as const;

export const ESTIMATE = { resources: '14 AWS resources', monthly: '~$112 / month' } as const;

/* ── 02 Deploy ─────────────────────────────────────────────────────────────────────────────── */

export const DEPLOY = { duration: '3 m 08 s', rollback: 'Roll back to v41' } as const;

export const AFTER_FIRST = {
  push: { trigger: 'push to main', result: 'v42 live', note: 'zero downtime' },
  pullRequest: { trigger: 'PR #128', result: 'pr-128.acme-preview.com' }
} as const;

/* ── 03 Monitor ────────────────────────────────────────────────────────────────────────────── */

export const METRICS = [
  { label: 'Requests', value: '184', unit: 'req/s', points: [52, 48, 55, 61, 58, 66, 63, 70, 74, 68, 72, 78, 75, 80] },
  { label: 'p95 latency', value: '212', unit: 'ms', points: [40, 44, 38, 46, 42, 48, 45, 41, 47, 44, 50, 46, 43, 45] },
  { label: '5xx rate', value: '0.02', unit: '%', points: [6, 5, 7, 6, 4, 6, 5, 8, 6, 5, 6, 4, 6, 5] }
] as const;

export const UPTIME = {
  url: 'api.acme.com/health',
  thirtyDay: '99.98 % over 30 days',
  regions: [
    { region: 'Ireland', latency: '212 ms' },
    { region: 'Virginia', latency: '318 ms' },
    { region: 'Singapore', latency: '402 ms' }
  ]
} as const;

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
