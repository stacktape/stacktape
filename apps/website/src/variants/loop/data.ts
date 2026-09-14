/**
 * Every fact, sentence and sample value the "loop" study shows, in one place.
 *
 * Product previews read from here so the same example application (acme-project) appears identically
 * in the hero cards, the seven window states and the chapter text.
 */

export const LINKS = {
  docs: 'https://docs.stacktape.com',
  github: 'https://github.com/stacktape/stacktape',
  signIn: 'https://console.stacktape.com',
  signUp: 'https://console.stacktape.com/sign-up',
  demo: 'https://cal.com/stacktape/30min',
  discord: 'https://discord.gg/stacktape',
  privacy: 'https://stacktape.com/privacy-policy'
};

export const INSTALL_COMMANDS = [
  { id: 'npx', label: 'npx', command: 'npx stacktape init' },
  { id: 'macos', label: 'macOS', command: 'curl -L https://installs.stacktape.com/macos.sh | sh' },
  { id: 'linux', label: 'Linux', command: 'curl -L https://installs.stacktape.com/linux.sh | sh' },
  { id: 'windows', label: 'Windows', command: 'iwr https://installs.stacktape.com/windows.ps1 -useb | iex' }
] as const;

export const HERO = {
  eyebrow: 'Infrastructure · deployment · operations, in your own AWS account',
  headline: ['AWS DevOps,', 'fully automated.'],
  subheadline:
    'One command reads your repository and writes the infrastructure configuration. Stacktape deploys it into your own AWS account, then runs it with you.'
};

/** The three hero cards, in loop order: designs it, ships it, keeps it running. */
export const HERO_CALLOUTS = [
  'reads your repo, decides the infrastructure',
  'deploys to your AWS account',
  'finds the release that broke it'
];

export const APP = {
  project: 'acme-project',
  repo: 'acme/acme-project',
  region: 'eu-west-1',
  summary: 'A Next.js app with a background worker, using a Postgres database and a Redis cache.',
  awsAccount: '4128…9903 (acme-dev)',
  deployer: 'matus',
  resourceCount: 14,
  monthly: '$112',
  urls: { web: 'https://acme.com', api: 'https://api.acme.com' }
};

export type ResourceRow = {
  name: string;
  type: string;
  label: string;
  detail: string;
  /** AWS category, used to pick the icon colour. */
  category: 'compute' | 'database' | 'security' | 'network' | 'storage' | 'integration';
};

export const RESOURCES: ResourceRow[] = [
  { name: 'web', type: 'nextjs-web', label: 'Next.js Web', detail: 'public · https://acme.com', category: 'compute' },
  {
    name: 'apiService',
    type: 'web-service',
    label: 'Web Service',
    detail: 'Fargate · public · https://api.acme.com · 2–6 instances',
    category: 'compute'
  },
  { name: 'worker', type: 'function', label: 'Function', detail: 'Lambda · api/src/worker.ts', category: 'compute' },
  {
    name: 'mainDatabase',
    type: 'relational-database',
    label: 'SQL database',
    detail: 'Aurora PostgreSQL 16 · private (accessibilityMode: vpc)',
    category: 'database'
  },
  {
    name: 'cache',
    type: 'redis-cluster',
    label: 'Redis Cluster',
    detail: 'ElastiCache · cache.t3.micro',
    category: 'database'
  },
  {
    name: 'firewall',
    type: 'web-app-firewall',
    label: 'Web App Firewall',
    detail: 'CloudFront scope',
    category: 'security'
  }
];

/** `statement` may carry markup (it is rendered with set:html) so a command can read as code; it is authored here only. */
export const DECIDED = [
  {
    statement: 'Keeping the database reachable only from your private network',
    detail: 'No public address. Adds one small keyless jump box so local tools and migrations can tunnel in.'
  },
  {
    statement: 'Running two copies of apiService',
    detail: 'One can fail without an interruption. Roughly doubles its cost.'
  },
  {
    statement: 'Keeping a week of database backups',
    detail: 'Accidental deletion is blocked either way.'
  },
  {
    statement: 'Running <code>prisma migrate deploy</code> after every deploy',
    detail: 'Found in package.json. Runs as a hook against the private database.'
  }
];

