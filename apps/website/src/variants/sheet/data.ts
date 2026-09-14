/*
 * Everything the "sheet" variant says and shows.
 *
 * Page copy, the seven line items, the example project, the screens, the testimonials and the
 * footer all live here so the Astro components and the islands read one source. Nothing runs at
 * import time; the two helpers at the bottom are pure functions the screens call from frontmatter.
 */

/* ── Page copy ─────────────────────────────────────────────────────────────────────────────── */

export const ANNOUNCEMENT = {
  lead: 'Stacktape',
  version: 'v4',
  tail: 'is out',
  cta: 'Read what changed',
  href: '/blog/stacktape-v4'
} as const;

export const HEADLINE_LINES = ['AWS DevOps,', 'fully automated.'] as const;
export const HEADLINE = HEADLINE_LINES.join(' ');
export const SUBHEADLINE =
  'Stacktape reads your repository, designs the infrastructure like a senior DevOps team would, deploys it to your own AWS account and makes sure your app runs flawlessly forever after. It keeps you in the loop for any decision that requires human attention.';
export const TRUST_LINE = ['Open-source CLI (MIT)', 'Extend or override anything', 'Eject anytime'] as const;
export const CLOSING_LINE = 'That is the whole DevOps job. Start with one command.';
export const SIGN_IN = {
  lead: 'Already set up?',
  label: 'Sign in to the Console',
  href: 'https://console.stacktape.com'
} as const;
export const TESTIMONIALS_TITLE = 'Teams running on Stacktape';
export const COMMAND_HINT = 'opens the wizard in your browser';

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
  status: 'https://status.stacktape.com',
  pricing: '/pricing',
  blog: '/blog'
} as const;

export const NAV_LINKS = [
  { label: 'How it works', href: '#designs' },
  { label: 'Docs', href: LINKS.docs },
  { label: 'Pricing', href: LINKS.pricing },
  { label: 'Blog', href: LINKS.blog },
  { label: 'GitHub', href: LINKS.github }
] as const;

/* ── The seven line items ──────────────────────────────────────────────────────────────────── */

export type Section = {
  number: string;
  id: string;
  name: string;
  text: string;
  gets: readonly [string, string, string];
};

