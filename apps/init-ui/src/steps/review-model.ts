/**
 * What the Review step says about the app, as plain functions so the words can be tested without a browser.
 */

import type { DeploymentPreferenceKey } from '@stacktape/config-inference/compose/preferences';
import type { WizardState } from '../session';

/** The product rule: never ask about a setting that changes none of this app's resources. */
export const deploymentPreferenceKeysFor = (types: Iterable<string>): DeploymentPreferenceKey[] => {
  const resourceTypes = new Set(types);
  return [
    ...(['web-service', 'worker-service', 'private-service', 'batch-job', 'relational-database', 'redis'].some((type) =>
      resourceTypes.has(type)
    )
      ? (['capacity'] as const)
      : []),
    ...(['web-service', 'worker-service', 'private-service', 'relational-database'].some((type) =>
      resourceTypes.has(type)
    )
      ? (['availability'] as const)
      : []),
    ...(['relational-database', 'bucket'].some((type) => resourceTypes.has(type)) ? (['dataProtection'] as const) : []),
    ...(resourceTypes.has('relational-database') ? (['databaseAccess'] as const) : [])
  ];
};

export const plainList = (items: readonly string[]): string =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

/** What the file will be called, given the format and whether the project already has one. */
export const filenameFor = (format: 'yaml' | 'typescript', hasExisting: boolean): string =>
  `stacktape${hasExisting ? '.generated' : ''}.${format === 'typescript' ? 'ts' : 'yml'}`;

/**
 * One plain sentence saying what was found, before any panel or tab.
 *
 * This is the answer to the question the user actually arrived with — "what did it find?" — and it
 * has to survive being the only thing they read.
 */
const TECHNOLOGY_LABELS: Readonly<Record<string, string>> = {
  astro: 'Astro',
  django: 'Django',
  fiber: 'Fiber',
  flask: 'Flask',
  gin: 'Gin',
  go: 'Go',
  hono: 'Hono',
  laravel: 'Laravel',
  nuxt: 'Nuxt',
  php: 'PHP',
  python: 'Python',
  rails: 'Rails',
  ruby: 'Ruby',
  rust: 'Rust',
  sveltekit: 'SvelteKit',
  vue: 'Vue',
  fastify: 'Fastify',
  fastapi: 'FastAPI',
  nextjs: 'Next.js',
  nestjs: 'NestJS',
  express: 'Express',
  react: 'React',
  remix: 'Remix',
  javascript: 'JavaScript',
  typescript: 'TypeScript'
};

export const technologyOf = (service: { framework?: string; language?: string } | undefined): string | undefined => {
  const raw = service?.framework ?? service?.language;
  return raw === undefined || raw === 'unknown' ? undefined : (TECHNOLOGY_LABELS[raw.toLowerCase()] ?? raw);
};

const named = (
  service: { framework?: string; language?: string } | undefined,
  noun: 'app' | 'site' = 'app'
): string => {
  const technology = technologyOf(service);
  if (technology === undefined) return `an ${noun}`;
  const article = /^[aeiou]/i.test(technology) ? 'an' : 'a';
  return `${article} ${technology} ${noun}`;
};

/**
 * Exported only so the sentence users rely on can be tested without mounting the diagram.
 *
 * `external: false` leaves out what Stacktape does not create, for a page that lists those on their own.
 */
