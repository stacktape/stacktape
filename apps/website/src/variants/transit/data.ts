/**
 * Everything the transit study says, in one place: the example account, the ops board, the stations
 * on both lines, the incident branch and the CTAs. Components render this; they do not restate it.
 */

export type LineId = 'l0' | 'l1';

export type Station = {
  id: string;
  /** Two-digit platform number shown on the name plate. */
  no: string;
  name: string;
  line: LineId;
  /** Which lane of the gutter the line runs in at this station; the line doglegs when it changes. */
  side: 'left' | 'right';
  /** Short label for the compact progress line in the sticky bar. */
  short: string;
  /** Timetable entry in the card header: a clock time and one line of fact. */
  time: string;
  note: string;
  lead: string;
  /** The Deploy station: Line 0 ends and Line 1 begins on the same marker. */
  interchange?: boolean;
  /** The incident station carries the amber branch beside its card. */
  branch?: boolean;
};

export const LINES: Record<LineId, { name: string; sub: string }> = {
  l0: { name: 'Line 0', sub: 'Day 0 · the first ten minutes' },
  l1: { name: 'Line 1', sub: 'Day 1 · every day after' }
};

export const STATIONS: Station[] = [
  {
    id: 'start',
    no: '01',
    name: 'Start',
    short: 'Start',
    time: '09:41',
    note: 'npx stacktape init',
    line: 'l0',
    side: 'left',
    lead: 'npx stacktape init opens a wizard on localhost. It reads the repository on your machine, with your own coding agent if one is installed. Nothing leaves your machine, and nothing is billed until you press Deploy.'
  },
  {
    id: 'analyze',
    no: '02',
    name: 'Analyze',
    short: 'Analyze',
    time: '09:41',
    note: '41 files in 38s',
    line: 'l0',
    side: 'right',
    lead: 'The wizard opens the files that matter and works out what the app is and what it needs. Here that means the manifest, the Dockerfile, the Prisma schema, the env example and the compose file.'
  },
  {
    id: 'review',
    no: '03',
    name: 'Review',
    short: 'Review',
    time: '09:42',
    note: '4 decisions · ~$112 / month',
    line: 'l0',
    side: 'left',
    lead: 'Your app on AWS, before it exists: one sentence about what was found, the architecture drawn, the file it will write, and the monthly estimate. Every open question is already decided and written as a statement you can change.'
  },
  {
    id: 'deploy',
    no: '04',
    name: 'Deploy',
    short: 'Deploy',
    time: '09:49',
    note: '14 resources · live',
    line: 'l0',
    side: 'right',
    interchange: true,
    lead: 'Deploy says which AWS account it targets before anything happens. Then it builds from source, deploys through CloudFormation, and hands you the URLs. This is where Day 0 becomes Day 1.'
  },
  {
    id: 'project',
    no: '05',
    name: 'Project',
    short: 'Project',
    time: '09:52',
    note: 'production · staging',
    line: 'l1',
    side: 'left',
    lead: 'The Console shows the project the way the team thinks about it: stages, each with a region and a status. Every resource the wizard designed is listed with its type, and the config editor sits one click away.'
  },
  {
    id: 'cicd',
    no: '06',
    name: 'CI / CD',
    short: 'CI/CD',
    time: '11:02',
    note: 'PR #128 → pr-128',
    line: 'l1',
    side: 'right',
    lead: 'Push to main and production deploys. Open a pull request and it gets its own preview stage with its own URL. Builds run on a runner inside your AWS account that keeps its caches warm and stops after 15 minutes idle.'
  },
  {
    id: 'observe',
    no: '07',
    name: 'Observability',
    short: 'Observe',
    time: '14:15',
    note: '184 req/s · p95 212 ms',
    line: 'l1',
    side: 'left',
    lead: 'Metrics, traces, logs and uptime checks are read from your own CloudWatch and X-Ray data. The generated config wires them up from the first deploy, so day one already has a dashboard and alarms.'
  },
  {
    id: 'incident',
    no: '08',
    name: 'Incident',
    short: 'Incident',
    time: '17:34',
    note: 'inc_8f2k · resolved in 11 min',
    line: 'l1',
    side: 'right',
    branch: true,
    lead: 'When production breaks, the incident already knows which release did it. The branch has four stops: detected, correlated with the release, handed to a coding agent, and recovered. Recovery is verified by the same signals that opened the incident.'
  },
  {
    id: 'security',
    no: '09',
    name: 'Security',
    short: 'Security',
    time: '17:58',
    note: '27 of 30 checks · fix PR open',
    line: 'l1',
    side: 'left',
    lead: 'The generated config starts from least-privilege IAM and private networking. Posture checks and image scanning keep it that way, and guardrails stop a non-compliant deploy before anything changes.'
  },
  {
    id: 'costs',
    no: '10',
    name: 'Costs',
    short: 'Costs',
    time: '18:10',
    note: '$112.90 month to date',
    line: 'l1',
    side: 'right',
    lead: 'Month-to-date AWS costs per project, per stage and per resource, from your own AWS cost data. Set a budget with an alert threshold and hear about it before the invoice.'
  }
];

