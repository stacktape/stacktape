/*
 * Everything the "console" study says, in one place: the example project, the six screens, the
 * sidebar, the install commands and the closing voices. Components read from here so a wording
 * change lands once. The example app is the shared acme-project every study uses.
 */

/** The plain object the isometric diagram draws. It crosses the island boundary as JSON. */
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

/** The file the wizard writes for the same app. Hand-written so it reads like a real stacktape.yml. */
export const ACME_YAML = `# Written by \`npx stacktape init\`. Nothing exists on AWS until you deploy.
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./web
      connectTo:
        - apiService

  apiService:
    type: web-service
    properties:
      packaging:
        type: custom-dockerfile
        properties:
          buildContextPath: ./api
          dockerfilePath: ./api/Dockerfile
      resources:
        cpu: 0.5
        memory: 1024
      scaling:
        minInstances: 2   # one can fail without an interruption
        maxInstances: 6
      connectTo:
        - mainDatabase
        - cache
        - worker

  worker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: api/src/worker.ts
      connectTo:
        - mainDatabase

  mainDatabase:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql
        properties:
          version: '16.4'
          port: 5432
      accessibility:
        accessibilityMode: vpc   # private network only
      automatedBackupRetentionDays: 7

  cache:
    type: redis-cluster
    properties:
      engine:
        type: redis7
      instanceSize: cache.t3.micro

  firewall:
    type: web-app-firewall
    properties:
      scope: cloudfront

scripts:
  migrate:
    type: local-script
    properties:
      executeCommand: npx prisma migrate deploy   # found in package.json
      connectTo:
        - mainDatabase

hooks:
  afterDeploy:
    - scriptName: migrate
`;

export type ScreenId = 'designs' | 'ships' | 'watches' | 'incidents' | 'secures' | 'costs';

export type Screen = {
  id: ScreenId;
  number: string;
  /** The sidebar label and the screen title. */
  title: string;
  /** One line under the title: what it means, in plain words. */
  meaning: string;
  /** The reader's part, shown as a chip in the header. */
  you: string;
  /** Who does the work: a gold "you" tag or a teal "auto" tag in the sidebar. */
  who: 'you' | 'auto';
  what: string;
  forYou: string;
  youDo: string;
  icon: string;
};

