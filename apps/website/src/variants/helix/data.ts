/**
 * Everything the "helix" study shows: the example application, the copy of every station and the
 * fixed CTAs. Components read from here so the same project, numbers and release names appear in
 * the receipt, the wizard, the Console previews and the incident, and never drift apart.
 */

export const LINKS = {
  docs: 'https://docs.stacktape.com',
  github: 'https://github.com/stacktape/stacktape',
  console: 'https://console.stacktape.com',
  signUp: 'https://console.stacktape.com/sign-up',
  demo: 'https://cal.com/stacktape/30min',
  discord: 'https://discord.gg/stacktape',
  privacy: 'https://stacktape.com/privacy-policy'
} as const;

export const INSTALL_COMMANDS = [
  { id: 'npx', label: 'npx', command: 'npx stacktape init' },
  { id: 'macos', label: 'macOS', command: 'curl -L https://installs.stacktape.com/macos.sh | sh' },
  { id: 'linux', label: 'Linux', command: 'curl -L https://installs.stacktape.com/linux.sh | sh' },
  { id: 'windows', label: 'Windows', command: 'iwr https://installs.stacktape.com/windows.ps1 -useb | iex' }
] as const;

export const HERO = {
  kicker: 'open source · your own AWS account',
  headline: ['AWS DevOps,', 'fully automated.'],
  subheadline:
    'Stacktape reads your repository, designs the infrastructure a good DevOps team would build, and runs it in your own AWS account. From the first deploy to a production incident, your developers stay in control.'
} as const;

export const PROJECT = {
  name: 'acme-project',
  repo: 'acme/acme-project',
  region: 'eu-west-1',
  summary: 'A Next.js app with a background worker, using a Postgres database and a Redis cache.',
  resourceCount: 14,
  monthly: '$112',
  account: '4128…9903 (acme-dev)',
  user: 'matus'
} as const;

export type Resource = {
  name: string;
  type: string;
  label: string;
  detail: string;
  url?: string;
};

export const RESOURCES: Resource[] = [
  { name: 'web', type: 'nextjs-web', label: 'Next.js Web', detail: 'public', url: 'https://acme.com' },
  {
    name: 'apiService',
    type: 'web-service',
    label: 'Web Service',
    detail: 'Fargate · 2–6 instances',
    url: 'https://api.acme.com'
  },
  { name: 'worker', type: 'function', label: 'Function', detail: 'Lambda · api/src/worker.ts' },
  {
    name: 'mainDatabase',
    type: 'relational-database',
    label: 'SQL database',
    detail: 'Aurora PostgreSQL 16 · private'
  },
  { name: 'cache', type: 'redis-cluster', label: 'Redis Cluster', detail: 'cache.t3.micro' },
  { name: 'firewall', type: 'web-app-firewall', label: 'Web App Firewall', detail: 'CloudFront scope' }
];

/** The files the wizard opens, in order, with what each one told it. */
export const ANALYZE_FEED = [
  { file: 'package.json', found: 'scripts, dependencies' },
  { file: 'pnpm-workspace.yaml', found: 'workspace: web, api' },
  { file: 'web/next.config.ts', found: 'Next.js app' },
  { file: 'api/Dockerfile', found: 'container build' },
  { file: 'api/src/server.ts', found: 'HTTP server, port 3000' },
  { file: 'api/src/worker.ts', found: 'background worker' },
  { file: 'api/prisma/schema.prisma', found: 'Postgres via Prisma' },
  { file: '.env.example', found: 'DATABASE_URL, REDIS_URL, STRIPE_KEY' },
  { file: 'docker-compose.yml', found: 'postgres, redis' }
] as const;

export const ANALYZE_DONE = 'Opened 41 files in 38s, all on this machine.';

export const DECISIONS = [
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
    statement: 'Running prisma migrate deploy after every deploy',
    detail: 'Found in package.json. Runs as a hook against the private database.'
  }
] as const;

