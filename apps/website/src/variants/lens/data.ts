/*
 * Everything the "lens" homepage says and shows.
 *
 * The page copy, the seven chapters, the example project, the screens, the cover composite and the
 * testimonials live here so the Astro components and the islands read one source. Nothing runs at
 * import time; the two helpers at the bottom are pure functions the screens call from frontmatter.
 */

/* ── Page copy ─────────────────────────────────────────────────────────────────────────────── */

export const PILL = {
  lead: 'Stacktape',
  version: 'v4',
  rest: 'is out',
  link: 'Read what changed',
  href: '/blog/stacktape-v4'
} as const;
export const HEADLINE_LINES = ['AWS DevOps,', 'fully automated.'] as const;
export const HEADLINE = HEADLINE_LINES.join(' ');
export const SUBHEADLINE =
  'Stacktape reads your repository, designs the infrastructure like a senior DevOps team would, deploys it to your own AWS account and makes sure your app runs flawlessly forever after. It keeps you in the loop for any decision that requires human attention.';
export const TRUST_LINE = 'Open-source CLI (MIT) · Extend or override anything · Eject anytime';
export const CLOSING_LINE = 'That is the whole DevOps job. Start with one command.';
export const SIGN_IN = { lead: 'Already set up?', link: 'Sign in to the Console' } as const;
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
  pricing: '/pricing',
  blog: '/blog',
  howItWorks: '#designs',
  getStarted: '#get-started'
} as const;

export const NAV_LINKS = [
  { label: 'How it works', href: LINKS.howItWorks },
  { label: 'Docs', href: LINKS.docs },
  { label: 'Pricing', href: LINKS.pricing },
  { label: 'Blog', href: LINKS.blog },
  { label: 'GitHub', href: LINKS.github }
] as const;

export const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: LINKS.howItWorks },
      { label: 'Pricing', href: LINKS.pricing },
      { label: 'Starter projects', href: 'https://docs.stacktape.com/getting-started/starter-projects' },
      { label: 'Changelog', href: 'https://github.com/stacktape/stacktape/releases' },
      { label: 'Console', href: LINKS.console },
      { label: 'Status', href: 'https://status.stacktape.com' }
    ]
  },
  {
    title: 'Docs',
    links: [
      { label: 'Getting started', href: 'https://docs.stacktape.com/getting-started/configure-your-stack' },
      { label: 'Resources', href: 'https://docs.stacktape.com/resources' },
      { label: 'Packaging', href: 'https://docs.stacktape.com/packaging/overview' },
      { label: 'CI/CD & GitOps', href: 'https://docs.stacktape.com/ci-cd-and-gitops/overview' },
      { label: 'Observability', href: 'https://docs.stacktape.com/observability/overview' },
      { label: 'Guardrails', href: 'https://docs.stacktape.com/guardrails/overview' },
      { label: 'Costs', href: 'https://docs.stacktape.com/managing-costs/overview' },
      { label: 'Using with AI', href: 'https://docs.stacktape.com/using-with-ai/overview' }
    ]
  },
  {
    title: 'Company',
    links: [
      { label: 'Blog', href: LINKS.blog },
      { label: 'Contact', href: 'mailto:info@stacktape.com' },
      { label: 'GitHub', href: LINKS.github },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/company/stacktape' },
      { label: 'X', href: 'https://x.com/stacktape' }
    ]
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy policy', href: '/privacy-policy' },
      { label: 'Terms of use', href: '/terms-of-use' }
    ]
  }
] as const;

export const FOOTER_BOTTOM = {
  copyright: '© 2026 Stacktape',
  license: 'Open-source CLI (MIT)',
  origin: 'Made in the EU',
  status: { label: 'System status', href: 'https://status.stacktape.com' }
} as const;

/* ── The example app ───────────────────────────────────────────────────────────────────────── */

export const PROJECT = {
  name: 'acme-project',
  stage: 'production',
  region: 'eu-west-1',
  urls: { web: 'https://acme.com', api: 'https://api.acme.com', preview: 'https://pr-128.preview.acme.com' },
  releases: { previous: 'v41', current: 'v42' }
} as const;

const CONSOLE = `console.stacktape.com/projects/${PROJECT.name}/${PROJECT.stage}`;

export const URLS = {
  wizard: '127.0.0.1:4242/review',
  overview: CONSOLE,
  deployments: `${CONSOLE}/deployments`,
  monitoring: `${CONSOLE}/monitoring`,
  guardrails: 'console.stacktape.com/organizations/acme/guardrails',
  incident: `${CONSOLE}/incidents/inc_8f2k`,
  costs: `${CONSOLE}/costs`
} as const;

export const TERMINAL_TITLE = 'stacktape — deploy · zsh';

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

/** AWS category colours, one per resource, for the small accents inside the screens. */
export type Category = 'compute' | 'database' | 'security' | 'network';

