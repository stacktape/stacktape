import type { IsoNode, IsoNodeCategory, IsoNodeGlyph, IsoNodeShape } from './scene.js';
import { getResourceVisual } from '../resource-icon/catalog.js';

type Appearance = { shape: IsoNodeShape; glyph?: IsoNodeGlyph };

const SSR_WEB_TYPES = [
  'nextjs-web',
  'astro-web',
  'nuxt-web',
  'sveltekit-web',
  'solidstart-web',
  'tanstack-web',
  'remix-web'
];

/**
 * Which silhouette each resource type is drawn as. The silhouette carries the kind of resource; the colour, from the
 * shared resource catalog, carries its AWS category. A glyph is added only where one silhouette serves several types.
 */
const APPEARANCE: Record<string, Appearance> = {
  function: { shape: 'function', glyph: 'lambda' },
  'deployment-script': { shape: 'function', glyph: 'lambda' },
  'custom-resource-definition': { shape: 'function', glyph: 'lambda' },
  'edge-lambda-function': { shape: 'function', glyph: 'lambda' },
  'web-service': { shape: 'container' },
  'private-service': { shape: 'container' },
  'worker-service': { shape: 'container' },
  'multi-container-workload': { shape: 'container' },
  convex: { shape: 'container' },
  'batch-job': { shape: 'batch' },
  bastion: { shape: 'server' },
  'agentcore-runtime': { shape: 'agent', glyph: 'spark' },
  'agentcore-browser': { shape: 'tool', glyph: 'browser' },
  'agentcore-code-interpreter': { shape: 'tool', glyph: 'code' },
  'aws-cdk-construct': { shape: 'construct' },
  'relational-database': { shape: 'database' },
  'dsql-database': { shape: 'database' },
  'mongo-db-atlas-cluster': { shape: 'database', glyph: 'leaf' },
  'dynamo-db-table': { shape: 'key-value', glyph: 'table' },
  redis: { shape: 'cache', glyph: 'bolt' },
  'upstash-redis': { shape: 'cache', glyph: 'bolt' },
  'agentcore-memory': { shape: 'cache', glyph: 'memory' },
  'open-search-domain': { shape: 'search', glyph: 'search' },
  'sqs-queue': { shape: 'queue' },
  'sns-topic': { shape: 'topic' },
  'event-bus': { shape: 'topic' },
  'kinesis-stream': { shape: 'stream' },
  'kafka-cluster': { shape: 'stream' },
  'state-machine': { shape: 'workflow', glyph: 'flow' },
  schedule: { shape: 'schedule' },
  'email-sender': { shape: 'email' },
  bucket: { shape: 'bucket' },
  'efs-filesystem': { shape: 'filesystem' },
  'http-api-gateway': { shape: 'api' },
  'websocket-api-gateway': { shape: 'api', glyph: 'websocket' },
  'appsync-api': { shape: 'api', glyph: 'graphql' },
  'agentcore-gateway': { shape: 'api', glyph: 'mcp' },
  'application-load-balancer': { shape: 'load-balancer' },
  'network-load-balancer': { shape: 'load-balancer' },
  'nat-gateway': { shape: 'nat' },
  cloudfront: { shape: 'cdn' },
  'hosting-bucket': { shape: 'cdn' },
  ...Object.fromEntries(SSR_WEB_TYPES.map((type) => [type, { shape: 'cdn' } satisfies Appearance])),
  'web-app-firewall': { shape: 'firewall' },
  'user-auth-pool': { shape: 'user-pool', glyph: 'person' },
  user: { shape: 'user' }
};

export const getNodeAppearance = (
  resourceType: string
): { shape: IsoNodeShape; glyph?: IsoNodeGlyph | undefined; category: IsoNodeCategory } => {
  const appearance = APPEARANCE[resourceType] ?? { shape: 'construct' };
  return {
    shape: appearance.shape,
    glyph: appearance.glyph,
    // The visitor and anything the catalog does not place in an AWS category (a CDK construct) stay neutral.
    category: resourceType === 'user' ? 'neutral' : (getResourceVisual(resourceType)?.category ?? 'neutral')
  };
};

// ── Sizes the scene builder reserves room for and the renderer draws ──

/** How far each shape rises above its floor tile, in SVG units at zoom 1. */
export const SHAPE_HEIGHT_PX: Record<IsoNodeShape, number> = {
  function: 10,
  container: 29,
  batch: 22,
  server: 32,
  agent: 20,
  tool: 13,
  construct: 26,
  database: 38,
  'key-value': 20,
  cache: 24,
  search: 30,
  queue: 20,
  topic: 10,
  stream: 12,
  workflow: 11,
  schedule: 8,
  email: 9,
  bucket: 30,
  filesystem: 19,
  api: 38,
  'load-balancer': 10,
  cdn: 31,
  nat: 12,
  firewall: 30,
  'user-pool': 15,
  user: 44
};

/** A badge's centre sits this far above the top of its shape; the 17 px pill reaches 8.5 px higher. */
export const BADGE_OFFSET_PX = 10;
export const BADGE_HEIGHT_PX = 17;

/** Name tags show at most this many characters of the name and of the muted type line. */
export const NAME_MAX_CHARS = 20;
export const TYPE_MAX_CHARS = 32;

/** Running and maximum copies, e.g. "2–6" tasks. Database instances and NAT gateways are drawn one by one instead. */
export const getReplicaBadgeText = ({ shape, replicas }: Pick<IsoNode, 'shape' | 'replicas'>) => {
  if (!replicas || shape === 'database' || shape === 'nat') return undefined;
  if (replicas.max > replicas.min) return `${replicas.min}–${replicas.max}`;
  return replicas.min > 1 ? `×${replicas.min}` : undefined;
};

/** Whether a node carries a badge above its shape: a replica range or the `public` mark. */
export const hasBadge = (node: Pick<IsoNode, 'shape' | 'replicas' | 'isPublic'>) =>
  Boolean(node.isPublic || getReplicaBadgeText(node));
