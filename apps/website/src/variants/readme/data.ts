/*
 * Everything the "readme" page says and shows.
 *
 * The page copy, the seven sections, the example project, the screens, the README's own furniture
 * (badges, repo header, sidebar facts, captions) and the testimonials live here so the Astro
 * components and the islands read one source. Nothing runs at import time; the helpers at the
 * bottom are pure functions the screens call from frontmatter.
 */

/* ── Page copy ─────────────────────────────────────────────────────────────────────────────── */

export const ANNOUNCEMENT = {
  text: 'Meet Stacktape',
  accent: 'v4',
  cta: "See what's new",
  href: '/blog/stacktape-v4'
} as const;

export const HEADLINE_LINES = ['AWS DevOps,', 'fully automated.'] as const;
export const HEADLINE = HEADLINE_LINES.join(' ');
export const SUBHEADLINE =
  'Stacktape reads your repository, designs the infrastructure like a senior DevOps team would, deploys it to your own AWS account and makes sure your app runs flawlessly forever after. It keeps you in the loop for any decision that requires human attention.';
export const TRUST_LINE = 'Open-source CLI (MIT) · Your AWS account · Your config, in your repository';
export const CLOSING = {
  title: 'See what Stacktape makes of your app',
  text: "Run it in your repository. Review the infrastructure, the decisions and the estimated AWS cost. You'll have a configuration you can keep before you decide to deploy."
} as const;
export const TESTIMONIALS_TITLE = 'What teams say about Stacktape';
export const COMMAND_HINT = 'opens the wizard in your browser';

/** Each tab's lines, in order. The install tabs end with `stacktape init`: the next command after installing. */
export const COMMANDS = [
  { id: 'npx', label: 'npx', lines: ['npx stacktape init'] },
  { id: 'macos', label: 'macOS', lines: ['curl -L https://installs.stacktape.com/macos.sh | sh', 'stacktape init'] },
  { id: 'linux', label: 'Linux', lines: ['curl -L https://installs.stacktape.com/linux.sh | sh', 'stacktape init'] },
  {
    id: 'windows',
    label: 'Windows',
    lines: ['iwr https://installs.stacktape.com/windows.ps1 -useb | iex', 'stacktape init']
  }
] as const;

export const LINKS = {
  howItWorks: '#designs',
  getStarted: '#get-started',
  docs: 'https://docs.stacktape.com',
  pricing: '/pricing',
  blog: '/blog',
  github: 'https://github.com/stacktape/stacktape',
  console: 'https://console.stacktape.com',
  demo: 'https://cal.com/stacktape/30min',
  status: 'https://status.stacktape.com'
} as const;

export const NAV_LINKS = [
  { label: 'How it works', href: LINKS.howItWorks },
  { label: 'Docs', href: LINKS.docs },
  { label: 'Pricing', href: LINKS.pricing },
  { label: 'Blog', href: LINKS.blog },
  { label: 'GitHub', href: LINKS.github }
] as const;

/** The sidebar's Docs block. */
export const DOC_LINKS = [
  { label: 'Getting started', href: 'https://docs.stacktape.com/cli/init' },
  { label: 'Resources', href: 'https://docs.stacktape.com/configuration/resources' },
  { label: 'Packaging', href: 'https://docs.stacktape.com/packaging/overview' },
  { label: 'CI/CD & GitOps', href: 'https://docs.stacktape.com/ci-cd-and-gitops/overview' },
  { label: 'Observability', href: 'https://docs.stacktape.com/observability/overview' },
  { label: 'Guardrails', href: 'https://docs.stacktape.com/guardrails/overview' },
  { label: 'Costs', href: 'https://docs.stacktape.com/managing-costs/overview' },
  { label: 'Using with AI', href: 'https://docs.stacktape.com/using-with-ai/overview' }
] as const;