export const RESOURCES = [
  { name: 'web', type: 'Next.js', category: 'network', because: 'next.config.js in ./web', price: 3.8 },
  {
    name: 'apiService',
    type: 'Web service (Fargate)',
    category: 'compute',
    because: 'Dockerfile in ./api',
    price: 34.2
  },
  {
    name: 'worker',
    type: 'Lambda function',
    category: 'compute',
    because: 'worker.ts subscribes to the queue',
    price: 0.7
  },
  {
    name: 'mainDatabase',
    type: 'Aurora PostgreSQL 16',
    category: 'database',
    because: 'Prisma schema targets PostgreSQL',
    price: 61.4
  },
  { name: 'cache', type: 'Redis (ElastiCache)', category: 'database', because: 'ioredis in package.json', price: 11.9 },
  { name: 'firewall', type: 'Web application firewall', category: 'security', because: 'public web app', price: 0.9 }
] as const satisfies ReadonlyArray<{ name: string; type: string; category: Category; because: string; price: number }>;

/* ── The seven chapters ────────────────────────────────────────────────────────────────────── */

export type Chapter = {
  index: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  number: string;
  id: string;
  name: string;
  text: string;
  gets: readonly [string, string, string];
};

export const CHAPTERS: readonly Chapter[] = [
  {
    index: 1,
    number: '01',
    id: 'designs',
    name: 'Designs your infrastructure',
    text: 'Run one command and Stacktape reads your project on your machine, with the coding agent you already use. It writes the whole AWS setup into one typed file, with production defaults already applied, and shows you every resource, the line of code behind it and what it will cost per month, before anything exists.',
    gets: [
      'One file for the whole stack: app, API, workers, database, cache, firewall, with autocompletion in your editor.',
      'Every decision explained and changeable with one click. The price updates with it.',
      'Your code never leaves your machine. Nothing is sent to Stacktape.'
    ]
  },
  {
    index: 2,
    number: '02',
    id: 'packages',
    name: 'Packages it',
    text: 'Stacktape builds your code into Lambda packages and container images itself. Point it at an entry file and it bundles TypeScript, Python, Java, Go, Ruby, PHP or .NET with zero configuration, or bring your own Dockerfile. Builds run in parallel and are cached by content, so unchanged code is never built twice.',
    gets: [
      'Zero-config builds for eight languages, or your own Dockerfile, Nixpacks or any prebuilt image.',
      'Parallel, content-cached builds: a change to one service rebuilds one service.',
      'Images land in a managed registry in your account. No build scripts to maintain.'
    ]
  },
  {
    index: 3,
    number: '03',
    id: 'deploys',
    name: 'Deploys it',
    text: "A push to main deploys. Stacktape's build runner is a dedicated EC2 machine in your AWS account that keeps its caches warm between runs and resumes in about fifteen seconds, so a build starts working immediately instead of waiting on a cold CodeBuild container. Every pull request gets its own environment, every release can be rolled out gradually and any release can be rolled back with one command.",
    gets: [
      'Push to deploy, with a preview environment per pull request that deletes itself when the PR closes.',
      'Gradual rollouts: canary or linear traffic shifting with automatic rollback if errors rise.',
      'Zero-downtime deploys, hot-swap in seconds for dev stages, one-command rollback to any version.'
    ]
  },
  {
    index: 4,
    number: '04',
    id: 'monitors',
    name: 'Monitors it',
    text: 'Logs, metrics, traces, uptime checks and an error inbox are set up by the deploy itself, with nothing to install and no monitoring vendor. Errors from every service are grouped and counted, one request can be followed across your services, and your public URLs are checked from several AWS regions.',
    gets: [
      'An error inbox: exceptions grouped, counted and kept with their stack trace.',
      'Traces with one switch: OpenTelemetry auto-instrumentation, stored in your own account.',
      'Uptime checks from multiple AWS regions, run inside your account, with no per-check fee.'
    ]
  },
  {
    index: 5,
    number: '05',
    id: 'secures',
    name: 'Secures it',
    text: 'The setup is safe by default: databases in a private network with no public address, each service allowed to reach only the resources it is connected to, secrets kept in AWS Secrets Manager and never in your config. Guardrails your team sets once, such as keeping SQL private or requiring backups, block a deploy that would break them before anything changes.',
    gets: [
      'Private networking and scoped permissions wired automatically from one line of config.',
      'Eighteen guardrail types, enforced before a deploy runs, across the whole organization.',
      "Everything runs in your AWS account. Stacktape's access is one role you can revoke any time."
    ]
  },
  {
    index: 6,
    number: '06',
    id: 'incidents',
    name: 'Handles incidents',
    text: "When an uptime check fails or errors spike, Stacktape opens an incident with the evidence in one place: what fired, the grouped error with its stack trace and the release the trouble started after. Your coding agent can read the same logs and issues through Stacktape's MCP server and propose the fix; you review the pull request and merge.",
    gets: [
      'One incident, all the evidence: alarms, uptime results, grouped errors and the release timeline.',
      'Alerts where your team already is: Slack, Microsoft Teams, email or a webhook.',
      'An MCP server for your coding agent: logs, issues and status, with destructive actions always confirmed by you.'
    ]
  },
  {
    index: 7,
    number: '07',
    id: 'costs',
    name: 'Tracks costs',
    text: "See what each environment and each resource costs this month, straight from your AWS bill, with no markup. Set a budget once and get an alert before you reach it, or as soon as the forecast says you will. AWS bills you directly; Stacktape's own fee is a separate line and starts at zero.",
    gets: [
      'Costs per project, stage and resource, from AWS Cost and Usage Reports.',
      'Budgets with threshold and forecast alerts, for the organization or for one stack.',
      'Free up to $100 of managed AWS spend a month, then a percentage of what you run. Never per seat.'
    ]
  }
];