export const summarise = (
  state: WizardState,
  { external: withExternal = true }: { external?: boolean } = {}
): string => {
  const services = state.facts?.services ?? [];
  const dependencies = state.facts?.dependencies ?? [];

  const web = services.find((service) => service.exposesHttp);
  const nonWeb = services.filter((service) => !service.exposesHttp);
  const staticSites = nonWeb.filter((service) => service.servesStaticAssets !== undefined);
  const workers = nonWeb.filter(
    (service) => service.servesStaticAssets === undefined && service.executionModel === 'long-running'
  );
  const functions = nonWeb.filter((service) => service.executionModel === 'per-request');
  const scheduled = nonWeb.filter((service) => service.executionModel === 'scheduled');

  const companionPhrases = [
    ...(staticSites.length === 0
      ? []
      : [staticSites.length === 1 ? named(staticSites[0], 'site') : `${staticSites.length} static sites`]),
    ...(workers.length === 0
      ? []
      : [workers.length === 1 ? 'a background worker' : `${workers.length} background workers`]),
    ...(functions.length === 0
      ? []
      : [functions.length === 1 ? 'a serverless function' : `${functions.length} serverless functions`]),
    ...(scheduled.length === 0
      ? []
      : [scheduled.length === 1 ? 'a scheduled job' : `${scheduled.length} scheduled jobs`])
  ];

  const appPhrase =
    services.length === 0
      ? 'nothing that runs'
      : services.length === 1
        ? staticSites.length === 1
          ? named(services[0], 'site')
          : functions.length === 1
            ? 'a serverless function'
            : scheduled.length === 1
              ? 'a scheduled job'
              : named(services[0])
        : web !== undefined &&
            nonWeb.length === staticSites.length + workers.length + functions.length + scheduled.length
          ? `${named(web)} with ${plainList(companionPhrases)}`
          : functions.length === services.length
            ? `${functions.length} serverless functions`
            : `${services.length} services`;
  const opening = appPhrase.charAt(0).toUpperCase() + appPhrase.slice(1);

  const DEPENDENCY_PHRASES: Record<string, string> = {
    postgres: 'a Postgres database',
    mysql: 'a MySQL database',
    mssql: 'a SQL Server database',
    mongodb: 'a MongoDB database',
    redis: 'a Redis cache',
    'object-storage': 'file storage',
    dynamodb: 'a DynamoDB table',
    queue: 'a queue',
    search: 'a search index',
    email: 'email sending',
    kafka: 'an event stream',
    sqlite: 'a SQLite database',
    amqp: 'a RabbitMQ broker',
    nats: 'a NATS server',
    topic: 'a notification topic',
    'event-bus': 'an event bus',
    'websocket-api': 'a WebSocket API',
    'state-machine': 'a Step Functions workflow',
    'user-pool': 'a Cognito user pool'
  };
  // Composition creates nothing for these kinds (see composeDependency), so the sentence that says
  // what will exist on AWS cannot list them as part of it; they get their own sentence instead.
  const created = dependencies.filter((entry) => !NOT_CREATED_KINDS.has(entry.kind));
  const external = dependencies.filter((entry) => NOT_CREATED_KINDS.has(entry.kind));
  const phrase = (entries: typeof dependencies) => entries.map((entry) => DEPENDENCY_PHRASES[entry.kind] ?? entry.kind);
  const list = created.length === 0 ? '' : `, using ${plainList(phrase(created))}`;
  const elsewhere =
    external.length === 0 || !withExternal
      ? ''
      : ` It also needs ${plainList(phrase(external))}, which Stacktape does not create.`;

  return `${opening}${list}.${elsewhere}`;
};

/** Dependency kinds `composeDependency` answers with `unsupported`. */
export const NOT_CREATED_KINDS: ReadonlySet<string> = new Set(['email', 'kafka', 'nats', 'amqp']);

const ENGINE_LABELS: Readonly<Record<string, string>> = {
  postgres: 'Postgres',
  'aurora-postgresql': 'Postgres',
  'aurora-postgresql-serverless': 'Postgres',
  'aurora-postgresql-serverless-v2': 'Postgres',
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  'aurora-mysql': 'MySQL',
  'aurora-mysql-serverless': 'MySQL',
  'aurora-mysql-serverless-v2': 'MySQL',
  'sqlserver-ex': 'SQL Server',
  'sqlserver-se': 'SQL Server',
  'sqlserver-web': 'SQL Server'
};