/** The receipt in the hero: what `stacktape init` read, found, decided, priced and wrote. */
export const RECEIPT_LINES = [
  { kind: 'cmd', text: '$ npx stacktape init' },
  { kind: 'head', text: 'reading ./acme-project' },
  { kind: 'file', text: 'package.json' },
  { kind: 'file', text: 'web/next.config.ts' },
  { kind: 'file', text: 'api/Dockerfile' },
  { kind: 'file', text: 'api/prisma/schema.prisma' },
  { kind: 'dim', text: '41 files in 38s · all on this machine' },
  { kind: 'rule', text: '' },
  { kind: 'head', text: 'found' },
  { kind: 'text', text: 'Next.js app · worker · Postgres · Redis' },
  { kind: 'rule', text: '' },
  { kind: 'head', text: 'decided for you' },
  { kind: 'check', text: 'database private, keyless jump box' },
  { kind: 'check', text: 'two copies of apiService' },
  { kind: 'check', text: 'a week of database backups' },
  { kind: 'check', text: 'prisma migrate deploy after each deploy' },
  { kind: 'rule', text: '' },
  { kind: 'written', text: 'stacktape.yml written' },
  { kind: 'yaml', text: 'resources:' },
  { kind: 'yaml', text: '  web: { type: nextjs-web }' },
  { kind: 'yaml', text: '  apiService: { type: web-service }' },
  { kind: 'yaml', text: '  mainDatabase: { type: relational-database }' },
  { kind: 'yaml', text: '  cache: { type: redis-cluster }' },
  { kind: 'more', text: '+ worker, firewall · 14 AWS resources' },
  { kind: 'note', text: 'written by the wizard · yours to edit' },
  { kind: 'rule', text: '' },
  { kind: 'total', text: 'estimate', right: '~$112/mo' },
  { kind: 'rule', text: '' },
  { kind: 'dim', text: 'press Deploy when ready' }
] as const;

export const DEPLOY = {
  command: 'stacktape deploy --stage production --region eu-west-1',
  intro: `Deploying to AWS account ${PROJECT.account} as ${PROJECT.user}.`,
  scope:
    '14 resources will be created. web and apiService get a public URL. Nothing else is reachable from the internet.',
  packaging: [
    { name: 'web', time: '41s' },
    { name: 'apiService', time: '58s' },
    { name: 'worker', time: '6s' }
  ],
  resourcesDone: 30,
  resourcesTotal: 33,
  urls: ['https://acme.com', 'https://api.acme.com']
} as const;

export const STAGES = [
  { name: 'production', region: 'eu-west-1', status: 'Updated 2 hours ago', release: 'v40', deploying: false },
  { name: 'staging', region: 'eu-west-1', status: 'Deploying…', release: 'v41', deploying: true }
] as const;

export const RELEASES = {
  previous: 'v40',
  bad: 'v41',
  fix: 'v42',
  badCommit: 'a1b2c3d',
  badMessage: 'orders: add fulfillment status column',
  fixMessage: 'orders: run fulfillment migration hook on every stage'
} as const;

export const CICD = {
  pushes: [
    {
      ref: 'main',
      target: 'production',
      run: '#42',
      duration: '3m 08s',
      state: 'Deployed',
      message: RELEASES.fixMessage
    },
    {
      ref: 'PR #128',
      target: 'pr-128',
      run: '#41',
      duration: '2m 51s',
      state: 'Preview ready',
      message: 'checkout: retry payment webhook'
    }
  ],
  previewUrl: 'https://pr-128.acme-preview.com',
  runner: { type: 'c7a.2xlarge', spec: '8 vCPU · 16 GB', region: 'eu-west-1', idle: 'stops after 15 min idle' }
} as const;

export const METRICS = [
  { label: 'Requests', value: '184', unit: '/s' },
  { label: 'p95 latency', value: '212', unit: 'ms' },
  { label: '5xx', value: '0.02', unit: '%' }
] as const;

/** Spans of `GET /orders`; `start` and `length` are milliseconds within the 212 ms request. */
export const TRACE = {
  name: 'GET /orders',
  total: 212,
  spans: [
    { name: 'apiService handler', start: 6, length: 198, kind: 'compute' },
    { name: 'SELECT … FROM orders', start: 14, length: 48, kind: 'database' },
    { name: 'redis GET', start: 66, length: 2, kind: 'database' },
    { name: 'POST /events', start: 150, length: 31, kind: 'integration' }
  ]
} as const;

export const UPTIME = { regions: ['Ireland', 'Virginia', 'Singapore'], thirtyDay: '99.98%' } as const;