/* ── 01 Review ─────────────────────────────────────────────────────────────────────────────── */

export const REVIEW = {
  heading: "Here's your app on AWS",
  line: 'Read 41 files on this machine · nothing created on AWS yet',
  estimate: { resources: '14 AWS resources', monthly: '~$112 / month' },
  action: 'Deploy'
} as const;

/* ── 02 Package ────────────────────────────────────────────────────────────────────────────── */

export const PACKAGE = {
  command: 'stacktape deploy --stage production',
  rows: [
    { name: 'web', kind: 'Next.js', result: 'bundled', time: '41 s', skipped: false },
    { name: 'apiService', kind: 'container image', result: 'built', time: '58 s', skipped: false },
    { name: 'worker', kind: 'Lambda', result: 'skipped · unchanged', time: '', skipped: true }
  ],
  summary: '3 workloads packaged in parallel · 58 s',
  next: 'Deploy',
  nextNote: 'starting…'
} as const;

/* ── 03 Deployments ────────────────────────────────────────────────────────────────────────── */

export const DEPLOYMENTS = {
  heading: 'Deployments',
  line: 'push to main → production · pull request → preview',
  rows: [
    {
      id: 'v42',
      ref: 'main a1b2c3d',
      message: 'orders: fulfillment status',
      badge: 'Rolling out',
      tone: 'brand',
      traffic: { from: '10 %', to: '100 %', percent: 10, note: 'canary · 4 min left' },
      action: 'Roll back to v41'
    },
    { id: 'v41', ref: 'main 9f8e7d6', badge: 'Live', tone: 'success' },
    { id: 'pr-128', message: 'checkout: apple pay', badge: 'Preview', tone: 'info', url: PROJECT.urls.preview }
  ]
} as const;

/* ── 04 Monitoring ─────────────────────────────────────────────────────────────────────────── */

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

/* ── 05 Guardrails ─────────────────────────────────────────────────────────────────────────── */

export const GUARDRAILS = {
  heading: 'Guardrails',
  line: '18 rule types · applied to every deploy in the organization',
  rules: [
    'Keep SQL databases private',
    'Require recoverable data stores',
    'Require WAF on load balancers',
    'Allowed regions: eu-west-1, us-east-1'
  ],
  blocked: {
    title: 'Deploy to staging blocked',
    detail: 'mainDatabase would get a public address',
    action: 'Fix in config'
  }
} as const;

/* ── 06 Incident ───────────────────────────────────────────────────────────────────────────── */

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

/* ── 07 Costs ──────────────────────────────────────────────────────────────────────────────── */

export const COSTS = {
  heading: 'Costs · September',
  total: 112.9,
  source: 'from your AWS bill · no markup',
  rows: [
    { name: 'mainDatabase', amount: 61.4 },
    { name: 'apiService', amount: 34.2 },
    { name: 'cache', amount: 11.9 },
    { name: 'web', amount: 3.8 },
    { name: 'other', amount: 0.9 },
    { name: 'worker', amount: 0.7 }
  ],
  budget: { limit: 150, alertAt: 80, used: 75 }
} as const;

/* ── The cover composite ───────────────────────────────────────────────────────────────────── */

export const COVER = {
  nav: ['Overview', 'Deployments', 'Monitoring', 'Guardrails', 'Costs'],
  current: 'Overview',
  status: { badge: 'Live', release: PROJECT.releases.current, region: PROJECT.region, deployed: 'deployed 12 min ago' },
  tileState: 'healthy',
  kpis: [
    { label: 'Deployments 30d', value: '48' },
    { label: 'Error rate', value: '0.02 %' },
    { label: 'AWS cost MTD', value: '$112.90' }
  ],
  terminal: {
    command: 'stacktape deploy --stage production',
    phases: [
      { name: 'Initialize', state: 'done' },
      { name: 'Package', state: 'done' },
      { name: 'Deploy', state: 'active', note: '91 %' },
      { name: 'Outputs', state: 'pending' }
    ],
    progress: 91,
    rows: [
      { name: 'web', type: 'Next.js web', state: 'created' },
      { name: 'apiService', type: 'Web service · Fargate', state: 'created' },
      { name: 'worker', type: 'Lambda function', state: 'created' },
      { name: 'cache', type: 'Redis · ElastiCache', state: 'created' },
      { name: 'mainDatabase', type: 'Aurora PostgreSQL 16', state: 'creating…' },
      { name: 'firewall', type: 'Web application firewall', state: 'creating…' }
    ]
  }
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
