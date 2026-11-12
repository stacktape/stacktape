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

/** A role group of functions or batch jobs is a deck of slabs in its members' colour, with their glyph on top. */
export const getNodeAppearance = (
  resourceType: string,
  { group = false }: { group?: boolean } = {}
): { shape: IsoNodeShape; glyph?: IsoNodeGlyph | undefined; category: IsoNodeCategory } => {
  const appearance = APPEARANCE[resourceType] ?? { shape: 'construct' };
  return {
    shape: group ? 'deck' : appearance.shape,
    glyph: appearance.glyph,
    // The visitor and anything the catalog does not place in an AWS category (a CDK construct) stay neutral.
    category: resourceType === 'user' ? 'neutral' : (getResourceVisual(resourceType)?.category ?? 'neutral')
  };
};

// ── Sizes the scene builder reserves room for and the renderer draws ──

/** How far each shape rises above its floor tile, in SVG units at zoom 1. */
export const SHAPE_HEIGHT_PX: Record<IsoNodeShape, number> = {
  function: 10,
  deck: 26,
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

/** A replica or count badge sits this far right of its node's centre. */
export const REPLICA_BADGE_SHIFT_PX = 34;

/**
 * The Access layer's tag: a 19 px pill whose centre sits a little higher above the shape than a badge would, so it
 * clears the shape's top face.
 */
export const ACCESS_TAG_HEIGHT_PX = 19;
export const ACCESS_TAG_RISE_PX = BADGE_OFFSET_PX + 9;
/** The icon and padding before a tag's text, and the padding after it. */
export const ACCESS_TAG_TEXT_START_PX = 21;
const ACCESS_TAG_TEXT_END_PX = 10;

/**
 * Character widths of the tag's 10.5 px bold Montserrat, measured in Chromium and rounded up a little, by class. A
 * fallback font is narrower, so the text always fits.
 */
const TAG_CHAR_WIDTHS: Array<[RegExp, number]> = [
  [/[ijl .,:]/, 3.3],
  [/[frt1I\-/]/, 4.9],
  [/[mwMW]/, 12.4],
  [/[bdghnpqu4A-DGHKN-RUVX]/, 8.6]
];
const TAG_CHAR_WIDTH = 7.1;

/** A tag's width for its text. */
export const getAccessTagWidthPx = (text: string) => {
  let width = ACCESS_TAG_TEXT_START_PX + ACCESS_TAG_TEXT_END_PX;
  for (const char of text) width += TAG_CHAR_WIDTHS.find(([chars]) => chars.test(char))?.[1] ?? TAG_CHAR_WIDTH;
  return width;
};

/** Name tags show at most this many characters of the name and of the muted type line. */
export const NAME_MAX_CHARS = 20;
export const TYPE_MAX_CHARS = 32;

/**
 * The name tag: the name in 12 px semibold and the muted type line in 10 px under it, as the renderer truncates them.
 * Measured in Chromium, names stay under 7.4 px per character and type lines under 5.6 px.
 */
const NAME_CHAR_PX = 7.4;
const TYPE_CHAR_PX = 5.6;

export const getNameTagWidthPx = ({ label, typeLabel }: { label: string; typeLabel?: string | undefined }) =>
  Math.max(
    Math.min(label.length, NAME_MAX_CHARS) * NAME_CHAR_PX,
    Math.min(typeLabel?.length ?? 0, TYPE_MAX_CHARS) * TYPE_CHAR_PX
  );

// ── Live status line ──
// A host that shows live status gets a pill under every declared resource's name tag: a tone icon and a few words in
// 10 px semibold. The layout reserves its room whether or not a resource reports anything, so statuses arriving or
// changing never move a node.

/** The pill's top sits this far below the front tip, under the type line; it is this tall. */
export const STATUS_PILL_TOP_PX = 36;
export const STATUS_PILL_HEIGHT_PX = 16;
/** What the status line adds to the name tag's height, halo included. */
export const STATUS_LINE_HEIGHT_PX = STATUS_PILL_TOP_PX + STATUS_PILL_HEIGHT_PX + 2 - 34;
/** 10 px semibold stays under 6 px per character; the icon, gap and padding take 26 px. */
export const STATUS_CHAR_PX = 6;
export const STATUS_PILL_CHROME_PX = 26;
/** Every pill has room for this many characters, and never more than the second number. */
const STATUS_MIN_CHARS = 17;
const STATUS_MAX_CHARS = 26;

/** The narrowest name tag that holds a status pill. */
export const STATUS_MIN_WIDTH_PX = STATUS_MIN_CHARS * STATUS_CHAR_PX + STATUS_PILL_CHROME_PX;

/** How much status text fits under a node: as wide as its name tag, and never narrower than `STATUS_MIN_WIDTH_PX`. */
export const getStatusTextBudget = (node: { label: string; typeLabel?: string | undefined }) =>
  Math.min(
    STATUS_MAX_CHARS,
    Math.floor((Math.max(getNameTagWidthPx(node), STATUS_MIN_WIDTH_PX) - STATUS_PILL_CHROME_PX) / STATUS_CHAR_PX)
  );

/**
 * Running and maximum copies, e.g. "2–6" tasks, or how many resources a group stands for. Database instances and NAT
 * gateways are drawn one by one instead.
 */
export const getReplicaBadgeText = ({
  shape,
  replicas,
  memberCount
}: Pick<IsoNode, 'shape' | 'replicas'> & { memberCount?: number | undefined }) => {
  if (memberCount) return String(memberCount);
  if (!replicas || shape === 'database' || shape === 'nat') return undefined;
  if (replicas.max > replicas.min) return `${replicas.min}–${replicas.max}`;
  return replicas.min > 1 ? `×${replicas.min}` : undefined;
};

/**
 * Whether a node carries a badge above its shape: a replica range, a group's count, the `public` mark or a load
 * balancer's exposure (Infrastructure layer only, but the layout keeps room for it in every picture so nothing moves).
 */
export const hasBadge = (
  node: Pick<IsoNode, 'shape' | 'replicas' | 'isPublic' | 'exposure'> & { memberCount?: number | undefined }
) => Boolean(node.isPublic || node.exposure || getReplicaBadgeText(node));

/** The badge text of a load balancer's exposure. */
export const EXPOSURE_BADGE_TEXT: Record<NonNullable<IsoNode['exposure']>, string> = {
  internal: 'internal',
  'internet-facing': 'internet-facing'
};