export const INCIDENT = {
  id: 'inc_8f2k',
  severity: 'Error',
  stage: 'production',
  signals: [
    { kind: 'Uptime check down', detail: 'https://api.acme.com/health (3 of 3 regions)' },
    {
      kind: 'Application error',
      detail: 'PrismaClientKnownRequestError: column "fulfillment_status" does not exist · apiService · 214 occurrences'
    }
  ],
  correlation: {
    opened: 'Opened 4m after the last deploy',
    release: RELEASES.bad,
    commit: RELEASES.badCommit,
    message: RELEASES.badMessage,
    previous: RELEASES.previous,
    config: 'config unchanged',
    diff: 'what changed (3 commits)'
  },
  agent: {
    finding: 'The migration was never applied: the afterDeploy hook was skipped for this stage.',
    action: `Fix opened as a PR and merged; deploying as ${RELEASES.fix} through the normal pipeline.`
  },
  recovery: {
    status: 'Resolved',
    reason: 'recovered on its own signals',
    duration: '11 min',
    uptime: 'uptime 3/3 regions up',
    errors: '0 new occurrences'
  },
  /** The "Around this time (same stack)" panel: v41 lands, the incident opens 4 minutes later, v42 fixes it, resolved after 11 minutes. */
  around: [
    { at: '14:02', what: `Deploy ${RELEASES.bad}`, detail: `${RELEASES.badCommit} — ${RELEASES.badMessage}` },
    { at: '14:06', what: 'inc_8f2k opened', detail: 'uptime check down · application error', now: true },
    { at: '14:13', what: `Deploy ${RELEASES.fix}`, detail: RELEASES.fixMessage },
    { at: '14:17', what: 'Resolved', detail: 'recovered on its own signals' }
  ],
  remediation: 'Let an agent apply verified fixes and deploy them',
  remediationNote: 'Opt-in. Off by default.'
} as const;

export const SECURITY = {
  passing: 27,
  total: 30,
  findings: [
    {
      kind: 'Posture',
      text: 'mainDatabase backups retained 1 day (staging)',
      rule: 'Require recoverable data stores',
      action: 'Fix in config'
    },
    {
      kind: 'Vulnerabilities',
      text: 'apiService image: 2 critical CVEs in openssl 3.0.13',
      rule: 'SBOM re-graded nightly',
      action: 'Fix PR opened'
    },
    {
      kind: 'Secrets',
      text: 'apiService: plaintext STRIPE_KEY in config',
      rule: 'Secrets must not live in config',
      action: 'Convert to $Secret'
    }
  ],
  guardrails: ['Keep SQL private', 'Require WAF on load balancers', 'Require recoverable data stores']
} as const;

export const COSTS = {
  stage: 'production',
  period: 'month to date',
  rows: [
    { name: 'mainDatabase', amount: 61.4 },
    { name: 'apiService', amount: 34.2 },
    { name: 'cache', amount: 11.9 },
    { name: 'web', amount: 3.8 },
    { name: 'worker', amount: 0.7 },
    { name: 'other', amount: 0.9 }
  ],
  total: 112.9,
  budget: 150,
  alertAt: 0.8
} as const;

export const JOB = {
  title: 'Everything an AWS DevOps team does, Stacktape does.',
  items: [
    {
      verb: 'Designs it',
      text: 'VPC, private subnets, least-privilege IAM, right-sized instances — drawn before it exists.',
      station: 3
    },
    { verb: 'Ships it', text: 'Preview environments, zero-downtime deploys, rollbacks.', station: 6 },
    { verb: 'Watches it', text: 'Metrics, traces, logs and alarms from day one.', station: 7 },
    { verb: 'Handles incidents', text: 'Correlated with the release. Auto-resolve is opt-in.', station: 8 },
    { verb: 'Secures it', text: 'Least-privilege IAM, secrets, dependency scanning.', station: 9 },
    { verb: 'Keeps costs in check', text: 'Per-resource costs and budgets.', station: 10 }
  ]
} as const;

export type StationCopy = { number: number; title: string; text: string; anchor: string };

