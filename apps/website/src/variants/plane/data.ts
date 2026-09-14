import type { StacktapeConfig } from '@stacktape/config';

// ── Links and CTAs ──────────────────────────────────────────────────────────────────────────────

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

// ── Hero picker: four repository shapes and what the wizard composes from each ──────────────────

export type PickerOption = {
  id: string;
  label: string;
  summary: string;
  /** The chip trail: what the wizard read, what it found, how many things it decided. */
  trail: string[];
  decisions: string[];
  /** Seconds the wizard spent reading the repository before it wrote the file. */
  seconds: number;
  /** The first lines of the stacktape.yml the wizard wrote. */
  yaml: string[];
  config: StacktapeConfig;
};

const asConfig = (config: object) => config as unknown as StacktapeConfig;

export const ACME_CONFIG = asConfig({
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
});

export const PICKER_OPTIONS: PickerOption[] = [
  {
    id: 'nextjs',
    label: 'Next.js + Postgres',
    summary: 'A Next.js app with a background worker, using a Postgres database and a Redis cache.',
    trail: ['read package.json', 'found Next.js + Prisma + Redis', 'decided 4 things', 'drew this'],
    decisions: [
      'database reachable only from the private network',
      'two copies of apiService',
      'a week of database backups',
      'prisma migrate deploy after every deploy'
    ],
    seconds: 38,
    yaml: [
      'resources:',
      '  web:',
      '    type: nextjs-web',
      '  apiService:',
      '    type: web-service',
      '    connectTo: [mainDatabase, cache, worker]'
    ],
    config: ACME_CONFIG
  },
  {
    id: 'container',
    label: 'Container API + Redis',
    summary: 'A FastAPI service with a Celery worker, using a Postgres database and a Redis broker.',
    trail: ['read requirements.txt', 'found FastAPI + Celery + psycopg', 'decided 3 things', 'drew this'],
    decisions: ['database reachable only from the private network', 'two copies of api', 'worker in a private subnet'],
    seconds: 31,
    yaml: [
      'resources:',
      '  api:',
      '    type: web-service',
      '    connectTo: [db, broker]',
      '  worker:',
      '    type: worker-service'
    ],
    config: asConfig({
      resources: {
        api: {
          type: 'web-service',
          properties: {
            packaging: {
              type: 'custom-dockerfile',
              properties: { buildContextPath: './', dockerfilePath: './Dockerfile' }
            },
            resources: { cpu: 0.5, memory: 1024 },
            scaling: { minInstances: 2, maxInstances: 4 },
            connectTo: ['db', 'broker']
          }
        },
        worker: {
          type: 'worker-service',
          properties: {
            packaging: {
              type: 'custom-dockerfile',
              properties: { buildContextPath: './', dockerfilePath: './worker.Dockerfile' }
            },
            resources: { cpu: 0.5, memory: 1024 },
            usePrivateSubnetsWithNAT: true,
            connectTo: ['db', 'broker']
          }
        },
        db: {
          type: 'relational-database',
          properties: {
            engine: {
              type: 'postgres',
              properties: { version: '16.4', primaryInstance: { instanceSize: 'db.t4g.micro' }, port: 5432 }
            },
            accessibility: { accessibilityMode: 'vpc' }
          }
        },
        broker: { type: 'redis-cluster', properties: { engine: { type: 'redis7' }, instanceSize: 'cache.t3.micro' } }
      }
    })
  },
  {
    id: 'lambda',
    label: 'Lambda API + DynamoDB',
    summary: 'A Hono API on Lambda behind an HTTP API Gateway, with a DynamoDB table and a bucket for invoices.',
    trail: ['read package.json', 'found Hono + DynamoDB client', 'decided 3 things', 'drew this'],
    decisions: ['one function per route group', 'on-demand table capacity', 'invoices bucket stays private'],
    seconds: 22,
    yaml: [
      'resources:',
      '  api:',
      '    type: http-api-gateway',
      '  getOrders:',
      '    type: function',
      '    connectTo: [ordersTable]'
    ],
    config: asConfig({
      resources: {
        api: { type: 'http-api-gateway' },
        getOrders: {
          type: 'function',
          properties: {
            packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/orders/get.ts' } },
            events: [
              { type: 'http-api-gateway', properties: { httpApiGatewayName: 'api', path: '/orders', method: 'GET' } }
            ],
            connectTo: ['ordersTable']
          }
        },
        createOrder: {
          type: 'function',
          properties: {
            packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/orders/create.ts' } },
            events: [
              { type: 'http-api-gateway', properties: { httpApiGatewayName: 'api', path: '/orders', method: 'POST' } }
            ],
            connectTo: ['ordersTable', 'invoices']
          }
        },
        ordersTable: {
          type: 'dynamo-db-table',
          properties: { primaryKey: { partitionKey: { name: 'id', type: 'S' } } }
        },
        invoices: { type: 'bucket' }
      }
    })
  },
  {
    id: 'worker',
    label: 'Worker + SQS',
    summary: 'An upload endpoint that queues work on SQS for a container worker, with a bucket for the images.',
    trail: ['read package.json', 'found @aws-sdk/client-sqs + sharp', 'decided 3 things', 'drew this'],
    decisions: ['worker scales with queue depth', 'dead-letter queue after 3 attempts', 'uploads bucket stays private'],
    seconds: 19,
    yaml: [
      'resources:',
      '  uploadApi:',
      '    type: function',
      '    connectTo: [jobs, uploads]',
      '  jobs:',
      '    type: sqs-queue'
    ],
    config: asConfig({
      resources: {
        uploadApi: {
          type: 'function',
          properties: {
            packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/upload.ts' } },
            url: { enabled: true },
            connectTo: ['jobs', 'uploads']
          }
        },
        jobs: {
          type: 'sqs-queue',
          properties: { redrivePolicy: { targetSqsQueueName: 'jobsDlq', maxReceiveCount: 3 } }
        },
        jobsDlq: { type: 'sqs-queue' },
        imageWorker: {
          type: 'worker-service',
          properties: {
            packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/worker.ts' } },
            resources: { cpu: 1, memory: 2048 },
            scaling: { minInstances: 1, maxInstances: 8 },
            connectTo: ['jobs', 'uploads']
          }
        },
        uploads: { type: 'bucket' }
      }
    })
  }
];