export const SECTIONS: readonly Section[] = [
  {
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

/* ── The example project ───────────────────────────────────────────────────────────────────── */

export const PROJECT = {
  name: 'acme-project',
  stage: 'production',
  region: 'eu-west-1',
  urls: { web: 'https://acme.com', api: 'https://api.acme.com', preview: 'https://pr-128.preview.acme.com' }
} as const;

export const CONSOLE_HOST = 'console.stacktape.com';
export const CONSOLE_PATH = `${CONSOLE_HOST}/projects/${PROJECT.name}/${PROJECT.stage}`;

export type ResourceKind = 'compute' | 'database' | 'security' | 'network';

export const RESOURCES = [
  { name: 'web', type: 'Next.js', kind: 'compute' },
  { name: 'apiService', type: 'Web service (Fargate)', kind: 'compute' },
  { name: 'worker', type: 'Lambda function', kind: 'compute' },
  { name: 'mainDatabase', type: 'Aurora PostgreSQL 16', kind: 'database' },
  { name: 'cache', type: 'Redis (ElastiCache)', kind: 'database' },
  { name: 'firewall', type: 'Web application firewall', kind: 'security' }
] as const satisfies readonly { name: string; type: string; kind: ResourceKind }[];

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

export const DIAGRAM_LABEL =
  'Architecture diagram of acme-project: web and apiService are public behind the firewall; worker, cache and mainDatabase sit inside the private network';

/* ── The cover composite ───────────────────────────────────────────────────────────────────── */

export const COVER = {
  url: CONSOLE_PATH,
  crumb: `${PROJECT.name} / ${PROJECT.stage}`,
  nav: ['Overview', 'Deployments', 'Monitoring', 'Guardrails', 'Costs'] as const,
  status: { live: 'Live', version: 'v42', region: PROJECT.region, deployed: 'deployed 12 min ago' },
  tileState: 'healthy',
  kpis: [
    { label: 'Deployments 30d', value: '48' },
    { label: 'Error rate', value: '0.02 %' },
    { label: 'AWS cost MTD', value: '$112.90' }
  ],
  terminal: {
    title: 'stacktape — deploy · zsh',
    command: 'stacktape deploy --stage production',
    phases: [
      { name: 'Initialize', state: 'done' },
      { name: 'Package', state: 'done' },
      { name: 'Deploy', state: 'active', detail: '91 %' },
      { name: 'Outputs', state: 'pending' }
    ],
    progress: 91,
    rows: [
      { name: 'web', type: 'Next.js', state: 'created' },
      { name: 'apiService', type: 'Web service · Fargate', state: 'created' },
      { name: 'worker', type: 'Lambda function', state: 'created' },
      { name: 'cache', type: 'Redis · ElastiCache', state: 'created' },
      { name: 'mainDatabase', type: 'Aurora · PostgreSQL 16', state: 'creating…' },
      { name: 'firewall', type: 'Web application firewall', state: 'creating…' }
    ]
  }
} as const;

/* ── 01 · the wizard's review ──────────────────────────────────────────────────────────────── */

export const REVIEW = {
  url: '127.0.0.1:4242/review',
  heading: "Here's your app on AWS",
  line: 'Read 41 files on this machine · nothing created on AWS yet',
  rows: [
    { name: 'web', type: 'Next.js', because: 'next.config.js in ./web', price: '$3.80', kind: 'compute' },
    {
      name: 'apiService',
      type: 'Web service (Fargate)',
      because: 'Dockerfile in ./api',
      price: '$34.20',
      kind: 'compute'
    },
    {
      name: 'worker',
      type: 'Lambda function',
      because: 'worker.ts subscribes to the queue',
      price: '$0.70',
      kind: 'compute'
    },
    {
      name: 'mainDatabase',
      type: 'Aurora PostgreSQL 16',
      because: 'Prisma schema targets PostgreSQL',
      price: '$61.40',
      kind: 'database'
    },
    {
      name: 'cache',
      type: 'Redis (ElastiCache)',
      because: 'ioredis in package.json',
      price: '$11.90',
      kind: 'database'
    },
    { name: 'firewall', type: 'Web application firewall', because: 'public web app', price: '$0.90', kind: 'security' }
  ],
  footer: { resources: '14 AWS resources', monthly: '~$112 / month' },
  deploy: 'Deploy'
} as const;

/* ── 02 · the package phase ────────────────────────────────────────────────────────────────── */

export const PACKAGE = {
  title: 'stacktape — deploy · zsh',
  command: 'stacktape deploy --stage production',
  rows: [
    { name: 'web', type: 'Next.js', result: 'bundled', time: '41 s' },
    { name: 'apiService', type: 'container image', result: 'built', time: '58 s' },
    { name: 'worker', type: 'Lambda', result: 'skipped · unchanged', time: '' }
  ],
  summary: '3 workloads packaged in parallel · 58 s',
  next: 'Deploy'
} as const;

/* ── 03 · deployments ──────────────────────────────────────────────────────────────────────── */

export const DEPLOYMENTS = {
  url: `${CONSOLE_PATH}/deployments`,
  heading: 'Deployments',
  line: 'push to main → production · pull request → preview',
  rollout: {
    version: 'v42',
    ref: 'main a1b2c3d',
    message: '"orders: fulfillment status"',
    badge: 'Rolling out',
    from: '10 %',
    to: '100 %',
    percent: 10,
    label: 'canary · 4 min left',
    rollback: 'Roll back to v41'
  },
  live: { version: 'v41', ref: 'main 9f8e7d6', badge: 'Live' },
  preview: { version: 'pr-128', message: '"checkout: apple pay"', badge: 'Preview', url: PROJECT.urls.preview }
} as const;

/* ── 04 · monitoring ───────────────────────────────────────────────────────────────────────── */

export const MONITORING = {
  url: `${CONSOLE_PATH}/monitoring`,
  metrics: [
    {
      label: 'Requests',
      value: '184',
      unit: 'req/s',
      points: [52, 48, 55, 61, 58, 66, 63, 70, 74, 68, 72, 78, 75, 80]
    },
    {
      label: 'p95 latency',
      value: '212',
      unit: 'ms',
      points: [40, 44, 38, 46, 42, 48, 45, 41, 47, 44, 50, 46, 43, 45]
    },
    { label: '5xx', value: '0.02', unit: '%', points: [6, 5, 7, 6, 4, 6, 5, 8, 6, 5, 6, 4, 6, 5] }
  ],
  trace: {
    name: 'GET /orders',
    total: 212,
    spans: [
      { name: 'GET /orders', start: 0, end: 212, kind: 'http' },
      { name: 'handler', start: 6, end: 204, kind: 'app' },
      { name: 'SELECT … FROM orders', start: 14, end: 62, kind: 'db' },
      { name: 'redis GET', start: 66, end: 68, kind: 'cache' },
      { name: 'POST /events', start: 168, end: 199, kind: 'http' }
    ]
  },
  uptime: {
    url: 'api.acme.com/health',
    availability: '99.98 %',
    regions: [
      { region: 'Ireland', latency: '212 ms' },
      { region: 'Virginia', latency: '318 ms' },
      { region: 'Singapore', latency: '402 ms' }
    ]
  }
} as const;

/* ── 05 · guardrails ───────────────────────────────────────────────────────────────────────── */

export const GUARDRAILS = {
  url: `${CONSOLE_HOST}/organizations/acme/guardrails`,
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

/* ── 06 · the incident ─────────────────────────────────────────────────────────────────────── */

export const INCIDENT = {
  id: 'inc_8f2k',
  url: `${CONSOLE_PATH}/incidents/inc_8f2k`,
  title: 'Uptime check failed · api.acme.com/health',
  badge: 'Resolved',
  duration: '11 min',
  timeline: [
    { time: '13:58', text: 'v41 deployed', tone: 'plain' },
    { time: '14:02', text: 'incident opened · 3 of 3 regions failing', tone: 'error' },
    {
      time: '14:03',
      text: 'error grouped',
      code: 'PrismaClientKnownRequestError: column "fulfillment_status" does not exist',
      meta: '214 occurrences',
      tone: 'plain'
    },
    { time: '14:08', text: 'fix PR #131 opened by your agent, reviewed and merged', tone: 'plain' },
    { time: '14:13', text: 'resolved · checks passing', tone: 'ok' }
  ],
  alerted: 'Alerted #alerts on Slack · 14:02'
} as const;

/* ── 07 · costs ────────────────────────────────────────────────────────────────────────────── */

export const COSTS = {
  url: `${CONSOLE_PATH}/costs`,
  heading: 'Costs · September',
  total: 112.9,
  source: 'from your AWS bill · no markup',
  items: [
    { name: 'mainDatabase', amount: 61.4 },
    { name: 'apiService', amount: 34.2 },
    { name: 'cache', amount: 11.9 },
    { name: 'web', amount: 3.8 },
    { name: 'worker', amount: 0.7 },
    { name: 'other', amount: 0.9 }
  ],
  budget: { limit: 150, alertAt: 80 }
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

/* ── Footer ────────────────────────────────────────────────────────────────────────────────── */

export const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '#designs' },
      { label: 'Pricing', href: LINKS.pricing },
      { label: 'Starter projects', href: 'https://docs.stacktape.com/getting-started/starter-projects' },
      { label: 'Changelog', href: 'https://github.com/stacktape/stacktape/releases' },
      { label: 'Console', href: LINKS.console },
      { label: 'Status', href: LINKS.status }
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

export const FOOTER_META = {
  copyright: '© 2026 Stacktape',
  license: 'Open-source CLI (MIT)',
  made: 'Made in the EU',
  status: 'System status'
} as const;

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