const TYPE_NAMES: Readonly<Record<string, string>> = {
  'web-service': 'Web service',
  'private-service': 'Private service',
  'worker-service': 'Background worker',
  'multi-container-workload': 'Container app',
  function: 'Function',
  'batch-job': 'Batch job',
  'nextjs-web': 'Next.js app',
  'nuxt-web': 'Nuxt app',
  'sveltekit-web': 'SvelteKit app',
  'astro-web': 'Astro app',
  'remix-web': 'Remix app',
  'solid-start-web': 'SolidStart app',
  'hosting-bucket': 'Static site',
  bucket: 'File storage',
  'efs-filesystem': 'Persistent disk',
  'redis-cluster': 'Redis cache',
  'dynamo-db-table': 'DynamoDB table',
  'sqs-queue': 'Queue',
  'sns-topic': 'Notification topic',
  'event-bus': 'Event bus',
  'http-api-gateway': 'HTTP API',
  'application-load-balancer': 'Load balancer',
  bastion: 'Database access server',
  'state-machine': 'Workflow',
  'user-auth-pool': 'User sign-in',
  'open-search-domain': 'Search',
  'mongo-db-atlas-cluster': 'MongoDB database',
  'upstash-redis': 'Redis cache'
};

/** A resource as a person would name it: "Postgres database", "Next.js app", "Web service (FastAPI)". */
export const plainResourceName = (
  resource: { type: string; properties: Record<string, unknown> },
  framework?: string
): string => {
  if (resource.type === 'relational-database') {
    const engine = (resource.properties.engine as { type?: unknown } | undefined)?.type;
    return `${typeof engine === 'string' ? (ENGINE_LABELS[engine] ?? 'SQL') : 'SQL'} database`;
  }
  const name = TYPE_NAMES[resource.type] ?? resource.type;
  return framework === undefined || name.includes(framework) || !/service|worker|Container|Function/.test(name)
    ? name
    : `${name} (${framework})`;
};

const SITE_FRAMEWORKS: Readonly<Record<string, string>> = {
  'nextjs-web': 'Next.js',
  'nuxt-web': 'Nuxt',
  'sveltekit-web': 'SvelteKit',
  'astro-web': 'Astro',
  'remix-web': 'Remix',
  'solid-start-web': 'SolidStart'
};

/**
 * A resource's short name in the workspace, on its diagram node and beside its block: what it is to a developer, from
 * what runs in it. "Postgres database", "Next.js site", "React site", "FastAPI service", "Database access server".
 */
export const resourceTitle = (
  resource: { type: string; properties: Record<string, unknown> },
  technology?: string
): string => {
  const site = SITE_FRAMEWORKS[resource.type];
  if (site !== undefined) return `${site} site`;
  switch (resource.type) {
    case 'hosting-bucket':
      return technology === undefined ? 'Static site' : `${technology} site`;
    case 'web-service':
      return technology === undefined ? 'Web service' : `${technology} service`;
    case 'private-service':
      return technology === undefined ? 'Private service' : `Private ${technology} service`;
    case 'worker-service':
      return technology === undefined ? 'Background worker' : `${technology} worker`;
    case 'function':
      return technology === undefined ? 'Function' : `${technology} function`;
    default:
      return plainResourceName(resource, technology);
  }
};

/** What each resource's alarms watch, in the words the file gives them. */
export const alarmsOf = (resource: { properties: Record<string, unknown> }): string[] => {
  const alarms = resource.properties.alarms;
  return Array.isArray(alarms)
    ? alarms.flatMap((alarm: { description?: unknown }) =>
        typeof alarm.description === 'string' ? [alarm.description] : []
      )
    : [];
};

/** What follows the amount wherever the page shows the monthly estimate: "/month estimated AWS cost + usage". */
export const monthlySuffix = (usage: boolean): string => `/month estimated AWS cost${usage ? ' + usage' : ''}`;

/** "$31/mo + pay-per-use costs" as its two halves: the fixed amount, and whether usage is billed on top. */
export const splitMonthly = (monthly: string): { amount?: string; usage: boolean } => {
  const amount = /^\$[\d,.]+/.exec(monthly)?.[0];
  return { ...(amount === undefined ? {} : { amount }), usage: monthly.includes('pay-per-use') };
};