// ── The example application, as the Console labels it ──────────────────────────────────────────

export const PROJECT = {
  name: 'acme-project',
  repo: 'acme/acme-project',
  region: 'eu-west-1',
  account: '4128…9903 (acme-dev)',
  user: 'matus',
  summary: 'A Next.js app with a background worker, using a Postgres database and a Redis cache.',
  estimate: { resources: 14, monthly: '~$112/month', size: 'standard size' },
  urls: { web: 'https://acme.com', api: 'https://api.acme.com' }
};

export type ResourceRow = { name: string; type: string; label: string; detail: string; category: string };

export const RESOURCES: ResourceRow[] = [
  { name: 'web', type: 'nextjs-web', label: 'Next.js Web', detail: 'public · https://acme.com', category: 'network' },
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
  { name: 'cache', type: 'redis-cluster', label: 'Redis Cluster', detail: 'cache.t3.micro', category: 'database' },
  {
    name: 'firewall',
    type: 'web-app-firewall',
    label: 'Web App Firewall',
    detail: 'CloudFront scope',
    category: 'security'
  }
];

export const DECIDED = [
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

export const ANALYZE_FEED = [
  { file: 'package.json', found: 'next, prisma, ioredis' },
  { file: 'pnpm-workspace.yaml', found: 'web/, api/' },
  { file: 'web/next.config.ts', found: 'Next.js app in web/' },
  { file: 'api/Dockerfile', found: 'container image for api/' },
  { file: 'api/src/server.ts', found: 'HTTP server, port 3000' },
  { file: 'api/src/worker.ts', found: 'queue consumer' },
  { file: 'api/prisma/schema.prisma', found: 'PostgreSQL datasource' },
  { file: '.env.example', found: 'DATABASE_URL, REDIS_URL, STRIPE_KEY' },
  { file: 'docker-compose.yml', found: 'postgres, redis' }
];

export const ANALYZE_DONE = 'Opened 41 files in 38s, all on this machine.';

/** The file the wizard writes, shortened to the resource keys that matter in a preview. */
export const YAML_EXCERPT = [
  'resources:',
  '  web:',
  '    type: nextjs-web',
  '  apiService:',
  '    type: web-service',
  '    properties:',
  '      connectTo:',
  '        - mainDatabase',
  '        - cache',
  '        - worker',
  '  worker:',
  '    type: function',
  '  mainDatabase:',
  '    type: relational-database',
  '    properties:',
  '      accessibility:',
  '        accessibilityMode: vpc',
  '  cache:',
  '    type: redis-cluster'
];

export const DEPLOY = {
  intro:
    'Deploying to AWS account 4128…9903 (acme-dev) as matus. 14 resources will be created. web and apiService get a public URL. Nothing else is reachable from the internet.',
  packaged: [
    { name: 'web', time: '41s' },
    { name: 'apiService', time: '58s' },
    { name: 'worker', time: '6s' }
  ],
  resources: 33
};

export const CONSOLE_NAV = [
  { group: '', items: ['Overview', 'Config editor'] },
  { group: 'Organization', items: ['Projects', 'Activity', 'Users', 'Costs'] },
  {
    group: 'Observability',
    items: ['Logs', 'Metrics', 'Traces', 'Uptime', 'Synthetics', 'Error tracking', 'Incidents']
  },
  { group: 'Alerting', items: ['Channels', 'Notifications', 'Alarms', 'Budgets'] },
  { group: 'Configuration', items: ['Guardrails', 'Secrets', 'SSM Params', 'AWS Accounts', 'Domains'] }
];

export const STAGE_TABS = ['Overview', 'Activity', 'Logs', 'Metrics', 'Costs', 'Configuration', 'Danger zone'];

export const STAGES = [
  { name: 'production', region: 'eu-west-1', status: 'Updated 2 hours ago', release: 'v40', deploying: false },
  { name: 'staging', region: 'eu-west-1', status: 'Deploying…', release: 'v41', deploying: true }
];

export const CICD = {
  push: { branch: 'main', stage: 'production', number: '#42', duration: '3m 08s', result: 'Succeeded' },
  pr: {
    number: '#128',
    title: 'checkout: retry payment webhook',
    stage: 'pr-128',
    url: 'https://pr-128.acme-preview.com',
    result: 'Preview ready'
  },
  runner: {
    instance: 'c7a.2xlarge',
    size: '8 vCPU / 16 GB',
    region: 'eu-west-1',
    state: 'warm',
    notes: [
      'dependency and build caches kept between runs',
      'stops after 15 min idle',
      'runs self-hosted GitHub Actions jobs too'
    ]
  }
};

export const OBSERVABILITY = {
  metrics: [
    { label: 'Requests', value: '184/s', points: [40, 44, 43, 48, 52, 50, 55, 58, 56, 61, 60, 63] },
    { label: 'p95 latency', value: '212 ms', points: [58, 55, 57, 52, 54, 50, 53, 49, 51, 48, 50, 47] },
    { label: '5xx', value: '0.02%', points: [8, 6, 7, 5, 6, 5, 6, 4, 5, 5, 4, 5] }
  ],
  trace: {
    name: 'GET /orders',
    total: 212,
    spans: [
      { name: 'apiService handler', start: 4, ms: 198, category: 'compute' },
      { name: 'SELECT … FROM orders', start: 12, ms: 48, category: 'database' },
      { name: 'redis GET', start: 64, ms: 2, category: 'database' },
      { name: 'POST /events', start: 70, ms: 31, category: 'network' }
    ]
  },
  uptime: { regions: ['Ireland', 'Virginia', 'Singapore'], thirtyDay: '99.98%' }
};

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
    release: 'v41',
    commit: 'a1b2c3d',
    message: 'orders: add fulfillment status column',
    previous: 'v40',
    config: 'config unchanged',
    changed: 'what changed (3 commits)'
  },
  handoff: {
    button: 'Copy details for agent',
    finding: 'The afterDeploy hook (prisma migrate deploy) was skipped for this stage, so the column was never added.',
    steps: [
      'reads the handoff bundle',
      'applies the migration hook fix',
      'opens a pull request',
      'v42 deploys through the normal pipeline'
    ],
    resolveCommand: 'stacktape incidents:resolve --incidentId inc_8f2k'
  },
  recovery: {
    status: 'Resolved',
    reason: 'recovered on its own signals',
    duration: '11 min',
    uptime: '3/3 regions up',
    errors: '0 new occurrences'
  },
  remediation: { label: 'Let an agent apply verified fixes and deploy them', note: 'Opt-in. Off by default.' }
};