const icon = (paths: string) =>
  `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const OVERVIEW_ICON = icon(
  '<rect x="3" y="3" width="6" height="6" rx="1.2"/><rect x="11" y="3" width="6" height="6" rx="1.2"/><rect x="3" y="11" width="6" height="6" rx="1.2"/><rect x="11" y="11" width="6" height="6" rx="1.2"/>'
);

export const SCREENS: Screen[] = [
  {
    id: 'designs',
    number: '01',
    title: 'Designs your infrastructure',
    meaning: 'Reads your repository and works out what your app needs on AWS, then writes it down as one file.',
    you: 'Run npx stacktape init, read what it decided, change anything with one click.',
    who: 'you',
    what: 'One command opens a wizard in your browser. It runs on your machine and reads your repository: where the app runs, its database, cache and queues, and how they connect. Nothing is sent to Stacktape.',
    forYou:
      'You get a single configuration file you can read, plus the picture of what it builds. The production defaults you would otherwise have to know are already in it: a private network, least-privilege permissions, backups. Nothing is created until you say so.',
    youDo: 'Read the decisions, change any of them, press Deploy.',
    icon: icon('<path d="M4 16.5 6.5 10l7-6 2.5 2.5-6 7z"/><path d="m12 5.5 2.5 2.5"/><path d="M4 16.5l2.5-6.5"/>')
  },
  {
    id: 'ships',
    number: '02',
    title: 'Ships it',
    meaning: 'Builds your containers and functions from source and deploys them into your own AWS account.',
    you: 'Press Deploy once, then push code.',
    who: 'auto',
    what: 'Stacktape packages your app from source and deploys it as one unit. After the first deploy, every push to your main branch deploys, and every pull request gets its own preview environment with its own URL.',
    forYou:
      'No build pipeline to write and no deploy scripts to maintain. Builds run on a machine inside your AWS account that keeps its caches and stops itself when idle. Deploys are zero-downtime and can be rolled back.',
    youDo: 'Push code. Open pull requests.',
    icon: icon('<path d="M10 3v10"/><path d="m6 9 4 4 4-4"/><path d="M4 17h12"/>')
  },
  {
    id: 'watches',
    number: '03',
    title: 'Watches it',
    meaning: 'Metrics, logs, traces, uptime checks and alarms are wired up by the deploy itself.',
    you: 'Nothing. Look when you want to.',
    who: 'auto',
    what: 'Every deploy connects the monitoring: request and error metrics, live logs, request traces, uptime checks from three regions, and alarms. All of it is read from your own AWS account.',
    forYou:
      'No agents to install and no dashboards to build. When a request is slow, you can see which step was slow. When a check fails, you know from which region.',
    youDo: 'Nothing. Open the Console when you want to see how the app is doing.',
    icon: icon('<path d="M3 11h3l2-5 3 9 2-6 1.5 2H17"/>')
  },
  {
    id: 'incidents',
    number: '04',
    title: 'Handles incidents',
    meaning: 'When something breaks, Stacktape opens an incident and tells you which release caused it.',
    you: 'Respond only when a human is needed.',
    who: 'auto',
    what: 'Failing checks and grouped errors open an incident. The incident shows what changed since the last healthy release and packages everything a coding agent needs to fix it: the diff, the evidence, the timeline and a resolve protocol.',
    forYou:
      'You review a proposed fix instead of starting an investigation at 2 a.m. Nothing reaches production without your approval. Letting an agent fix and deploy on its own is opt-in and off by default.',
    youDo: 'Review the fix. Approve it, or step in yourself.',
    icon: icon('<path d="M10 3.5 17 16H3z"/><path d="M10 8.5v3.5"/><path d="M10 14.2v.3"/>')
  },
  {
    id: 'secures',
    number: '05',
    title: 'Secures it',
    meaning: 'Least-privilege permissions, private networking and managed secrets are the defaults.',
    you: 'Nothing. Turn on stricter rules if you want them.',
    who: 'auto',
    what: 'The generated setup gives each service only the permissions it needs, keeps databases off the public internet and stores secrets outside your code. Guardrails are organisation-wide rules that block a risky change before it deploys.',
    forYou:
      'A security posture you can show your CTO: every check named, the failing ones explained, and a fix one click away. What you ship is scanned for known vulnerabilities on every deploy.',
    youDo: 'Nothing by default. Turn on stricter guardrails when the team wants them.',
    icon: icon('<path d="M10 3 4 5.5v4.5c0 3.5 2.5 6 6 7 3.5-1 6-3.5 6-7V5.5z"/><path d="m7.5 10 1.8 1.8L12.8 8"/>')
  },
  {
    id: 'costs',
    number: '06',
    title: 'Keeps costs in check',
    meaning: 'See what every resource costs, per project and environment, straight from your AWS bill.',
    you: 'Set a budget once.',
    who: 'you',
    what: 'Stacktape reads the cost data of your own AWS account and attributes it to your projects, environments and resources, so a bill line becomes "the database of production".',
    forYou:
      'No spreadsheet to reconcile and no surprise at the end of the month. A budget warns you at a threshold you choose, before the bill does.',
    youDo: 'Set a budget once. AWS still bills you directly; Stacktape never sits in between.',
    icon: icon(
      '<path d="M10 3v14"/><path d="M13.5 6.5c-.6-1-1.9-1.5-3.5-1.5-2 0-3.3.9-3.3 2.3 0 3.4 6.8 1.4 6.8 4.9 0 1.5-1.5 2.4-3.5 2.4-1.8 0-3.2-.7-3.8-1.8"/>'
    )
  }
];

export const COMMANDS = [
  { id: 'npx', label: 'npx', command: 'npx stacktape init' },
  { id: 'macos', label: 'macOS', command: 'curl -L https://installs.stacktape.com/macos.sh | sh' },
  { id: 'linux', label: 'Linux', command: 'curl -L https://installs.stacktape.com/linux.sh | sh' },
  { id: 'windows', label: 'Windows', command: 'iwr https://installs.stacktape.com/windows.ps1 -useb | iex' }
] as const;

export const HEADLINE = 'AWS DevOps, fully automated.';

export const SUBHEADLINE =
  'Stacktape puts your app on your own AWS account and does the DevOps work for you. It reads your code, sets up the infrastructure, deploys, and then keeps the app running: monitored, secured, and within budget.';

export const TRUST_LINE =
  'Open-source CLI (MIT). Plain CloudFormation in your own AWS account. Extend with any AWS resource. Eject anytime.';

export const VOICES = [
  {
    quote:
      'With Stacktape, we fast-tracked our AWS deployment process. Our development and production environments were operational in just two days.',
    name: 'Eric Allam',
    role: 'CTO & Founder, Trigger.dev',
    fact: 'Series A startup, London. Runs ECS + Aurora PostgreSQL on Stacktape.'
  },
  {
    quote:
      'They abstract away so much of the complexity of AWS, and let us focus on our application logic, instead of infrastructure configuration.',
    name: 'Henry Garrett',
    role: 'Founding Engineer, Receipts',
    fact: 'Early-stage startup, US. Runs ECS + Lambda + RDS + SQS.'
  },
  {
    quote:
      'It has allowed our small team to efficiently handle environments using GitOps, all while keeping a tight rein on costs.',
    name: 'Rhys Williams',
    role: 'CTO & Founder, Lastmyle',
    fact: 'Early-stage startup, New Zealand. GitOps with Java, Node.js and Next.js.'
  }
];