/* The footer is one row: the sidebar already carries docs, contact and pricing. */
export const FOOTER_NOTES = ['© 2026 Stacktape', 'Open-source CLI (MIT)', 'Made in the EU'] as const;
export const FOOTER_LINKS = [
  { label: 'Privacy policy', href: '/privacy-policy' },
  { label: 'Terms of use', href: '/terms-of-use' },
  { label: 'System status', href: LINKS.status }
] as const;

/* ── The example project ───────────────────────────────────────────────────────────────────── */

export const PROJECT = {
  name: 'acme-project',
  stage: 'production',
  region: 'eu-west-1',
  urls: { web: 'https://acme.com', api: 'https://api.acme.com', preview: 'https://pr-128.preview.acme.com' }
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

/* ── The seven sections ────────────────────────────────────────────────────────────────────── */

export type Section = {
  index: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  number: string;
  id: string;
  name: string;
  text: string;
  gets: readonly [string, string, string];
};

export const SECTIONS: readonly Section[] = [
  {
    index: 1,
    number: '01',
    id: 'designs',
    name: 'Designs the stack your app needs',
    text: 'Your app already tells us a lot: the framework, the database, the background jobs. Stacktape reads your repository with your coding agent and proposes an AWS setup with sensible defaults. Review why each resource is there, how it connects to your code, and what the setup is likely to cost.',
    gets: [
      'Private networking, database recovery and scaling settings in the same stack. Review the choices and their costs.',
      'Services, databases and queues connected, including their permissions and connection settings.',
      'One YAML or TypeScript config you own. Add native AWS resources or CDK constructs as your app grows.'
    ]
  },
  {
    index: 2,
    number: '02',
    id: 'packages',
    name: 'Packages it',
    text: 'Stacktape turns your code into Lambda packages and container images. Point it at an entry file and the built-in buildpacks handle the build, or use your own Dockerfile. Builds run in parallel, with caching that reuses work from previous releases. Stacktape handles packaging and uploads as part of the deploy.',
    gets: [
      'Built-in builds for Node.js, Python, Java, Go, Ruby, PHP and .NET, or your own Dockerfile or prebuilt image.',
      'Parallel builds, dependency caches and reuse of unchanged artifacts.',
      'Hosted builds and a managed image registry in your AWS account.'
    ]
  },
  {
    index: 3,
    number: '03',
    id: 'deploys',
    name: 'Deploys it',
    text: 'A push to main deploys. Stacktape takes care of the infrastructure update, application rollout and post-deploy checks. Pull requests get isolated environments, production releases can shift traffic gradually, and a failed release can return to its previous version. You manage the deployment rules in one place.',
    gets: [
      'Push-to-deploy from GitHub, GitLab or Bitbucket, with full PR environments that clean up when the pull request closes.',
      'Canary or linear rollouts for Lambda and supported containers, with verification checks and automatic rollback.',
      'One-command rollback to a retained release, using its saved artifacts without a rebuild.'
    ]
  },
  {
    index: 4,
    number: '04',
    id: 'monitors',
    name: 'Monitors it',
    text: 'Stacktape brings your logs, metrics, traces and errors into one Console. Exceptions are grouped across services, public URLs are checked from multiple regions, and browser tests verify critical flows. Follow a slow or failing request through your services, open its logs and compare what changed after a deployment.',
    gets: [
      'An error inbox with grouped exceptions, stack traces and release context.',
      'Service performance and request traces, with browser errors and page performance linked to the backend.',
      'Multi-region uptime checks, scheduled browser and API tests, and a public status page for your customers.'
    ]
  },
  {
    index: 5,
    number: '05',
    id: 'secures',
    name: 'Secures it',
    text: "Security is part of the deployment. Stacktape wires resource permissions and network access, uses secret references to keep credentials out of configuration, and enforces your team's guardrails. Dependency, container and secret scans show which services need attention, with the affected environment and a fix where one is available.",
    gets: [
      'Organization-wide rules for private databases, backups, approved regions and required firewalls.',
      'Dependency and image scans, secret detection, and policies that block releases which fail your security checks.',
      'Software inventories (SBOMs) stored in your AWS account, rechecks for new vulnerabilities, and fix pull requests to review.'
    ]
  },
  {
    index: 6,
    number: '06',
    id: 'incidents',
    name: 'Handles incidents',
    text: 'When a check fails or errors spike, Stacktape opens an incident with the signals, affected services and recent release in one place. Its built-in investigation uses logs, traces and code to propose a cause and prepare a fix pull request. You review the change and decide what gets deployed.',
    gets: [
      'Related alarms, errors and failed checks grouped into one incident, with a release timeline.',
      'Alerts in Slack, Microsoft Teams, email or a webhook, with acknowledgement and notification controls.',
      "Give your coding agent the same context through an evidence bundle or Stacktape's MCP server."
    ]
  },
  {
    index: 7,
    number: '07',
    id: 'costs',
    name: 'Tracks costs',
    text: "See what each project, environment and resource costs this month, using your AWS billing data. Set a budget and Stacktape alerts you when actual or forecast spending crosses your thresholds. AWS bills you directly. Stacktape's subscription is separate, with a free plan to get started.",
    gets: [
      'Costs by project, stage and resource, with shared costs shown separately.',
      'Budget and forecast alerts for a single stack or your organization.',
      'Estimates in the init wizard, before you create any resources.'
    ]
  }
];

/* ── The windows' addresses ────────────────────────────────────────────────────────────────── */

const CONSOLE_HOST = 'console.stacktape.com';
const STAGE_PATH = `/projects/${PROJECT.name}/${PROJECT.stage}`;

export const URLS = {
  overview: { host: CONSOLE_HOST, path: STAGE_PATH },
  configEditor: { host: CONSOLE_HOST, path: `/projects/${PROJECT.name}/config-editor` },
  diagram: { host: CONSOLE_HOST, path: `${STAGE_PATH}/diagram` },
  build: { host: CONSOLE_HOST, path: `${STAGE_PATH}/deployments/v42/build` },
  deployments: { host: CONSOLE_HOST, path: `${STAGE_PATH}/deployments` },
  monitoring: { host: CONSOLE_HOST, path: `${STAGE_PATH}/monitoring` },
  security: { host: CONSOLE_HOST, path: `${STAGE_PATH}/security` },
  incident: { host: CONSOLE_HOST, path: `${STAGE_PATH}/incidents/inc_8f2k` },
  costs: { host: CONSOLE_HOST, path: `${STAGE_PATH}/costs` }
} as const;

/* ── The cover composite ───────────────────────────────────────────────────────────────────── */

export const COVER = {
  nav: ['Overview', 'Deployments', 'Monitoring', 'Guardrails', 'Costs'] as const,
  current: 'Overview',
  status: { badge: 'Live', version: 'v42', region: PROJECT.region, deployed: 'deployed 12 min ago' },
  tileState: 'healthy',
  kpis: [
    { label: 'Deployments 30d', value: '48' },
    { label: 'Error rate', value: '0.02 %' },
    { label: 'AWS cost MTD', value: '$112.90' }
  ],
  terminal: {
    phases: [
      { name: 'Initialize', state: 'done' },
      { name: 'Package', state: 'done' },
      { name: 'Deploy', state: 'active', note: '91 %' },
      { name: 'Outputs', state: 'todo' }
    ],
    progress: 91,
    rows: [
      { name: 'web', state: 'created' },
      { name: 'apiService', state: 'created' },
      { name: 'worker', state: 'created' },
      { name: 'cache', state: 'created' },
      { name: 'mainDatabase', state: 'creating…' },
      { name: 'firewall', state: 'creating…' }
    ]
  }
} as const;

/* ── 01 · the config editor ────────────────────────────────────────────────────────────────── */

const YAML_SOURCE = `resources:
  mainDatabase:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql
        properties: { version: '16' }
  cache:
    type: redis-cluster
    properties:
      instanceSize: cache.t3.micro
  worker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties: { entryfilePath: api/src/worker.ts }
      connectTo: [mainDatabase]
  apiService:
    type: web-service
    properties:
      packaging:
        type: custom-dockerfile
        properties: { dockerfilePath: ./api/Dockerfile }
      resources: { cpu: 0.5, memory: 1024 }
      scaling: { minInstances: 2, maxInstances: 6 }
      connectTo: [mainDatabase, cache, worker]
  web:
    type: nextjs-web
    properties:
      appDirectory: ./web
      connectTo: [apiService]
  firewall:
    type: web-app-firewall
    properties:
      scope: cloudfront`;

const TS_SOURCE = `import {
  defineConfig, NextjsWeb, WebService, LambdaFunction,
  RelationalDatabase, RedisCluster, WebAppFirewall
} from 'stacktape';

export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({ engine: 'aurora-postgresql', version: '16' });
  const cache = new RedisCluster({ instanceSize: 'cache.t3.micro' });
  const worker = new LambdaFunction({
    entryfilePath: 'api/src/worker.ts', connectTo: [mainDatabase]
  });
  const apiService = new WebService({
    dockerfile: './api/Dockerfile', cpu: 0.5, memory: 1024,
    scaling: { minInstances: 2, maxInstances: 6 },
    connectTo: [mainDatabase, cache, worker]
  });
  const web = new NextjsWeb({ appDirectory: './web', connectTo: [apiService] });
  const firewall = new WebAppFirewall({ scope: 'cloudfront' });
  return { resources: { web, apiService, worker, mainDatabase, cache, firewall } };
});`;

export type EditorFileId = 'yml' | 'ts';

/** The same stack twice; YAML is the tab that is open. */
export const EDITOR = {
  files: [
    { id: 'yml', name: 'stacktape.yml', language: 'YAML', source: YAML_SOURCE },
    { id: 'ts', name: 'stacktape.ts', language: 'TypeScript', source: TS_SOURCE }
  ],
  /** The IntelliSense card under the property the pointer rests on, in either file. */
  hover: {
    word: 'scaling',
    signature: {
      yml: 'scaling: { minInstances?: number; maxInstances?: number; … }',
      ts: '(property) scaling?: { minInstances?: number; maxInstances?: number; … }'
    },
    text: 'How many container instances run. Stacktape adds instances while CPU or memory stays above the target and removes them when it drops.',
    link: 'View docs'
  },
  /** The callouts beside the window, in the order the resources appear in both files. */
  callouts: [
    { resource: 'mainDatabase', text: 'Prisma schema targets PostgreSQL' },
    { resource: 'cache', text: 'ioredis in package.json' },
    { resource: 'worker', text: 'worker.ts subscribes to the queue' },
    { resource: 'apiService', text: 'Dockerfile in ./api' },
    { resource: 'web', text: 'next.config.js in ./web' },
    { resource: 'firewall', text: 'public web app' }
  ],
  /** The lens above each resource, shown on phones where the callouts have no room. */
  lenses: {
    web: 'found next.config.js in ./web',
    apiService: 'found ./api/Dockerfile',
    worker: 'worker.ts subscribes to the queue',
    mainDatabase: 'Prisma schema targets PostgreSQL',
    cache: 'ioredis in package.json',
    firewall: 'public web app'
  } as Record<string, string>,
  status: ['Saved', '0 problems']
} as const satisfies {
  files: readonly { id: EditorFileId; name: string; language: string; source: string }[];
  hover: { word: string; signature: Record<EditorFileId, string>; text: string; link: string };
  callouts: readonly { resource: string; text: string }[];
  lenses: Record<string, string>;
  status: readonly string[];
};

/* ── 02 · the build ────────────────────────────────────────────────────────────────────────── */

export type BuildLane = {
  name: string;
  kind: string;
  /** Widths are percentages of the shared, unlabelled axis. */
  segments: readonly { label: string; width: number; tone: 'work' | 'cached' | 'reused' }[];
  /** A word right after a bar that is only a stub. */
  chip?: string;
  result: string;
};

const BUILD_LANES: readonly BuildLane[] = [
  { name: 'web', kind: 'Next.js', segments: [{ label: 'bundle', width: 70, tone: 'work' }], result: 'bundled' },
  {
    name: 'apiService',
    kind: 'container image',
    segments: [
      { label: 'dependencies · cached', width: 34, tone: 'cached' },
      { label: 'build', width: 44, tone: 'work' },
      { label: 'push to ECR', width: 22, tone: 'work' }
    ],
    result: 'built · 4 of 6 layers from cache'
  },
  {
    name: 'worker',
    kind: 'Lambda',
    segments: [{ label: '', width: 7, tone: 'reused' }],
    chip: 'reused · unchanged',
    result: 'reused'
  }
];

export const BUILD = {
  heading: 'Build · v42',
  line: 'orders: add fulfillment status · three workloads, built in parallel',
  lanes: BUILD_LANES,
  buildpacks: {
    title: 'Built-in buildpacks',
    chips: ['Node.js', 'Python', 'Java', 'Go', 'Ruby', 'PHP', '.NET'],
    other: 'or your Dockerfile'
  },
  footer: 'Artifacts stored in your AWS account · ECR for images · S3 for Lambda packages'
} as const;

/* ── 03 · deployments ──────────────────────────────────────────────────────────────────────── */

export const DEPLOYMENTS = {
  heading: 'Deployments',
  line: 'push to main → production · pull request → preview',
  rolling: {
    version: 'v42',
    ref: 'main a1b2c3d',
    message: 'orders: fulfillment status',
    badge: 'Rolling out',
    traffic: { from: '10 %', to: '100 %', label: 'canary · 4 min left', percent: 10 },
    rollback: 'Roll back to v41'
  },
  live: { version: 'v41', ref: 'main 9f8e7d6', badge: 'Live' },
  preview: { version: 'pr-128', message: 'checkout: apple pay', badge: 'Preview', url: PROJECT.urls.preview }
} as const;

/* ── 04 · monitoring ───────────────────────────────────────────────────────────────────────── */

export const METRICS = [
  { label: 'Requests', value: '184', unit: 'req/s', points: [52, 48, 55, 61, 58, 66, 63, 70, 74, 68, 72, 78, 75, 80] },
  { label: 'p95 latency', value: '212', unit: 'ms', points: [40, 44, 38, 46, 42, 48, 45, 41, 47, 44, 50, 46, 43, 45] },
  { label: '5xx', value: '0.02', unit: '%', points: [6, 5, 7, 6, 4, 6, 5, 8, 6, 5, 6, 4, 6, 5] }
] as const;

/** Spans of one request. Offsets and durations in milliseconds; the root is 212 ms long. */
export const TRACE = {
  name: 'GET /orders',
  total: 212,
  spans: [
    { name: 'GET /orders', start: 0, end: 212, kind: 'http' },
    { name: 'handler', start: 6, end: 204, kind: 'app' },
    { name: 'SELECT … FROM orders', start: 14, end: 62, kind: 'db' },
    { name: 'redis GET', start: 66, end: 68, kind: 'cache' },
    { name: 'POST /events', start: 168, end: 199, kind: 'http' }
  ]
} as const;

export const UPTIME = {
  url: 'api.acme.com/health',
  availability: '99.98 %',
  regions: [
    { region: 'Ireland', latency: '212 ms' },
    { region: 'Virginia', latency: '318 ms' },
    { region: 'Singapore', latency: '402 ms' }
  ]
} as const;

/* ── 05 · security ─────────────────────────────────────────────────────────────────────────── */

export type SecurityTone = 'ok' | 'warn' | 'error';
export type SecurityIcon = 'package' | 'image' | 'key' | 'shield';

export const SECURITY = {
  posture: {
    passing: 27,
    total: 30,
    unit: 'checks',
    state: 'Protected',
    note: 'Rechecked against new advisories every day'
  },
  tiles: [
    { icon: 'package', name: 'Dependencies', scope: 'scanned', result: '0 critical', tone: 'ok' },
    { icon: 'image', name: 'Container images', scope: 'scanned', result: '1 fixable', tone: 'warn' },
    { icon: 'key', name: 'Secrets', scope: 'scanned', result: 'none exposed', tone: 'ok' },
    { icon: 'shield', name: 'Configuration', scope: '18 guardrails', result: 'all passing', tone: 'ok' }
  ],
  findings: [
    {
      tone: 'warn',
      lead: 'worker · production',
      rest: 'vulnerable dependency · fixed version available',
      button: 'Review fix PR'
    },
    {
      tone: 'error',
      lead: 'Staging deploy blocked',
      rest: 'mainDatabase would get a public address',
      button: 'Fix in config'
    }
  ],
  footer: { link: 'View deployment SBOM', rest: 'stored in your AWS account' }
} as const satisfies {
  posture: { passing: number; total: number; unit: string; state: string; note: string };
  tiles: readonly { icon: SecurityIcon; name: string; scope: string; result: string; tone: SecurityTone }[];
  findings: readonly { tone: SecurityTone; lead: string; rest: string; button: string }[];
  footer: { link: string; rest: string };
};

/* ── 06 · the incident ─────────────────────────────────────────────────────────────────────── */

export const INCIDENT = {
  title: 'Uptime check failed · api.acme.com/health',
  badge: 'Resolved',
  duration: '11 min',
  timeline: [
    { time: '13:58', text: 'v41 deployed', tone: 'plain' },
    { time: '14:02', text: 'incident opened · 3 of 3 regions failing', tone: 'error' },
    {
      time: '14:03',
      text: 'error grouped · PrismaClientKnownRequestError: column "fulfillment_status" does not exist · 214 occurrences',
      tone: 'plain'
    },
    { time: '14:08', text: 'fix PR #131 opened by your agent, reviewed and merged', tone: 'plain' },
    { time: '14:13', text: 'resolved · checks passing', tone: 'ok' }
  ],
  alerted: 'Alerted #alerts on Slack · 14:02'
} as const;

/* ── 07 · costs ────────────────────────────────────────────────────────────────────────────── */

export const COSTS = {
  heading: 'Costs · September',
  total: 112.9,
  note: 'from your AWS bill · no markup',
  bars: [
    { name: 'mainDatabase', amount: 61.4 },
    { name: 'apiService', amount: 34.2 },
    { name: 'cache', amount: 11.9 },
    { name: 'web', amount: 3.8 },
    { name: 'other', amount: 0.9 },
    { name: 'worker', amount: 0.7 }
  ],
  budget: { limit: 150, alertAt: 80, used: 75 }
} as const;

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

export const money = (amount: number) => `$${amount.toFixed(2)}`;

/* Two small tokenizers, enough for the config file the editor shows in either language. */

export type EditorRow =
  | { kind: 'lens'; indent: number; text: string }
  | { kind: 'code'; number: number; html: string; resource?: string }
  | { kind: 'hover'; number: number; before: string; word: string; after: string };

type Language = {
  /** One source line as HTML. */
  line: (text: string) => string;
  /** The rest of the hovered line after the hovered word. */
  tail: (text: string) => string;
  /** The resource a line declares, if it declares one. */
  resourceOf: (text: string) => string | undefined;
};

const RESOURCE_NAMES = new Set(Object.keys(ACME_CONFIG.resources));
const TS_KEYWORDS = new Set(['import', 'from', 'export', 'default', 'const', 'new', 'return']);
const TS_CLASSES = new Set([
  'NextjsWeb',
  'WebService',
  'LambdaFunction',
  'RelationalDatabase',
  'RedisCluster',
  'WebAppFirewall'
]);

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const span = (cls: string, text: string) => `<span class="rm-ed-${cls}">${escapeHtml(text)}</span>`;

const highlightTsLine = (line: string): string => {
  const token = /('[^']*')|(\d+(?:\.\d+)?)|([A-Za-z_$][\w$]*)|(\s+)|(.)/g;
  let html = '';
  for (let match = token.exec(line); match; match = token.exec(line)) {
    const [text, str, num, ident, space] = match;
    if (str) html += span('str', text);
    else if (num) html += span('num', text);
    else if (ident) {
      const rest = line.slice(token.lastIndex);
      if (TS_KEYWORDS.has(text)) html += span('kw', text);
      else if (TS_CLASSES.has(text)) html += span('cls', text);
      else if (/^\s*\??:/.test(rest)) html += span('prop', text);
      else if (rest.startsWith('(')) html += span('fn', text);
      else html += span('id', text);
    } else if (space) html += text;
    else html += span('punc', text);
  }
  return html;
};

const TS: Language = {
  line: highlightTsLine,
  tail: highlightTsLine,
  resourceOf: (line) => line.match(/^\s*const (\w+) =/)?.[1]
};

/** A YAML value: a quoted string, a number, a flow list of references, a flow map, a type, or a plain string. */
const highlightYamlValue = (raw: string, key?: string): string => {
  const value = raw.trim();
  if (!value) return '';
  if (/^(['"]).*\1$/.test(value)) return span('str', value);
  if (/^-?\d+(\.\d+)?$/.test(value)) return span('num', value);
  if (value.startsWith('[') && value.endsWith(']')) {
    const items = value
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const inner = items.map((item) => span(RESOURCE_NAMES.has(item) ? 'id' : 'str', item)).join(span('punc', ', '));
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
        return span('prop', pairKey) + span('punc', ':') + ' ' + highlightYamlValue(pair.slice(at + 1), pairKey);
      })
      .join(span('punc', ', '));
    return span('punc', '{') + ' ' + inner + ' ' + span('punc', '}');
  }
  if (key === 'type') return span('cls', value);
  return span('str', value);
};

const highlightYamlLine = (line: string): string => {
  const parts = line.match(/^(\s*)(- )?(.*)$/);
  const indent = parts?.[1] ?? '';
  const dash = parts?.[2] ?? '';
  const rest = parts?.[3] ?? '';
  let html = indent + (dash ? span('punc', dash) : '');
  const pair = rest.match(/^([\w.-]+):(\s*)(.*)$/);
  if (pair) {
    const [, key, gap, value] = pair;
    const cls = indent.length === 2 && RESOURCE_NAMES.has(key!) ? 'res' : 'prop';
    html += span(cls, key!) + span('punc', ':') + gap + highlightYamlValue(value!, key);
  } else {
    html += highlightYamlValue(rest);
  }
  return html;
};

const YAML: Language = {
  line: highlightYamlLine,
  tail: (text) => {
    const pair = text.match(/^:(\s*)(.*)$/);
    return pair ? span('punc', ':') + pair[1] + highlightYamlValue(pair[2]!) : highlightYamlValue(text);
  },
  resourceOf: (line) => {
    const name = line.match(/^ {2}(\w+):\s*$/)?.[1];
    return name && RESOURCE_NAMES.has(name) ? name : undefined;
  }
};

/**
 * The editor's rows: every source line numbered and highlighted, the resource a line declares
 * noted on it, a lens row above it when one exists, and the hovered property split out so the
 * screen can hang the IntelliSense card on it.
 */
const buildRows = (
  source: string,
  language: Language,
  hoverWord: string,
  lenses: Record<string, string>
): EditorRow[] => {
  const rows: EditorRow[] = [];
  const hoverPattern = new RegExp(`^(\\s*)(${hoverWord})(\\??:.*)$`);
  source.split('\n').forEach((line, index) => {
    const number = index + 1;
    const resource = language.resourceOf(line);
    const lens = resource ? lenses[resource] : undefined;
    if (lens) rows.push({ kind: 'lens', indent: line.length - line.trimStart().length, text: lens });
    const hover = line.match(hoverPattern);
    if (hover) {
      rows.push({ kind: 'hover', number, before: hover[1]!, word: hover[2]!, after: language.tail(hover[3]!) });
    } else {
      rows.push({ kind: 'code', number, html: language.line(line), resource });
    }
  });
  return rows;
};

export const highlightTs = (source: string, hoverWord: string, lenses: Record<string, string>): EditorRow[] =>
  buildRows(source, TS, hoverWord, lenses);

export const highlightYaml = (source: string, hoverWord: string, lenses: Record<string, string>): EditorRow[] =>
  buildRows(source, YAML, hoverWord, lenses);

/* ── The README's own furniture ────────────────────────────────────────────────────────────── */

export const REPO = { owner: 'stacktape', name: 'stacktape', visibility: 'Public', site: 'stacktape.com' } as const;

export const RELEASE = {
  tag: 'v4.0.0',
  label: 'Latest',
  href: 'https://github.com/stacktape/stacktape/releases'
} as const;

/** The three flat two-part badges after the h1, as a README shows them. */
export const BADGES = [
  { label: 'npm', value: RELEASE.tag, tone: 'brand', href: 'https://www.npmjs.com/package/stacktape' },
  { label: 'license', value: 'MIT', tone: 'neutral', href: 'https://github.com/stacktape/stacktape/blob/main/LICENSE' },
  { label: 'checks', value: 'passing', tone: 'ok', href: 'https://github.com/stacktape/stacktape/actions' }
] as const;

/** What the repository is about after v4: the config is TypeScript, deploys are GitOps, the rest is what the Console does. */
export const TOPICS = [
  'aws',
  'infrastructure-as-code',
  'typescript',
  'gitops',
  'observability',
  'guardrails',
  'coding-agents'
] as const;

export const TRUST_CHIPS = TRUST_LINE.split(' · ');

/** The three plans in one line each, then who bills you. */
export const PRICING = {
  plans: [
    { plan: 'Free', detail: '$0 · up to $100/mo of managed AWS spend' },
    { plan: 'Flexible', detail: 'a % of managed AWS spend' },
    { plan: 'Enterprise', detail: 'SSO · SOC 2 · 24×7 support' }
  ],
  more: 'See pricing'
} as const;

/** Every way to reach the team, in the sidebar. No community links. */
export const CONTACT = [
  { label: 'Book a demo', href: LINKS.demo },
  { label: 'info@stacktape.com', href: 'mailto:info@stacktape.com' },
  { label: 'GitHub', href: LINKS.github },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/stacktape' },
  { label: 'X', href: 'https://x.com/stacktape' }
] as const;

export const SIGN_IN = { before: 'Already using Stacktape?', link: 'Open the Console', href: LINKS.console } as const;

/** Two things carry the name: the CLI, which is open source, and the Console, which is hosted. */
export const LICENSE = {
  cli: { label: 'CLI', value: 'Open source · MIT', href: 'https://github.com/stacktape/stacktape/blob/main/LICENSE' },
  console: { label: 'Console', value: 'Hosted service · free plan', href: LINKS.pricing }
} as const;

/** What each screenshot shows, in plain words: the README's image caption. Section 01 has two. */
export const CAPTIONS = {
  editor: 'The config the wizard wrote, and what each resource came from',
  diagram: 'The same stack as a diagram',
  build: 'A build in the Console: parallel lanes, cached work reused',
  deployments: 'Deployments in the Console',
  monitoring: 'Monitoring in the Console',
  security: 'Security in the Console: what is scanned, what needs a fix, what a guardrail stopped',
  incident: 'An incident, from the first failed check to the fix',
  costs: "This month's costs, per resource"
} as const;

export const COVER_CAPTION = 'The Console and the CLI during a production deploy.';