export const SECURITY = {
  posture: { passing: 27, total: 30 },
  findings: [
    { text: 'mainDatabase backups retained 1 day (staging)', rule: 'Require recoverable data stores', kind: 'posture' },
    {
      text: 'apiService image: 2 critical CVEs in openssl 3.0.13 — fix PR opened',
      rule: 'Vulnerabilities',
      kind: 'vulnerability'
    },
    { text: 'apiService: plaintext STRIPE_KEY in config → convert to $Secret', rule: 'Secrets', kind: 'secret' }
  ],
  guardrails: ['Keep SQL private', 'Require WAF on load balancers', 'Require recoverable data stores']
};

export const COSTS = {
  rows: [
    { name: 'mainDatabase', amount: 61.4, category: 'database' },
    { name: 'apiService', amount: 34.2, category: 'compute' },
    { name: 'cache', amount: 11.9, category: 'database' },
    { name: 'web', amount: 3.8, category: 'network' },
    { name: 'worker', amount: 0.7, category: 'compute' },
    { name: 'other', amount: 0.9, category: 'other' }
  ],
  total: 112.9,
  budget: { amount: 150, alertAt: 0.8 }
};

export const TESTIMONIALS = [
  {
    quote:
      "As a startup founder & CTO, every hour is crucial. With Stacktape, we fast-tracked our AWS deployment process. Our development and production environments were operational in just two days. Stacktape's speed and efficiency have been game-changing for us",
    name: 'Eric Allam',
    role: 'CTO & Founder, Trigger.dev',
    url: 'https://trigger.dev',
    facts: 'Series A startup · London · ECS + Aurora PostgreSQL on Stacktape',
    coordinate: 'x 02 · y 11'
  },
  {
    quote:
      'Stacktape (the product) and Stacktape (the team) have helped us move extremely fast. They abstract away so much of the complexity of AWS, and let us focus on our application logic, instead of infrastructure configuration. The team is second to none, hopping in to be true partners with us on our development journey. We would not be where we are today without Stacktape.',
    name: 'Henry Garrett',
    role: 'Founding Engineer, Receipts',
    url: 'https://receipts.xyz',
    facts: 'Early-stage startup · US · ECS + Lambda + RDS + SQS on Stacktape',
    coordinate: 'x 07 · y 12'
  },
  {
    quote:
      "Stacktape has been a game-changer for Lastmyle, providing a secure and intuitive way to manage our AWS deployments. It's allowed our small team to efficiently handle environments using GitOps, all while keeping a tight rein on costs.",
    name: 'Rhys Williams',
    role: 'CTO & Founder, Lastmyle',
    url: 'https://www.lastmyle.co.nz',
    facts: 'Early-stage startup · New Zealand · GitOps deployments · Java + Node.js + Next.js',
    coordinate: 'x 12 · y 11'
  }
];
