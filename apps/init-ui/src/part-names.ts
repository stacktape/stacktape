import type { ConfigResources } from './config-resources';
import type { WizardState } from './session';

type Service = { name: string; framework?: string; language?: string };

const TECHNOLOGIES: Readonly<Record<string, string>> = {
  fastapi: 'FastAPI',
  django: 'Django',
  flask: 'Flask',
  express: 'Express',
  fastify: 'Fastify',
  hono: 'Hono',
  nestjs: 'NestJS',
  koa: 'Koa',
  rails: 'Rails',
  laravel: 'Laravel',
  spring: 'Spring',
  gin: 'Gin',
  echo: 'Echo',
  fiber: 'Fiber',
  phoenix: 'Phoenix',
  react: 'React',
  vue: 'Vue',
  angular: 'Angular',
  svelte: 'Svelte',
  solid: 'Solid',
  preact: 'Preact',
  python: 'Python',
  go: 'Go',
  ruby: 'Ruby',
  php: 'PHP',
  java: 'Java',
  rust: 'Rust',
  elixir: 'Elixir',
  dotnet: '.NET',
  csharp: '.NET',
  javascript: 'Node.js',
  typescript: 'Node.js',
  node: 'Node.js'
};

const ENGINES: Readonly<Record<string, string>> = {
  postgres: 'Postgres',
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  sqlserver: 'SQL Server'
};

/** Names that need no technology: what the resource type already says. */
const TYPE_NOUNS: Readonly<Record<string, string>> = {
  'nextjs-web': 'Next.js site',
  'nuxt-web': 'Nuxt site',
  'sveltekit-web': 'SvelteKit site',
  'astro-web': 'Astro site',
  'remix-web': 'Remix site',
  'solid-start-web': 'SolidStart site',
  'tanstack-web': 'TanStack Start site',
  'private-service': 'private service',
  'worker-service': 'background worker',
  'multi-container-workload': 'container app',
  'batch-job': 'batch job',
  bastion: 'database access server',
  bucket: 'file storage bucket',
  'efs-filesystem': 'shared disk',
  'redis-cluster': 'Redis cache',
  'upstash-redis': 'Redis cache',
  'dynamo-db-table': 'DynamoDB table',
  'mongo-db-atlas-cluster': 'MongoDB database',
  'sqs-queue': 'queue',
  'sns-topic': 'notification topic',
  'event-bus': 'event bus',
  'http-api-gateway': 'HTTP API',
  'application-load-balancer': 'load balancer',
  'network-load-balancer': 'load balancer',
  'state-machine': 'workflow',
  'user-auth-pool': 'sign-in user pool',
  'open-search-domain': 'search domain',
  'web-app-firewall': 'firewall',
  'custom-resource-definition': 'custom resource'
};

const squash = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The scanned service a resource came from: the same name, ignoring case and dashes, or the only one there is. */
const serviceOf = (services: readonly Service[], resourceName: string): Service | undefined =>
  services.find((service) => squash(service.name) === squash(resourceName)) ??
  (services.length === 1 ? services[0] : undefined);

const technologyOf = (service: Service | undefined): string | undefined => {
  for (const raw of [service?.framework, service?.language]) {
    const label = raw === undefined ? undefined : TECHNOLOGIES[raw.toLowerCase()];
    if (label !== undefined) return label;
  }
  return undefined;
};

/**
 * One resource as a developer names it: "Next.js site", "Postgres database", "FastAPI service", "React site",
 * "database access server". Lower case unless it starts with a name, so it reads inside a sentence.
 */
export const partName = (
  resourceName: string,
  resource: { type: string; properties: Record<string, unknown> },
  services: readonly Service[] = []
): string => {
  if (resource.type === 'relational-database') {
    const engine = (resource.properties.engine as { type?: unknown } | undefined)?.type;
    const key =
      typeof engine === 'string' ? Object.keys(ENGINES).find((candidate) => engine.includes(candidate)) : undefined;
    return `${key === undefined ? 'SQL' : ENGINES[key]} database`;
  }
  const fixed = TYPE_NOUNS[resource.type];
  if (fixed !== undefined) return fixed;
  const technology = technologyOf(serviceOf(services, resourceName));
  if (resource.type === 'hosting-bucket') return technology === undefined ? 'static site' : `${technology} site`;
  if (resource.type === 'web-service') return technology === undefined ? 'web service' : `${technology} service`;
  if (resource.type === 'function') return technology === undefined ? 'function' : `${technology} function`;
  return resource.type.replaceAll('-', ' ');
};

/** "a Next.js site", "an HTTP API", "2 background workers". */
const counted = (name: string, count: number): string => {
  if (count > 1) return `${count} ${name.endsWith('s') ? name : `${name}s`}`;
  return `${/^(?:[aeiou]|HTTP\b|SQS\b|SNS\b)/i.test(name) && !/^(?:user|uni)/i.test(name) ? 'an' : 'a'} ${name}`;
};

/** What people open and call first, then what runs behind it, then where data lives, then the rest. */
const RANK: Readonly<Record<string, number>> = {
  'hosting-bucket': 0,
  'web-service': 1,
  'http-api-gateway': 1,
  function: 2,
  'private-service': 2,
  'worker-service': 2,
  'multi-container-workload': 2,
  'batch-job': 2,
  'relational-database': 3,
  'mongo-db-atlas-cluster': 3,
  'dynamo-db-table': 3,
  'redis-cluster': 4,
  'upstash-redis': 4,
  bucket: 4
};
const rankOf = (type: string) => RANK[type] ?? (type.endsWith('-web') ? 0 : 5);

/** "a Next.js site and a Postgres database", the app first; past four kinds the rest is a count. */
export const createdList = (resources: ConfigResources, state: Pick<WizardState, 'facts'>): string => {
  const services = (state.facts?.services ?? []) as readonly Service[];
  const counts = new Map<string, number>();
  const ordered = Object.entries(resources).toSorted(([, left], [, right]) => rankOf(left.type) - rankOf(right.type));
  for (const [name, resource] of ordered) {
    const part = partName(name, resource, services);
    counts.set(part, (counts.get(part) ?? 0) + 1);
  }
  const phrases = [...counts].map(([name, count]) => counted(name, count));
  const shown = phrases.length > 4 ? [...phrases.slice(0, 3), `${phrases.length - 3} more parts`] : phrases;
  return shown.length <= 1 ? (shown[0] ?? '') : `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)}`;
};
