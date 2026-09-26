/*
 * Everything the "readme" page says and shows.
 *
 * The page copy, the eight sections, the example project, the screens, the README's own furniture
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

/**
 * Each tab's lines, in order. The install tabs end with `stacktape init`: the next command after
 * installing, shown rather than copied. macOS installs the Apple Silicon build; the Intel script is
 * `macos.sh` at the same address for anyone still on one.
 */
export const COMMANDS = [
  { id: 'npx', label: 'npx', lines: ['npx stacktape init'] },
  {
    id: 'macos',
    label: 'macOS',
    lines: ['curl -L https://installs.stacktape.com/macos-arm.sh | sh', 'stacktape init']
  },
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
    firewall: { type: 'web-app-firewall', properties: { scope: 'cdn' } }
  }
};

/* ── The eight sections ────────────────────────────────────────────────────────────────────── */

export type Section = {
  index: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
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
  },
  {
    index: 8,
    number: '08',
    id: 'talk-to-us',
    name: 'Talk to us when you get stuck',
    text: 'Not every infrastructure question has a documented answer, and the ones that matter tend to arrive at a bad moment. When you hit one, you can talk to us. Support here is the engineers who build Stacktape, in a shared channel with your team: people who work on AWS every day, on the same kinds of stacks you deploy.',
    gets: [
      'A shared channel with the people who build Stacktape, and a call whenever that is faster than typing.',
      'Ask before you commit: have a configuration, a migration or a bill looked at by someone who has seen it before.',
      'Hands-on support from the Flexible plan onwards, and up to 24×7 premium support on Enterprise with response times agreed in advance.'
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
      credentials: { masterUserPassword: $Secret('db-password') }
      engine:
        type: aurora-postgresql
        properties: { version: '16' }
  cache:
    type: redis-cluster
    properties:
      instanceSize: cache.t3.micro
      defaultUserPassword: $Secret('redis-password')
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
      scope: cdn`;

/**
 * The same stack in TypeScript. A resource class takes that resource's own properties, so the shape
 * matches the YAML one for one; it is not a flattened convenience API.
 */
const TS_SOURCE = `import {
  defineConfig, $Secret, NextjsWeb, WebService, LambdaFunction,
  RelationalDatabase, RedisCluster, WebAppFirewall
} from 'stacktape';

export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    engine: { type: 'aurora-postgresql', properties: { version: '16' } }
  });
  const cache = new RedisCluster({
    instanceSize: 'cache.t3.micro', defaultUserPassword: $Secret('redis-password')
  });
  const worker = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'api/src/worker.ts' }
    },
    connectTo: [mainDatabase]
  });
  const apiService = new WebService({
    packaging: {
      type: 'custom-dockerfile',
      properties: { dockerfilePath: './api/Dockerfile' }
    },
    resources: { cpu: 0.5, memory: 1024 },
    scaling: { minInstances: 2, maxInstances: 6 },
    connectTo: [mainDatabase, cache, worker]
  });
  const web = new NextjsWeb({ appDirectory: './web', connectTo: [apiService] });
  const firewall = new WebAppFirewall({ scope: 'cdn' });
  return { resources: { web, apiService, worker, mainDatabase, cache, firewall } };
});`;

export type EditorFileId = 'yml' | 'ts';

export type EditorDoc = {
  /** The line the editor prints above the description. YAML shows the schema, TypeScript the type. */
  signature: Partial<Record<EditorFileId, string>>;
  text: string;
  href: string;
};

const DOCS = 'https://docs.stacktape.com';

/**
 * What the editor says about a property when the pointer rests on it. Every signature, type and
 * enumerated value here comes from the config schema in `@stacktape/config`, and every sentence is
 * the schema's or the documentation's own description, shortened.
 *
 * Keyed by the token as it is written in the file, with one exception: `resources` at the root of
 * the file is every resource in the stack, while `resources` inside a service is that container's
 * size, so the second one is keyed apart.
 */
export const EDITOR_DOCS = {
  resources: {
    signature: { yml: 'resources: Record<string, Resource>', ts: '(property) resources: Record<string, Resource>' },
    text: 'Every resource in the stack, by name. The name is how other resources refer to this one, and Stacktape uses it when it names what it creates in AWS.',
    href: `${DOCS}/configuration/resources`
  },
  type: {
    signature: { yml: 'type: "relational-database" | "redis-cluster" | "function" | "web-service" | …' },
    text: 'Which kind of resource this is. The type decides which properties it takes and what Stacktape creates in AWS for it.',
    href: `${DOCS}/configuration/resources`
  },
  credentials: {
    signature: {
      yml: 'credentials: { masterUserPassword: string; masterUserName?: string }',
      ts: '(property) credentials: RelationalDatabaseCredentials'
    },
    text: 'The database admin login. Pass the password as a secret reference rather than a literal, so it never sits in the configuration file.',
    href: `${DOCS}/configuration/secrets`
  },
  engine: {
    signature: {
      yml: 'engine: { type: "aurora-postgresql" | "postgres" | "mysql" | … , properties: {…} }',
      ts: '(property) engine: RdsEngine | AuroraEngine | AuroraServerlessV2Engine'
    },
    text: 'What type of database runs and how. The RDS engines are single-node and fixed-size; the Aurora ones are clustered with automatic failover.',
    href: `${DOCS}/resources/databases/relational-database`
  },
  version: {
    signature: { yml: 'version: string', ts: '(property) version?: string' },
    text: 'The engine version to run.',
    href: `${DOCS}/resources/databases/relational-database`
  },
  instanceSize: {
    signature: { yml: 'instanceSize: string', ts: '(property) instanceSize: string' },
    text: 'The size of every node in the cluster, primary and replicas. It sets the memory, the performance and the cost, and it can be changed after the cluster exists.',
    href: `${DOCS}/resources/databases/redis`
  },
  defaultUserPassword: {
    signature: { yml: 'defaultUserPassword: string', ts: '(property) defaultUserPassword: string' },
    text: 'The cluster password: 16 to 128 printable ASCII characters, without a slash, a quote or an at sign. Store it as a secret.',
    href: `${DOCS}/configuration/secrets`
  },
  packaging: {
    signature: {
      yml: 'packaging: { type: "stacktape-lambda-buildpack" | "custom-dockerfile" | … , properties: {…} }',
      ts: '(property) packaging: LambdaPackaging | ContainerWorkloadContainerPackaging'
    },
    text: 'How the code becomes an artifact. A buildpack takes an entry file and builds it for you; the other modes take your own Dockerfile or a prebuilt image.',
    href: `${DOCS}/packaging/overview`
  },
  entryfilePath: {
    signature: { yml: 'entryfilePath: string', ts: '(property) entryfilePath: string' },
    text: "Your application's entry point. Stacktape bundles the code and its dependencies, writes source maps for JavaScript and TypeScript, and uploads the result. Everything else about the buildpack is optional.",
    href: `${DOCS}/packaging/function/stacktape-buildpack`
  },
  dockerfilePath: {
    signature: { yml: 'dockerfilePath: string', ts: '(property) dockerfilePath: string' },
    text: 'The Dockerfile Stacktape builds for this workload, instead of using a buildpack.',
    href: `${DOCS}/packaging/containers/custom-dockerfile`
  },
  computeResources: {
    signature: {
      yml: 'resources: { cpu: number; memory: number; instanceTypes?: string[] }',
      ts: '(property) resources: ContainerWorkloadResourcesConfig'
    },
    text: 'The CPU, the memory and the compute engine for the container. Fargate is the default: set cpu and memory and run no instances of your own. EC2 is available through instanceTypes.',
    href: `${DOCS}/resources/compute/web-service`
  },
  cpu: {
    signature: { yml: 'cpu: 0.25 | 0.5 | 1 | 2 | 4 | 8 | 16', ts: '(property) cpu?: 0.25 | 0.5 | 1 | 2 | 4 | 8 | 16' },
    text: 'vCPU for each container instance. Fargate accepts these sizes only, and the memory has to match the one you pick.',
    href: `${DOCS}/resources/compute/web-service`
  },
  memory: {
    signature: { yml: 'memory: number', ts: '(property) memory?: number' },
    text: 'Memory in megabytes for each container instance.',
    href: `${DOCS}/resources/compute/web-service`
  },
  scaling: {
    signature: {
      yml: 'scaling: { minInstances?: number; maxInstances?: number; … }',
      ts: '(property) scaling?: ContainerWorkloadScaling'
    },
    text: 'Adds and removes container instances as demand changes. Traffic is distributed across every instance that is running.',
    href: `${DOCS}/resources/compute/web-service`
  },
  minInstances: {
    signature: { yml: 'minInstances: number', ts: '(property) minInstances?: number' },
    text: 'The fewest instances that keep running. One is the minimum; zero is not supported.',
    href: `${DOCS}/resources/compute/web-service`
  },
  maxInstances: {
    signature: { yml: 'maxInstances: number', ts: '(property) maxInstances?: number' },
    text: 'The most instances it will run.',
    href: `${DOCS}/resources/compute/web-service`
  },
  connectTo: {
    signature: { yml: 'connectTo: string[]', ts: '(property) connectTo?: (Resource | string)[]' },
    text: 'Gives this resource access to others in the stack. Stacktape grants the IAM permissions, opens network access where the resource needs it, and injects the connection details as STP_[RESOURCE_NAME]_[PARAM] environment variables.',
    href: `${DOCS}/configuration/connecting-resources`
  },
  appDirectory: {
    signature: { yml: 'appDirectory: string', ts: '(property) appDirectory: string' },
    text: 'The directory holding next.config.js. In a monorepo, point it at the Next.js workspace rather than the repository root.',
    href: `${DOCS}/resources/frontend/nextjs`
  },
  scope: {
    signature: { yml: 'scope: "cdn" | "regional"', ts: '(property) scope: "cdn" | "regional"' },
    text: 'cdn for resources behind CloudFront, regional for load balancers, user pools and API gateways.',
    href: `${DOCS}/resources/security/web-application-firewall`
  }
} as const satisfies Record<string, EditorDoc>;

/** The same stack twice; YAML is the tab that is open. */
export const EDITOR = {
  files: [
    { id: 'yml', name: 'stacktape.yml', language: 'YAML', source: YAML_SOURCE },
    { id: 'ts', name: 'stacktape.ts', language: 'TypeScript', source: TS_SOURCE }
  ],
  /** The label on the link at the foot of every hover card. */
  docsLink: 'View docs',
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
  docsLink: string;
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

/* ── 08 · talking to us ────────────────────────────────────────────────────────────────────── */

/** A message is written as its plain parts and the identifiers inside it, so code reads as code. */
export type ChatSpan = string | { code: string };

/**
 * A customer asking us something, the morning after the incident in section 06, where a migration
 * landed after the code that needed its column. The answer is the documented one: hooks run a
 * script before or after a deployment, and a script that connects to a resource is handed its
 * connection details. Illustrative, like every other screen on the page.
 */
export const EXPERT = {
  title: `${PROJECT.name} · shared channel`,
  messages: [
    {
      who: 'Jamie',
      initials: 'JD',
      team: false,
      time: '09:14',
      spans: [
        "Yesterday's outage was our migration landing after the code that reads the column. Where should the migration run so that cannot happen again?"
      ]
    },
    {
      who: 'Marek',
      initials: 'MK',
      team: true,
      time: '09:21',
      spans: [
        'Split it. The column goes in a ',
        { code: 'beforeDeploy' },
        ' hook so it exists before the new version takes traffic, and the backfill stays in ',
        { code: 'afterDeploy' },
        ' where a slow one cannot hold up the rollout. Your migration script already has ',
        { code: 'connectTo: [mainDatabase]' },
        ', so it is handed the connection string either way.'
      ]
    },
    {
      who: 'Jamie',
      initials: 'JD',
      team: false,
      time: '09:26',
      spans: ['That is the piece we had backwards. Splitting it for v43.']
    }
  ],
  footer: 'A shared channel with your team · or book a call'
} as const satisfies {
  title: string;
  messages: readonly { who: string; initials: string; team: boolean; time: string; spans: readonly ChatSpan[] }[];
  footer: string;
};

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
  | { kind: 'code'; number: number; html: string; resource?: string };

type Language = {
  /** One source line as HTML. */
  line: (text: string) => string;
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

/**
 * Which entry a property key documents. `resources` is the one key that means two things, and the
 * value it is given tells them apart: a container's size opens with `cpu`, the stack's resources
 * with a name or nothing at all.
 */
const docIdFor = (key: string, value: string): string | undefined => {
  const id = key === 'resources' && /^\s*\{\s*cpu\b/.test(value) ? 'computeResources' : key;
  return id in EDITOR_DOCS ? id : undefined;
};

/** A property key, marked as a hover target when the editor has something to say about it. */
const keySpan = (cls: string, text: string, value: string) => {
  const id = docIdFor(text, value);
  return id ? `<span class="rm-ed-${cls} rm-ed__doc" data-doc="${id}">${escapeHtml(text)}</span>` : span(cls, text);
};

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
      else if (/^\s*\??:/.test(rest)) html += keySpan('prop', text, rest.replace(/^\s*\??:/, ''));
      else if (rest.startsWith('(')) html += span('fn', text);
      else html += span('id', text);
    } else if (space) html += text;
    else html += span('punc', text);
  }
  return html;
};

const TS: Language = {
  line: highlightTsLine,
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
        const pairValue = pair.slice(at + 1);
        return keySpan('prop', pairKey, pairValue) + span('punc', ':') + ' ' + highlightYamlValue(pairValue, pairKey);
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
    const isResource = indent.length === 2 && RESOURCE_NAMES.has(key!);
    html +=
      (isResource ? span('res', key!) : keySpan('prop', key!, value!)) +
      span('punc', ':') +
      gap +
      highlightYamlValue(value!, key);
  } else {
    html += highlightYamlValue(rest);
  }
  return html;
};

const YAML: Language = {
  line: highlightYamlLine,
  resourceOf: (line) => {
    const name = line.match(/^ {2}(\w+):\s*$/)?.[1];
    return name && RESOURCE_NAMES.has(name) ? name : undefined;
  }
};

/**
 * The editor's rows: every source line numbered and highlighted, the resource a line declares noted
 * on it, and a lens row above it when one exists. Documented properties are marked inside the
 * highlighted HTML, so the page can hang a hover card on whichever one the pointer reaches.
 */
const buildRows = (source: string, language: Language, lenses: Record<string, string>): EditorRow[] => {
  const rows: EditorRow[] = [];
  source.split('\n').forEach((line, index) => {
    const resource = language.resourceOf(line);
    const lens = resource ? lenses[resource] : undefined;
    if (lens) rows.push({ kind: 'lens', indent: line.length - line.trimStart().length, text: lens });
    rows.push({ kind: 'code', number: index + 1, html: language.line(line), resource });
  });
  return rows;
};

export const highlightTs = (source: string, lenses: Record<string, string>): EditorRow[] =>
  buildRows(source, TS, lenses);

export const highlightYaml = (source: string, lenses: Record<string, string>): EditorRow[] =>
  buildRows(source, YAML, lenses);

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

/**
 * Four topics, read as one sentence: automated DevOps, for AWS, as infrastructure as code, giving
 * you a platform. Anything narrower (typescript, gitops, guardrails) describes a feature rather than
 * what the repository is, and a reader skimming the sidebar has to work out the product from them.
 */
export const TOPICS = ['devops-automation', 'aws', 'infrastructure-as-code', 'paas'] as const;

export const TRUST_CHIPS = TRUST_LINE.split(' · ');

/** The three plans in one line each, then who bills you. */
export const PRICING = {
  plans: [
    { plan: 'Free', detail: '$0 · up to $100/mo of managed AWS spend' },
    { plan: 'Flexible', detail: 'a % of managed AWS spend' },
    { plan: 'Enterprise', detail: 'Single-tenant Console in your AWS account · SSO · SOC 2 · 24×7 support' }
  ],
  more: 'See pricing'
} as const;

/**
 * How to reach the team, in the sidebar. No community links. The ways to talk to a person are read
 * one under another; the profiles are a row, since a reader scans them rather than reads them.
 */
export const CONTACT = {
  direct: [
    { label: 'Book a demo', href: LINKS.demo },
    { label: 'info@stacktape.com', href: 'mailto:info@stacktape.com' }
  ],
  profiles: [
    { label: 'GitHub', href: LINKS.github },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/stacktape' },
    { label: 'X', href: 'https://x.com/stacktape' }
  ]
} as const;

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
  costs: "This month's costs, per resource",
  expert: 'A question the morning after the incident, and the answer from the team'
} as const;

export const COVER_CAPTION = 'The Console and the CLI during a production deploy.';