export const ANALYZE_FILES = [
  'package.json',
  'pnpm-workspace.yaml',
  'web/next.config.ts',
  'api/Dockerfile',
  'api/src/server.ts',
  'api/src/worker.ts',
  'api/prisma/schema.prisma',
  '.env.example',
  'docker-compose.yml'
];
export const ANALYZE_DONE = 'Opened 41 files in 38s, all on this machine.';

export const DEPLOY = {
  command: 'stacktape deploy --stage production --region eu-west-1',
  intro:
    'Deploying to AWS account 4128…9903 (acme-dev) as matus. 14 resources will be created. web and apiService get a public URL. Nothing else is reachable from the internet.',
  packaged: [
    { name: 'web', time: '41s' },
    { name: 'apiService', time: '58s' },
    { name: 'worker', time: '6s' }
  ],
  progress: { done: 30, total: 33 }
};

export const CICD = {
  push: { branch: 'main', deploy: '#42', stage: 'production', duration: '3m 08s', commit: 'c9e1f4a' },
  pr: {
    number: '#128',
    title: 'checkout: retry payment webhook',
    stage: 'pr-128',
    url: 'https://pr-128.acme-preview.com'
  },
  runner: 'Runner c7a.2xlarge · eu-west-1 · warm · caches kept · stops after 15 min idle'
};

export const METRICS = [
  { label: 'Requests', value: '184', unit: '/s' },
  { label: 'p95 latency', value: '212', unit: 'ms' },
  { label: '5xx', value: '0.02', unit: '%' }
];

/** Trace waterfall for GET /orders. Offsets and durations are ms within a 212 ms request. */
export const TRACE = [
  { name: 'GET /orders', kind: 'http', start: 0, dur: 212, depth: 0 },
  { name: 'apiService handler', kind: 'compute', start: 6, dur: 198, depth: 1 },
  { name: 'SELECT … FROM orders', kind: 'db', start: 14, dur: 48, depth: 2 },
  { name: 'redis GET orders:page:1', kind: 'cache', start: 66, dur: 2, depth: 2 },
  { name: 'POST /events', kind: 'http', start: 120, dur: 31, depth: 2 }
];

export const UPTIME = {
  regions: ['Ireland', 'Virginia', 'Singapore'],
  thirtyDay: '99.98%',
  target: 'https://api.acme.com/health'
};

export const INCIDENT = {
  id: 'inc_8f2k',
  severity: 'Error',
  stage: 'production',
  correlation: {
    opened: 'Opened 4m after the last deploy',
    release: 'v41',
    commit: 'a1b2c3d',
    message: 'orders: add fulfillment status column',
    previous: 'v40',
    config: 'config unchanged',
    changed: 'what changed (3 commits)'
  },
  signals: [
    { kind: 'Uptime check down', detail: 'https://api.acme.com/health · 3 of 3 regions' },
    {
      kind: 'Application error',
      detail: 'PrismaClientKnownRequestError: column "fulfillment_status" does not exist · apiService · 214 occurrences'
    }
  ],
  timeline: [
    { at: '09:41', text: 'Opened from 2 signals', tone: 'error' },
    { at: '09:43', text: 'Acknowledged · details copied for agent', tone: 'neutral' },
    { at: '09:46', text: 'PR #131 opened: run afterDeploy migration hook on production', tone: 'neutral' },
    { at: '09:50', text: 'v42 deployed through the pipeline', tone: 'neutral' },
    { at: '09:52', text: 'Resolved · recovered on its own signals · 11 min', tone: 'ok' }
  ],
  recovery: 'uptime 3/3 regions up · 0 new occurrences',
  remediation: 'Let an agent apply verified fixes and deploy them',
  remediationNote: 'Opt-in. Off by default.'
};

export const SECURITY = {
  posture: { passing: 27, total: 30 },
  findings: [
    { text: 'mainDatabase backups retained 1 day (staging)', rule: 'Require recoverable data stores', kind: 'posture' },
    { text: 'apiService image: 2 critical CVEs in openssl 3.0.13', rule: 'fix PR opened', kind: 'vuln' },
    { text: 'apiService: plaintext STRIPE_KEY in config', rule: 'convert to $Secret', kind: 'secret' }
  ],
  guardrails: ['Keep SQL private', 'Require WAF on load balancers', 'Require recoverable data stores']
};