export type BoardRow = {
  time: string;
  event: string;
  detail: string;
  /** A substring of `detail` to set in the accent colour. */
  highlight?: string;
  status: 'done' | 'live' | 'ok' | 'open' | 'agent';
};

export const BOARD_ROWS: BoardRow[] = [
  {
    time: '09:41',
    event: 'init',
    detail: 'read 41 files · decided 4 things · wrote stacktape.yml',
    highlight: 'wrote stacktape.yml',
    status: 'done'
  },
  { time: '09:49', event: 'deploy #1', detail: 'production · eu-west-1 · 14 resources', status: 'live' },
  { time: '11:02', event: 'push', detail: 'PR #128 → preview pr-128.acme-preview.com', status: 'live' },
  {
    time: '17:30',
    event: 'deploy #41',
    detail: 'production · a1b2c3d orders: add fulfillment status column',
    status: 'ok'
  },
  {
    time: '17:34',
    event: 'incident',
    detail: 'inc_8f2k · uptime down 3/3 · 214 errors · 4m after v41',
    status: 'open'
  },
  { time: '17:36', event: 'handoff', detail: 'details copied for agent · migration never applied', status: 'agent' },
  { time: '17:45', event: 'deploy #42', detail: 'fix via PR · prisma migrate deploy hook restored', status: 'ok' },
  { time: '17:47', event: 'resolved', detail: 'recovered on its own signals · 11 min', status: 'ok' }
];

/**
 * The first board row expands to show the file it wrote. Flow-style YAML so each resource is one
 * line; the comment after `#` is what the wizard read to decide it.
 */
export const BOARD_YAML = [
  'resources:',
  '  web:          { type: nextjs-web }           # ./web → https://acme.com',
  '  apiService:   { type: web-service }          # ./api/Dockerfile · 2–6 instances',
  '  worker:       { type: function }             # api/src/worker.ts',
  '  mainDatabase: { type: relational-database }  # Aurora PostgreSQL 16 · private',
  '  cache:        { type: redis-cluster }        # docker-compose.yml',
  '  firewall:     { type: web-app-firewall }     # in front of web and apiService'
];

/** The capability chips under the hero, in three labelled groups. */
export const DEPTH: { label: string; items: string[] }[] = [
  {
    label: 'Compute & data',
    items: ['Fargate and Lambda', 'Aurora, DynamoDB, Redis, OpenSearch', 'SQS, SNS, EventBridge, Step Functions']
  },
  {
    label: 'Delivery & edge',
    items: [
      'CloudFront and WAF',
      'Next.js, Nuxt, SvelteKit, Astro, Remix',
      'VPC with private subnets, least-privilege IAM'
    ]
  },
  {
    label: 'No lock-in',
    items: ['plain CloudFormation in your account', 'any CloudFormation or CDK construct', 'eject anytime']
  }
];

export type InstallTarget = 'npx' | 'macos' | 'linux' | 'windows';

export const INSTALL_COMMANDS: { id: InstallTarget; label: string; command: string }[] = [
  { id: 'npx', label: 'npx', command: 'npx stacktape init' },
  { id: 'macos', label: 'macOS', command: 'curl -L https://installs.stacktape.com/macos.sh | sh' },
  { id: 'linux', label: 'Linux', command: 'curl -L https://installs.stacktape.com/linux.sh | sh' },
  { id: 'windows', label: 'Windows', command: 'iwr https://installs.stacktape.com/windows.ps1 -useb | iex' }
];

export const LINKS = {
  docs: 'https://docs.stacktape.com',
  github: 'https://github.com/stacktape/stacktape',
  signIn: 'https://console.stacktape.com',
  signUp: 'https://console.stacktape.com/sign-up',
  demo: 'https://cal.com/stacktape/30min',
  discord: 'https://discord.gg/stacktape',
  privacy: 'https://stacktape.com/privacy-policy'
};