export const STATIONS: StationCopy[] = [
  {
    number: 1,
    anchor: 'start',
    title: 'One command, on your machine.',
    text: '`npx stacktape init` opens a wizard at localhost and reads the repository with your own coding agent, or a built-in scanner. Nothing is sent to Stacktape and nothing is billed.'
  },
  {
    number: 2,
    anchor: 'analyze',
    title: 'It reads the code, not a form.',
    text: 'The wizard opens the files that describe how the app runs: the workspace, the Dockerfile, the worker entry, the Prisma schema, the env example. Every decision that follows comes from those files.'
  },
  {
    number: 3,
    anchor: 'review',
    title: 'The infrastructure, decided for you.',
    text: 'A one-sentence summary, the architecture drawn before it exists, and every open question already answered with a recommendation you can change. The file is written last, and you never type it.'
  },
  {
    number: 4,
    anchor: 'deploy',
    title: 'Deploy, knowing exactly what happens.',
    text: 'The Deploy step names the AWS account first, then what gets a public URL. Stacktape compiles the file to CloudFormation and builds the containers and functions from source.'
  },
  {
    number: 5,
    anchor: 'project',
    title: 'One project, every stage.',
    text: 'The Console shows each stage with its region, status and the resources behind it. Each stage is a plain CloudFormation stack in your account; you can eject at any time.'
  },
  {
    number: 6,
    anchor: 'cicd',
    title: 'Push to deploy, preview every pull request.',
    text: 'Pushes to main deploy production; pull requests get their own preview stage. Builds run on an EC2 runner inside your AWS account that keeps caches between runs and stops after 15 minutes idle.'
  },
  {
    number: 7,
    anchor: 'observe',
    title: 'Watched from the first deploy.',
    text: 'Metrics, traces, logs, uptime checks and alarms arrive with the deploy. All of it is read from your own CloudWatch and X-Ray data, so there is no second copy to trust.'
  },
  {
    number: 8,
    anchor: 'incident',
    title: 'An incident, tied to the release that caused it.',
    text: 'Signals open the incident, the last deploy sits right next to it, and one button hands the whole bundle to your coding agent. Recovery is verified by the same signals. Automatic remediation is opt-in and off by default.'
  },
  {
    number: 9,
    anchor: 'security',
    title: 'Secure by default, checked continuously.',
    text: 'The generated config starts with least-privilege IAM and private networking. Every deploy scans the built images, and posture is graded against the same catalogue guardrails enforce.'
  },
  {
    number: 10,
    anchor: 'costs',
    title: 'Costs per resource, before the invoice.',
    text: 'Month-to-date AWS costs per project, stage and resource, read from your own cost data, with budgets that alert before the threshold. AWS bills you directly; Stacktape charges a subscription separately.'
  }
];

export const TESTIMONIALS = [
  {
    quote:
      "As a startup founder & CTO, every hour is crucial. With Stacktape, we fast-tracked our AWS deployment process. Our development and production environments were operational in just two days. Stacktape's speed and efficiency have been game-changing for us",
    name: 'Eric Allam',
    role: 'CTO & Founder',
    company: 'Trigger.dev',
    url: 'https://trigger.dev',
    facts: 'Series A startup · London · runs ECS + Aurora PostgreSQL on Stacktape'
  },
  {
    quote:
      'Stacktape (the product) and Stacktape (the team) have helped us move extremely fast. They abstract away so much of the complexity of AWS, and let us focus on our application logic, instead of infrastructure configuration. The team is second to none, hopping in to be true partners with us on our development journey. We would not be where we are today without Stacktape.',
    name: 'Henry Garrett',
    role: 'Founding Engineer',
    company: 'Receipts',
    url: 'https://receipts.xyz',
    facts: 'Early-stage startup · US · runs ECS + Lambda + RDS + SQS on Stacktape'
  },
  {
    quote:
      "Stacktape has been a game-changer for Lastmyle, providing a secure and intuitive way to manage our AWS deployments. It's allowed our small team to efficiently handle environments using GitOps, all while keeping a tight rein on costs.",
    name: 'Rhys Williams',
    role: 'CTO & Founder',
    company: 'Lastmyle',
    url: 'https://www.lastmyle.co.nz',
    facts: 'Early-stage startup · New Zealand · GitOps deployments with Java + Node.js + Next.js'
  }
] as const;

/** The example application as a plain Stacktape config; the isometric diagram draws it. */
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

/** The file the wizard writes, shown in the Review station. Abbreviated to the shape, not the full config. */
export const GENERATED_YAML = `# written by stacktape init
# change anything, or keep it
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./web
      connectTo: [apiService]
  apiService:
    type: web-service
    properties:
      scaling:
        minInstances: 2
        maxInstances: 6
      connectTo:
        - mainDatabase
        - cache
        - worker
  worker:
    type: function
  mainDatabase:
    type: relational-database
    properties:
      accessibility:
        accessibilityMode: vpc
      automatedBackupRetentionDays: 7
  cache:
    type: redis-cluster
  firewall:
    type: web-app-firewall
hooks:
  afterDeploy:
    - scriptName: migrateDatabase`;