export const COSTS = {
  rows: [
    { name: 'mainDatabase', amount: 61.4 },
    { name: 'apiService', amount: 34.2 },
    { name: 'cache', amount: 11.9 },
    { name: 'web', amount: 3.8 },
    { name: 'worker', amount: 0.7 },
    { name: 'other', amount: 0.9 }
  ],
  total: '$112.90',
  budget: 150,
  alertAt: 80
};

export type Chapter = {
  n: string;
  id: string;
  kicker: string;
  title: string;
  body: string[];
  facts: string[];
  /** Text shown in the window's title bar for this state. */
  url: string;
  frame: 'terminal' | 'browser';
};

export const CHAPTERS: Chapter[] = [
  {
    n: '01',
    id: 'init',
    kicker: 'Day 0 · the first ten minutes',
    title: 'Init. On your machine, nothing billed.',
    body: [
      'npx stacktape init opens a wizard at localhost. It reads the repository right there, using your own coding agent if one is installed and a built-in scanner otherwise. Nothing is sent to Stacktape.',
      'Nothing is created on AWS and nothing is billed until you press Deploy.'
    ],
    facts: [
      'Opened 41 files in 38s, all on this machine.',
      'Works with Claude Code or Codex when present.',
      'One document, four bands: Start, Analyze, Review, Deploy.'
    ],
    url: 'npx stacktape init',
    frame: 'terminal'
  },
  {
    n: '02',
    id: 'review',
    kicker: 'Day 0 · review',
    title: 'It designs the infrastructure and shows its work.',
    body: [
      'The wizard composes the configuration itself. A Next.js app with a worker, Postgres and Redis becomes 14 AWS resources inside a VPC with private subnets and least-privilege IAM, drawn before any of it exists.',
      'Every open question is answered with a recommendation and listed under "Decided for you". Each one is a single click to change.'
    ],
    facts: [
      '14 AWS resources, about $112 a month at standard size.',
      'Database private by default: accessibilityMode: vpc.',
      'The file it writes is plain stacktape.yml; TypeScript if you prefer.'
    ],
    url: 'localhost:5173/#review',
    frame: 'browser'
  },
  {
    n: '03',
    id: 'deploy',
    kicker: 'Day 0 · deploy',
    title: 'One press. Your account. A URL.',
    body: [
      'Deploy names the AWS account it targets before anything happens. Then Stacktape compiles the configuration to CloudFormation, builds the container and the function straight from source, and creates the stack in your account.',
      'What you get is plain CloudFormation you own. Extend it with any CDK construct, or eject at any time.'
    ],
    facts: [
      'Deploys to acme-dev (4128…9903) as matus.',
      'web and apiService get a public URL. Nothing else is reachable from the internet.',
      'It’s live: acme.com and api.acme.com.'
    ],
    url: 'localhost:5173/#deploy',
    frame: 'browser'
  },
  {
    n: '04',
    id: 'operate',
    kicker: 'Day 1 · operate',
    title: 'Every push, the same way.',
    body: [
      'The Console holds the project with its stages. A push to main deploys production; a pull request gets its own preview stage with a URL. Both run on a build runner inside your AWS account that keeps its caches warm and stops itself after fifteen idle minutes.',
      'Self-hosted GitHub Actions jobs can use the same runner.'
    ],
    facts: [
      'Push to main → production deploy #42 in 3m 08s.',
      'PR #128 → preview stage pr-128 at pr-128.acme-preview.com.',
      'Runner c7a.2xlarge, 8 vCPU / 16 GB, in eu-west-1.'
    ],
    url: 'console.stacktape.com/projects/acme-project/production',
    frame: 'browser'
  },
  {
    n: '05',
    id: 'watch',
    kicker: 'Day 1 · watch',
    title: 'Metrics, traces and logs from day one.',
    body: [
      'Observability is wired in by the deploy, not bolted on later. Metrics, OpenTelemetry traces with a waterfall, a live log tail, uptime checks from three regions, synthetic tests and alarms all read from your own CloudWatch and X-Ray data.',
      'Runtime errors are grouped into issues with stack traces and occurrence counts.'
    ],
    facts: [
      'apiService: 184 requests/s, p95 212 ms, 5xx 0.02% (example project).',
      'GET /orders traced through the handler, Postgres, Redis and an outbound call.',
      'Uptime from Ireland, Virginia and Singapore: 99.98% over 30 days.'
    ],
    url: 'console.stacktape.com/projects/acme-project/production/metrics',
    frame: 'browser'
  },
  {
    n: '06',
    id: 'incident',
    kicker: 'Day 1 · incident',
    title: 'When v41 breaks it, the incident already knows.',
    body: [
      'Two signals open incident inc_8f2k: the health check is down in all three regions and apiService is throwing a Prisma error. The incident is correlated with the release: opened four minutes after v41, config unchanged, three commits since v40.',
      '"Copy details for agent" hands the whole bundle to your coding agent. It finds the migration hook that was skipped on this stage, opens a pull request, and v42 goes out through the normal pipeline. Recovery is verified by the same signals that opened the incident.'
    ],
    facts: [
      'Resolved in 11 minutes: uptime 3/3 regions up, 0 new occurrences.',
      'Also from the CLI: stacktape incidents:show --incidentId inc_8f2k.',
      'Automatic remediation exists as a switch. It is opt-in and off by default.'
    ],
    url: 'console.stacktape.com/projects/acme-project/incidents/inc_8f2k',
    frame: 'browser'
  },
  {
    n: '07',
    id: 'again',
    kicker: 'Day 1 · and every day after',
    title: 'Then it keeps checking. Push again.',
    body: [
      'Security posture is graded against the same catalogue that guardrails enforce, so a rule can block a deploy or flag a running stack. Every deploy gets an SBOM and every image is scanned; findings are re-graded nightly. Costs come from your own AWS bill, per resource, with a budget that alerts before it is spent.',
      'The next push runs the whole loop again: review, deploy, watch, respond.'
    ],
    facts: [
      'Posture 27 of 30 checks passing; three findings, each with the fix.',
      'Guardrails on: Keep SQL private, Require WAF on load balancers, Require recoverable data stores.',
      'Production month to date $112.90 against a $150 budget, alert at 80%.'
    ],
    url: 'console.stacktape.com/projects/acme-project/production/security',
    frame: 'browser'
  }
];