export const ANALYZE_FEED: { file: string; note: string }[] = [
  { file: 'package.json', note: 'pnpm workspace · prisma migrate deploy script' },
  { file: 'pnpm-workspace.yaml', note: 'packages: web, api' },
  { file: 'web/next.config.ts', note: 'Next.js app in ./web' },
  { file: 'api/Dockerfile', note: 'container build for ./api' },
  { file: 'api/src/server.ts', note: 'HTTP server · Prisma client · Redis client' },
  { file: 'api/src/worker.ts', note: 'queue consumer, no HTTP port' },
  { file: 'api/prisma/schema.prisma', note: 'provider postgresql' },
  { file: '.env.example', note: 'DATABASE_URL · REDIS_URL · STRIPE_KEY' },
  { file: 'docker-compose.yml', note: 'postgres, redis' }
];

export const SUMMARY_SENTENCE = 'A Next.js app with a background worker, using a Postgres database and a Redis cache.';

export const DECISIONS: { statement: string; detail: string }[] = [
  {
    statement: 'Keeping the database reachable only from your private network',
    detail: 'No public address. Adds one small keyless jump box so local tools and migrations can tunnel in.'
  },
  {
    statement: 'Running two copies of apiService',
    detail: 'One can fail without an interruption. Roughly doubles its cost.'
  },
  { statement: 'Keeping a week of database backups', detail: 'Accidental deletion is blocked either way.' },
  {
    statement: 'Running prisma migrate deploy after every deploy',
    detail: 'Found in package.json. Runs as a hook against the private database.'
  }
];

export const RESOURCES: { name: string; type: string; label: string; note: string }[] = [
  { name: 'web', type: 'nextjs-web', label: 'Next.js Web', note: 'public · https://acme.com' },
  {
    name: 'apiService',
    type: 'web-service',
    label: 'Web Service',
    note: 'Fargate · public · https://api.acme.com · 2–6 instances'
  },
  { name: 'worker', type: 'function', label: 'Function', note: 'Lambda · api/src/worker.ts' },
  {
    name: 'mainDatabase',
    type: 'relational-database',
    label: 'SQL database',
    note: 'Aurora PostgreSQL 16 · private (vpc)'
  },
  { name: 'cache', type: 'redis-cluster', label: 'Redis Cluster', note: 'cache.t3.micro' },
  { name: 'firewall', type: 'web-app-firewall', label: 'Web App Firewall', note: 'in front of web and apiService' }
];

export const COSTS: { name: string; amount: number }[] = [
  { name: 'mainDatabase', amount: 61.4 },
  { name: 'apiService', amount: 34.2 },
  { name: 'cache', amount: 11.9 },
  { name: 'web', amount: 3.8 },
  { name: 'worker', amount: 0.7 },
  { name: 'other', amount: 0.9 }
];

export const COST_TOTAL = 112.9;
export const BUDGET = { limit: 150, alertAt: 0.8 };

export const TESTIMONIALS: {
  quote: string;
  name: string;
  role: string;
  company: string;
  url: string;
  /** Factual attribution line: company stage, location, what runs on Stacktape. */
  facts: string;
}[] = [
  {
    quote:
      'As a startup founder & CTO, every hour is crucial. With Stacktape, we fast-tracked our AWS deployment process. Our development and production environments were operational in just two days. Stacktape’s speed and efficiency have been game-changing for us',
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
      'Stacktape has been a game-changer for Lastmyle, providing a secure and intuitive way to manage our AWS deployments. It’s allowed our small team to efficiently handle environments using GitOps, all while keeping a tight rein on costs.',
    name: 'Rhys Williams',
    role: 'CTO & Founder',
    company: 'Lastmyle',
    url: 'https://www.lastmyle.co.nz',
    facts: 'Early-stage startup · New Zealand · GitOps deployments with Java + Node.js + Next.js'
  }
];

/** The example application as the isometric diagram reads it. */
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

/** The file the wizard writes, as shown in the Review station. Abridged to the lines that carry meaning. */
export const GENERATED_YAML = `# stacktape.yml — written by the wizard from 41 files it read
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
      scaling: { minInstances: 2, maxInstances: 6 }
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
      engine: { type: aurora-postgresql, properties: { version: '16.4' } }
      accessibility: { accessibilityMode: vpc }

  cache:
    type: redis-cluster
    properties:
      engine: { type: redis7 }

  firewall:
    type: web-app-firewall
    properties:
      scope: cloudfront

scripts:
  migrateDatabase:
    type: local-script
    properties:
      executeCommand: pnpm prisma migrate deploy
      connectTo: [mainDatabase]

hooks:
  afterDeploy:
    - scriptName: migrateDatabase`;
