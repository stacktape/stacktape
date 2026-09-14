/*
 * Everything the "hire" page says and shows.
 *
 * The page is a job posting for the Senior DevOps Engineer that Stacktape fills. The posting's own
 * fields (title, metadata, section names), the shared page copy, the seven responsibilities, the
 * example project and the screens live here so the Astro components and the islands read one
 * source. Nothing runs at import time; the two helpers at the bottom are pure functions.
 */

/* ── The posting ───────────────────────────────────────────────────────────────────────────── */

export const ROLE = { before: 'Senior', em: 'DevOps', after: 'Engineer' } as const;

export const POSTING = {
  filled: 'Position filled',
  postedBy: 'Posted by Stacktape',
  meta: [
    { label: 'Location', value: 'Your AWS account, any region' },
    { label: 'Type', value: 'Full-time, from day one' },
    { label: 'Salary', value: '$174,000 / year', accent: 'or $0' },
    { label: 'Reports to', value: 'You. It keeps you in the loop.' }
  ],
  coverCaption: 'The candidate at work: the Console and the CLI during a production deploy.',
  about: 'About the role',
  apply: 'How to apply',
  responsibilities: 'Responsibilities',
  responsibilitiesIntro: 'Everything below is done on day one.',
  handled: 'Handled by Stacktape',
  requirementsMet: 'Requirements met',
  notRequired: 'Not required',
  notRequiredItems: ['Terraform, CDK or CloudFormation fluency', 'On-call rotation', 'A second DevOps hire'],
  references: 'References',
  closingLabel: 'Ready to fill the position?'
} as const;

/* ── Page copy ─────────────────────────────────────────────────────────────────────────────── */

export const ANNOUNCEMENT = {
  text: 'Stacktape v4 is out',
  cta: 'Read what changed',
  href: '/blog/stacktape-v4'
} as const;

export const HEADLINE_LINES = ['AWS DevOps,', 'fully automated.'] as const;
export const HEADLINE = HEADLINE_LINES.join(' ');
export const SUBHEADLINE =
  'Stacktape reads your repository, designs the infrastructure like a senior DevOps team would, deploys it to your own AWS account and makes sure your app runs flawlessly forever after. It keeps you in the loop for any decision that requires human attention.';
export const TRUST_LINE = ['Open-source CLI (MIT)', 'Extend or override anything', 'Eject anytime'] as const;
export const CLOSING_LINE = 'That is the whole DevOps job. Start with one command.';
export const COMMAND_HINT = 'opens the wizard in your browser';

export const COMMANDS = [
  { id: 'npx', label: 'npx', command: 'npx stacktape init' },
  { id: 'macos', label: 'macOS', command: 'curl -L https://installs.stacktape.com/macos.sh | sh' },
  { id: 'linux', label: 'Linux', command: 'curl -L https://installs.stacktape.com/linux.sh | sh' },
  { id: 'windows', label: 'Windows', command: 'iwr https://installs.stacktape.com/windows.ps1 -useb | iex' }
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

export const SIGN_IN = { lead: 'Already set up?', label: 'Sign in to the Console', href: LINKS.console } as const;

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

export const FOOTER_NOTES = ['© 2026 Stacktape', 'Open-source CLI (MIT)', 'Made in the EU'] as const;
export const FOOTER_STATUS = 'System status';

/* ── The example project ───────────────────────────────────────────────────────────────────── */

export const PROJECT = {
  name: 'acme-project',
  stage: 'production',
  region: 'eu-west-1',
  urls: { web: 'https://acme.com', api: 'https://api.acme.com', preview: 'https://pr-128.preview.acme.com' }
} as const;

export type Category = 'compute' | 'database' | 'security';

/** The six resources, in the order every screen lists them. */
export const RESOURCES = [
  { name: 'web', type: 'Next.js', category: 'compute', because: 'next.config.js in ./web', price: 3.8 },
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
] as const satisfies readonly { name: string; type: string; category: Category; because: string; price: number }[];

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

/* ── The seven responsibilities ────────────────────────────────────────────────────────────── */

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

/* ── The windows' addresses ────────────────────────────────────────────────────────────────── */

const CONSOLE_HOST = 'console.stacktape.com';
const STAGE_PATH = `/projects/${PROJECT.name}/${PROJECT.stage}`;

export const URLS = {
  wizard: { host: '127.0.0.1:4242', path: '/review' },
  deployments: { host: CONSOLE_HOST, path: `${STAGE_PATH}/deployments` },
  monitoring: { host: CONSOLE_HOST, path: `${STAGE_PATH}/monitoring` },
  guardrails: { host: CONSOLE_HOST, path: '/organizations/acme/guardrails' },
  incident: { host: CONSOLE_HOST, path: `${STAGE_PATH}/incidents/inc_8f2k` },
  costs: { host: CONSOLE_HOST, path: `${STAGE_PATH}/costs` }
} as const;

export const TERMINAL_TITLE = 'stacktape — deploy · zsh';
export const DEPLOY_COMMAND = 'stacktape deploy --stage production';

/* ── 01 · the wizard's review ──────────────────────────────────────────────────────────────── */

export const WIZARD = {
  heading: "Here's your app on AWS",
  line: 'Read 41 files on this machine · nothing created on AWS yet',
  footer: '14 AWS resources · ~$112 / month',
  button: 'Deploy'
} as const;

/* ── 02 · the package phase ────────────────────────────────────────────────────────────────── */

export const PACKAGE = {
  rows: [
    { name: 'web', kind: 'Next.js', result: 'bundled', time: '41 s', skipped: false },
    { name: 'apiService', kind: 'container image', result: 'built', time: '58 s', skipped: false },
    { name: 'worker', kind: 'Lambda', result: 'skipped · unchanged', time: '', skipped: true }
  ],
  summary: '3 workloads packaged in parallel · 58 s',
  next: 'Deploy'
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

/* ── 05 · guardrails ───────────────────────────────────────────────────────────────────────── */

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
    text: 'Deploy to staging blocked',
    resource: 'mainDatabase',
    detail: 'would get a public address',
    button: 'Fix in config'
  }
} as const;

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

/* ── References ────────────────────────────────────────────────────────────────────────────── */

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
