/**
 * Everything the "split" study says, in one place: the ledger rows, the action counts behind the
 * running "You / Stacktape" counters, the example application, the CTA commands and the quotes.
 *
 * Counts are deliberately itemised (`did` lines) rather than asserted, so the totals in the sticky
 * header are the sum of things the page actually shows.
 */

export type CommandOption = {
  id: 'npx' | 'macos' | 'linux' | 'windows';
  label: string;
  command: string;
};

export const COMMANDS: CommandOption[] = [
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

export const HEADLINE = 'AWS DevOps, fully automated.';

export const SUBHEADLINE =
  'Stacktape reads your repository, designs the infrastructure a senior DevOps team would build, and deploys and operates it in your own AWS account. From the first deploy to a production incident, your developers stay in control of every decision.';

/** Plain object for `IsometricDiagram`. Mirrors the generated file, minus scripts and hooks. */
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

/**
 * Lines of the generated file with their provenance. `from` names the repository file a line was
 * derived from; `decided` marks a line the wizard chose and listed under "Decided for you".
 */
export type ConfigLine = {
  text: string;
  from?: string;
  decided?: boolean;
};

/** The full file is 47 lines; the hero shows a complete excerpt of it, never a truncated line. */
export const CONFIG_LINE_COUNT = 47;

export const CONFIG_EXCERPT: ConfigLine[] = [
  { text: 'resources:' },
  { text: '  web:', from: 'web/next.config.ts' },
  { text: '    type: nextjs-web' },
  { text: '    properties: { appDirectory: ./web }' },
  { text: '  apiService:', from: 'api/Dockerfile' },
  { text: '    type: web-service' },
  { text: '    properties:' },
  { text: '      scaling: { minInstances: 2, maxInstances: 6 }', decided: true },
  { text: '      connectTo: [mainDatabase, cache, worker]', from: 'api/src/server.ts' },
  { text: '  mainDatabase:', from: 'api/prisma/schema.prisma' },
  { text: '    type: relational-database' },
  { text: '    properties:' },
  { text: '      accessibility:', decided: true },
  { text: '        accessibilityMode: vpc' }
];

/** Phone-sized proof: one complete block, short enough to sit under the CTA without wrapping. */
export const CONFIG_EXCERPT_COMPACT: ConfigLine[] = [
  { text: 'resources:' },
  { text: '  mainDatabase:', from: 'api/prisma/schema.prisma' },
  { text: '    type: relational-database' },
  { text: '    properties:' },
  { text: '      accessibility:', decided: true },
  { text: '        accessibilityMode: vpc' }
];

export const CONFIG_EXCERPT_REST = 'the other 33 lines: worker, cache, firewall, the migration hook';

/** Direction A as six one-line callouts. The prose behind each belongs to the journey rows. */
export const CALLOUTS: { verb: string; detail: string }[] = [
  { verb: 'Designs it', detail: 'VPC, private subnets, least-privilege IAM' },
  { verb: 'Ships it', detail: 'preview per PR, zero-downtime deploys, rollbacks' },
  { verb: 'Watches it', detail: 'metrics, traces, logs, uptime, alarms' },
  { verb: 'Handles incidents', detail: 'correlated with the release; auto-fix opt-in' },
  { verb: 'Secures it', detail: 'secrets, SBOM per deploy, guardrails' },
  { verb: 'Keeps costs in check', detail: 'per-resource costs, budgets' }
];

export type Decision = { statement: string; detail: string };

export const DECISIONS: Decision[] = [
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
    statement: 'Running `prisma migrate deploy` after every deploy',
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

export type ResourceRow = {
  name: string;
  type: string;
  label: string;
  detail: string;
  category: 'compute' | 'database' | 'network' | 'security';
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
    detail: 'Aurora PostgreSQL 16 · private (vpc)',
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

export type PreviewKind =
  | 'wizard-start'
  | 'wizard-analyze'
  | 'wizard-review'
  | 'wizard-deploy'
  | 'wizard-live'
  | 'cicd-preview'
  | 'observability'
  | 'console-project'
  | 'incident-detect'
  | 'incident-correlate'
  | 'incident-handoff'
  | 'incident-recover'
  | 'remediation'
  | 'security'
  | 'costs';

export type Chapter = 'init' | 'ship' | 'operate' | 'incident' | 'secure' | 'cost';

export type JourneyRow = {
  id: string;
  day: 0 | 1;
  time: string;
  /** Mono chapter label in the human column, so the page can be scanned by topic. */
  chapter: Chapter;
  /** What the human did. `nothing` renders the quiet dash. */
  you: { text: string; note?: string; count: number; nothing?: boolean };
  /** What Stacktape did, itemised. `count` is the number of ledger lines. */
  stacktape: { did: string[] };
  preview: PreviewKind;
  /** Amber accent, incident rows only. */
  tone?: 'incident';
};

export const ROWS: JourneyRow[] = [
  {
    id: 'init',
    chapter: 'init',
    day: 0,
    time: '09:41',
    you: { text: 'Ran `npx stacktape init`.', count: 1 },
    stacktape: {
      did: [
        'Opened the wizard on localhost, in your browser',
        'Found Claude Code on this machine, asked it to read the repository'
      ]
    },
    preview: 'wizard-start'
  },
  {
    id: 'analyze',
    chapter: 'init',
    day: 0,
    time: '09:42',
    you: { text: 'Pressed Analyze.', count: 1 },
    stacktape: {
      did: [
        'Read 41 files in 38 seconds, all on this machine',
        'Recognised a Next.js app, a worker, Postgres and Redis',
        'Found the migration command in package.json'
      ]
    },
    preview: 'wizard-analyze'
  },
  {
    id: 'review',
    chapter: 'init',
    day: 0,
    time: '09:43',
    you: { text: 'Read the summary. Changed nothing.', count: 0 },
    stacktape: {
      did: [
        'Wrote stacktape.yml',
        'Kept the database private, behind a keyless jump box',
        'Ran two copies of apiService',
        'Kept a week of database backups',
        'Wired prisma migrate deploy as an after-deploy hook',
        'Drew the architecture before it exists',
        'Priced it: 14 AWS resources, about $112 a month'
      ]
    },
    preview: 'wizard-review'
  },
  {
    id: 'deploy',
    chapter: 'init',
    day: 0,
    time: '09:45',
    you: { text: 'Pressed Deploy.', count: 1 },
    stacktape: {
      did: [
        'Named the AWS account it was about to touch',
        'Compiled the config to CloudFormation',
        'Built web, apiService and worker from source',
        'Created 14 resources: VPC, private subnets, least-privilege IAM roles',
        'Left only web and apiService reachable from the internet'
      ]
    },
    preview: 'wizard-deploy'
  },
  {
    id: 'live',
    chapter: 'init',
    day: 0,
    time: '09:51',
    you: { text: 'Nothing.', count: 0, nothing: true },
    stacktape: {
      did: [
        'Ran prisma migrate deploy through the jump box',
        'Issued TLS certificates and pointed the domains',
        'Reported the URLs'
      ]
    },
    preview: 'wizard-live'
  },
  {
    id: 'pr',
    chapter: 'ship',
    day: 1,
    time: '10:12',
    you: { text: 'Opened a pull request.', count: 1 },
    stacktape: {
      did: [
        'Woke the build runner in your AWS account',
        'Built with the caches it kept from last time',
        'Deployed a preview stage, pr-128, with its own URL',
        'Scheduled the runner to stop after 15 minutes idle'
      ]
    },
    preview: 'cicd-preview'
  },
  {
    id: 'watch',
    chapter: 'operate',
    day: 1,
    time: '14:36',
    you: { text: 'Nothing.', count: 0, nothing: true, note: 'It is Tuesday. Production is busy.' },
    stacktape: {
      did: [
        'Collected metrics for every resource',
        'Traced requests end to end, with OpenTelemetry',
        'Kept the logs searchable and live',
        'Checked https://api.acme.com/health from three regions'
      ]
    },
    preview: 'observability'
  },
  {
    id: 'merge',
    chapter: 'ship',
    day: 1,
    time: '17:58',
    you: { text: 'Merged a pull request and went home.', count: 1 },
    stacktape: {
      did: [
        'Built on the runner, caches warm',
        'Deployed v41 to production without downtime',
        'Kept v40 ready to roll back to'
      ]
    },
    preview: 'console-project'
  },
  {
    id: 'detect',
    chapter: 'incident',
    day: 1,
    time: '18:05',
    you: { text: 'Nothing.', count: 0, nothing: true, note: 'You are on the train.' },
    stacktape: {
      did: [
        'Saw the health check fail in all three regions',
        'Grouped 214 identical runtime errors into one issue',
        'Opened incident inc_8f2k and sent the alert to your Slack channel'
      ]
    },
    preview: 'incident-detect',
    tone: 'incident'
  },
  {
    id: 'correlate',
    chapter: 'incident',
    day: 1,
    time: '18:06',
    you: { text: 'Nothing.', count: 0, nothing: true },
    stacktape: {
      did: [
        'Matched the incident to v41, deployed four minutes earlier',
        'Compared it with v40: config unchanged, three commits of code',
        'Listed the deploys and alarms around the same time'
      ]
    },
    preview: 'incident-correlate',
    tone: 'incident'
  },
  {
    id: 'handoff',
    chapter: 'incident',
    day: 1,
    time: '18:09',
    you: { text: 'Pressed Copy details for agent. Pasted it into Claude Code. Approved the fix.', count: 2 },
    stacktape: {
      did: [
        'Packed release diff, stack frames, timeline and scoped links into one bundle',
        'Gave the agent a four-step protocol that ends in stacktape incidents:resolve',
        'Deployed the fix as v42 through the normal pipeline, after you approved it'
      ]
    },
    preview: 'incident-handoff',
    tone: 'incident'
  },
  {
    id: 'recover',
    chapter: 'incident',
    day: 1,
    time: '18:16',
    you: { text: 'Nothing.', count: 0, nothing: true },
    stacktape: {
      did: ['Watched the same signals that opened the incident come back', 'Resolved inc_8f2k after 11 minutes']
    },
    preview: 'incident-recover',
    tone: 'incident'
  },
  {
    id: 'remediation',
    chapter: 'incident',
    day: 1,
    time: '18:20',
    you: { text: 'Left this switched off.', count: 0, note: 'Your call, not ours.' },
    stacktape: { did: [] },
    preview: 'remediation'
  },
  {
    id: 'security',
    chapter: 'secure',
    day: 1,
    time: '09:05',
    you: { text: 'Clicked Convert to $Secret.', count: 1 },
    stacktape: {
      did: [
        'Scanned the apiService image in the pipeline and wrote its SBOM',
        'Re-graded every SBOM overnight against new CVEs',
        'Opened a pull request that bumps openssl',
        'Ran 30 posture checks against the same catalogue guardrails enforce',
        'Enforced 3 guardrails on every deploy: SQL private, WAF on, recoverable data stores'
      ]
    },
    preview: 'security'
  },
  {
    id: 'costs',
    chapter: 'cost',
    day: 1,
    time: '09:06',
    you: { text: 'Nothing.', count: 0, nothing: true },
    stacktape: {
      did: [
        'Read this month’s spend from your AWS cost data',
        'Split it per stage and per resource',
        'Watched the $150 budget'
      ]
    },
    preview: 'costs'
  }
];

export const YOU_TOTAL = ROWS.reduce((sum, row) => sum + row.you.count, 0);
export const STACKTAPE_TOTAL = ROWS.reduce((sum, row) => sum + row.stacktape.did.length, 0);

export type Testimonial = { name: string; role: string; company: string; url: string; quote: string; facts: string };

export const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Eric Allam',
    role: 'CTO & Founder',
    company: 'Trigger.dev',
    url: 'https://trigger.dev',
    facts: 'Series A startup · London · runs ECS + Aurora PostgreSQL on Stacktape',
    quote:
      "As a startup founder & CTO, every hour is crucial. With Stacktape, we fast-tracked our AWS deployment process. Our development and production environments were operational in just two days. Stacktape's speed and efficiency have been game-changing for us"
  },
  {
    name: 'Henry Garrett',
    role: 'Founding Engineer',
    company: 'Receipts',
    url: 'https://receipts.xyz',
    facts: 'Early-stage startup · US · runs ECS + Lambda + RDS + SQS on Stacktape',
    quote:
      'Stacktape (the product) and Stacktape (the team) have helped us move extremely fast. They abstract away so much of the complexity of AWS, and let us focus on our application logic, instead of infrastructure configuration. The team is second to none, hopping in to be true partners with us on our development journey. We would not be where we are today without Stacktape.'
  },
  {
    name: 'Rhys Williams',
    role: 'CTO & Founder',
    company: 'Lastmyle',
    url: 'https://www.lastmyle.co.nz',
    facts: 'Early-stage startup · New Zealand · GitOps deployments with Java + Node.js + Next.js',
    quote:
      "Stacktape has been a game-changer for Lastmyle, providing a secure and intuitive way to manage our AWS deployments. It's allowed our small team to efficiently handle environments using GitOps, all while keeping a tight rein on costs."
  }
];