const RDS_ENGINE_SERVICES: Readonly<Record<string, string>> = {
  postgres: 'Amazon RDS for PostgreSQL',
  mysql: 'Amazon RDS for MySQL',
  mariadb: 'Amazon RDS for MariaDB',
  'aurora-postgresql': 'Amazon Aurora PostgreSQL',
  'aurora-mysql': 'Amazon Aurora MySQL',
  'aurora-postgresql-serverless-v2': 'Aurora Serverless v2 (PostgreSQL)',
  'aurora-mysql-serverless-v2': 'Aurora Serverless v2 (MySQL)'
};

const AWS_SERVICES: Readonly<Record<string, string>> = {
  'web-service': 'ECS on Fargate · HTTP API',
  'private-service': 'ECS on Fargate',
  'worker-service': 'ECS on Fargate',
  'multi-container-workload': 'ECS on Fargate',
  function: 'AWS Lambda',
  'batch-job': 'AWS Batch',
  'nextjs-web': 'Lambda · CloudFront · S3',
  'nuxt-web': 'Lambda · CloudFront · S3',
  'sveltekit-web': 'Lambda · CloudFront · S3',
  'astro-web': 'Lambda · CloudFront · S3',
  'remix-web': 'Lambda · CloudFront · S3',
  'solidstart-web': 'Lambda · CloudFront · S3',
  'tanstack-web': 'Lambda · CloudFront · S3',
  'hosting-bucket': 'S3 · CloudFront',
  bucket: 'Amazon S3',
  'efs-filesystem': 'Amazon EFS',
  redis: 'Amazon ElastiCache',
  'dynamo-db-table': 'Amazon DynamoDB',
  'sqs-queue': 'Amazon SQS',
  'sns-topic': 'Amazon SNS',
  'event-bus': 'Amazon EventBridge',
  'http-api-gateway': 'Amazon API Gateway',
  'application-load-balancer': 'Elastic Load Balancing',
  bastion: 'Amazon EC2',
  'state-machine': 'AWS Step Functions',
  'user-auth-pool': 'Amazon Cognito',
  'open-search-domain': 'Amazon OpenSearch'
};

/** The AWS services a resource runs on, for people who know them: "Amazon RDS for PostgreSQL", "Lambda · CloudFront · S3". */
export const awsServiceOf = (resource: { type: string; properties: Record<string, unknown> }): string | undefined => {
  if (resource.type === 'relational-database') {
    const engine = (resource.properties.engine as { type?: unknown } | undefined)?.type;
    return typeof engine === 'string' ? (RDS_ENGINE_SERVICES[engine] ?? 'Amazon RDS') : 'Amazon RDS';
  }
  return AWS_SERVICES[resource.type];
};

/**
 * A resource's size in a few words, from its settings' current values: "db.t4g.micro · 20 GB", "0.5 vCPU · 1 GB ×2",
 * "1024 MB". What a cost row says the money buys.
 */
export const sizeSummary = (
  settings: ReadonlyArray<{
    id: string;
    control: string;
    value: unknown;
    options: ReadonlyArray<{ value: unknown; label: string; detail?: string }>;
  }>
): string | undefined => {
  const byId = new Map(settings.map((setting) => [setting.id, setting]));
  const labelOf = (id: string) => {
    const setting = byId.get(id);
    return setting?.options.find((option) => option.value === setting.value)?.label;
  };
  const size = settings.find((setting) => setting.control === 'size');
  const sizeOption = size?.options.find((option) => option.value === size.value);
  const parts = [
    size?.id === 'size' && sizeOption !== undefined
      ? `${sizeOption.label} · ${sizeOption.detail?.replace(' memory', '') ?? ''}`
      : sizeOption?.label,
    labelOf('storage'),
    byId.get('multiAz')?.value === true ? 'standby' : undefined,
    typeof byId.get('minInstances')?.value === 'number' && (byId.get('minInstances')!.value as number) > 1
      ? `×${byId.get('minInstances')!.value as number}`
      : undefined
  ].filter((part): part is string => part !== undefined && part !== '');
  return parts.length === 0 ? undefined : parts.join(' · ');
};