export const TESTIMONIALS = [
  {
    quote:
      'As a startup founder & CTO, every hour is crucial. With Stacktape, we fast-tracked our AWS deployment process. Our development and production environments were operational in just two days. Stacktape’s speed and efficiency have been game-changing for us',
    name: 'Eric Allam',
    role: 'CTO & Founder',
    company: 'Trigger.dev',
    url: 'https://trigger.dev',
    context: 'Series A startup · London · runs ECS + Aurora PostgreSQL on Stacktape'
  },
  {
    quote:
      'Stacktape (the product) and Stacktape (the team) have helped us move extremely fast. They abstract away so much of the complexity of AWS, and let us focus on our application logic, instead of infrastructure configuration. The team is second to none, hopping in to be true partners with us on our development journey. We would not be where we are today without Stacktape.',
    name: 'Henry Garrett',
    role: 'Founding Engineer',
    company: 'Receipts',
    url: 'https://receipts.xyz',
    context: 'Early-stage startup · US · runs ECS + Lambda + RDS + SQS on Stacktape'
  },
  {
    quote:
      'Stacktape has been a game-changer for Lastmyle, providing a secure and intuitive way to manage our AWS deployments. It’s allowed our small team to efficiently handle environments using GitOps, all while keeping a tight rein on costs.',
    name: 'Rhys Williams',
    role: 'CTO & Founder',
    company: 'Lastmyle',
    url: 'https://www.lastmyle.co.nz',
    context: 'Early-stage startup · New Zealand · GitOps deployments · Java + Node.js + Next.js'
  }
];

export const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Docs', href: LINKS.docs },
      { label: 'Console', href: LINKS.signIn },
      { label: 'Sign up', href: LINKS.signUp }
    ]
  },
  {
    title: 'Open source',
    links: [
      { label: 'GitHub', href: LINKS.github },
      { label: 'Discord', href: LINKS.discord }
    ]
  },
  {
    title: 'Company',
    links: [
      { label: 'Book a demo', href: LINKS.demo },
      { label: 'Privacy', href: LINKS.privacy }
    ]
  }
];
