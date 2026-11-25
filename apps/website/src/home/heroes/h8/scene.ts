/**
 * The h8 picture: the three layers Stacktape handles, as three stacked sheets. Bottom: the app's resources in the
 * visitor's AWS account. Middle: Stacktape packaging and deploying it. Top: the Console watching it. The projection is
 * the Console diagram's 2:1 isometric one. This file only places things; Hero.astro draws them.
 *
 * Sources: docs/configuration/secrets + directives (Secrets Manager), docs/ci-cd-and-gitops (`pr-<number>` preview
 * stages), docs/guardrails/overview, docs/observability (metrics, logs, error tracking, incidents, alert channels),
 * docs/managing-costs/budgets.
 */
import elasticache from './icons/AmazonElastiCache.svg?raw';
import cloudfront from './icons/AmazonCloudFront.svg?raw';
import rds from './icons/AmazonRDS.svg?raw';
import s3 from './icons/AmazonSimpleStorageService.svg?raw';
import fargate from './icons/AWSFargate.svg?raw';
import lambda from './icons/AWSLambda.svg?raw';

type Point = { x: number; y: number };

const TILE_W = 80;
const TILE_H = 40;
/** Sheet size in tiles, slab thickness and the height between two sheets, in screen units. */
const SHEET_X = 9.5;
const SHEET_Y = 7.1;
const SLAB = 9;
const GAP = 222;
/** The icons stand upright on the sheet, this many screen units tall, their bottom edge a little above it. */
const ICON = 46;
const FLOAT = 5;
/** Arrows run between the icons' middles, so they float this high above the sheet. */
const LIFT = FLOAT + ICON / 2;

const project = (x: number, y: number, z = 0): Point => ({
  x: (x - y) * (TILE_W / 2),
  y: -(x + y) * (TILE_H / 2) - z
});
const round = (value: number) => Math.round(value * 10) / 10;
const points = (...list: Point[]) => list.map((point) => `${round(point.x)},${round(point.y)}`).join(' ');

/**
 * The same seven spots on every sheet, far enough apart that a label under one icon never runs into the next. The
 * outside spot stands off the sheet's left edge, for whoever talks to that layer.
 */
const SPOTS = {
  outside: { x: -1.85, y: 3.75 },
  back: { x: 2.45, y: 6.3 },
  left: { x: 2.45, y: 3.75 },
  middle: { x: 5.25, y: 3.75 },
  right: { x: 8.05, y: 3.75 },
  front: { x: 5.25, y: 1.15 },
  frontRight: { x: 8.05, y: 1.15 }
};
type Spot = keyof typeof SPOTS;

/** Stacktape's own things are drawn as tiles the size of an AWS icon: a line glyph on teal or graphite. */
const GLYPHS = {
  person: 'M32 30a7 7 0 1 0 0-14 7 7 0 0 0 0 14M18 48c0-8 6.3-13 14-13s14 5 14 13',
  repo: 'M23 18v28M23 18a4 4 0 1 0 0-.1M23 46a4 4 0 1 0 0-.1M41 22a4 4 0 1 0 0-.1M41 26c0 9-18 7-18 16',
  box: 'M32 14 49 22.5v19L32 50l-17-8.5v-19zM15 22.5 32 31l17-8.5M32 31v19M23.5 18.3 40.5 26.8',
  deploy: 'M32 40V16M22 26l10-10 10 10M17 38v9h30v-9',
  preview:
    'M22 18v28M22 18a4 4 0 1 0 0-.1M22 46a4 4 0 1 0 0-.1M42 46a4 4 0 1 0 0-.1M42 42V27a5 5 0 0 0-5-5h-8M33 17l-5 5 5 5',
  key: 'M25 39a7 7 0 1 0 0-14 7 7 0 0 0 0 14M32 32h17M43 32v6M49 32v5',
  shield: 'M32 14 47 20v11c0 10-6.5 16-15 19-8.5-3-15-9-15-19V20zM25.5 32l5 5 9-10',
  chart: 'M16 16v32h32M22 40l8-10 7 6 11-14',
  warning: 'M29 17.5a3.5 3.5 0 0 1 6 0l14.5 25.5a3.5 3.5 0 0 1-3 5.2h-29a3.5 3.5 0 0 1-3-5.2zM32 28v8.5M32 42.5v.2',
  bell: 'M20 41h24c-2.5-2.5-4-5.5-4-11v-3a8 8 0 0 0-16 0v3c0 5.5-1.5 8.5-4 11M28.5 46a4 4 0 0 0 7 0',
  dollar:
    'M40 22.5c-1.8-2.2-4.6-3.5-8-3.5-4.7 0-8 2.5-8 6.2 0 8.6 17 5 17 13.6 0 3.9-3.6 6.7-9 6.7-3.6 0-6.8-1.4-8.8-3.8M32 14v5M32 45.5v4.5'
};
type Glyph = keyof typeof GLYPHS;
type Tone = 'teal' | 'graphite' | 'plain';

const AWS_ICONS = { cloudfront, s3, fargate, lambda, rds, elasticache };
type AwsIcon = keyof typeof AWS_ICONS;

type Item = { spot: Spot; name: string; role?: string; short?: string } & (
  | { aws: AwsIcon }
  | { glyph: Glyph; tone: Tone }
);

type Layer = {
  id: string;
  label: string;
  caption: string;
  items: Record<string, Item>;
  /** Requests and data, along the sheet's grid lines. */
  flows: [string, string][];
};

/** Bottom to top. */
const LAYERS: Layer[] = [
  {
    id: 'aws',
    label: 'Your AWS account',
    caption: 'Runs your app. Every resource is yours.',
    items: {
      users: { spot: 'outside', name: 'Your users', short: 'Users', glyph: 'person', tone: 'plain' },
      cdn: { spot: 'left', name: 'CloudFront', role: 'CDN', aws: 'cloudfront' },
      files: { spot: 'back', name: 'S3', role: 'website files', aws: 's3' },
      api: { spot: 'middle', name: 'ECS Fargate', short: 'Fargate', role: 'API', aws: 'fargate' },
      db: { spot: 'right', name: 'RDS Postgres', short: 'Postgres', role: 'database', aws: 'rds' },
      cache: { spot: 'front', name: 'Redis', role: 'cache', aws: 'elasticache' },
      jobs: { spot: 'frontRight', name: 'Lambda', role: 'scheduled jobs', aws: 'lambda' }
    },
    flows: [
      ['users', 'cdn'],
      ['cdn', 'files'],
      ['cdn', 'api'],
      ['api', 'db'],
      ['api', 'cache'],
      ['jobs', 'db']
    ]
  },
  {
    id: 'stacktape',
    label: 'Stacktape',
    caption: 'Packages your code and deploys it to your AWS account.',
    items: {
      repo: { spot: 'outside', name: 'Your repo', short: 'Repo', glyph: 'repo', tone: 'plain' },
      packaging: { spot: 'left', name: 'Packaging', role: 'zips and images', glyph: 'box', tone: 'teal' },
      deploys: { spot: 'middle', name: 'Deploys', role: 'CloudFormation', glyph: 'deploy', tone: 'teal' },
      previews: { spot: 'right', name: 'PR previews', role: 'a stage per PR', glyph: 'preview', tone: 'teal' },
      secrets: { spot: 'front', name: 'Secrets', role: 'Secrets Manager', glyph: 'key', tone: 'teal' },
      guardrails: { spot: 'frontRight', name: 'Guardrails', role: 'org-wide rules', glyph: 'shield', tone: 'teal' }
    },
    flows: [
      ['repo', 'packaging'],
      ['packaging', 'deploys']
    ]
  },
  {
    id: 'console',
    label: 'Console',
    caption: 'Watches what runs and tells you when something needs a decision.',
    items: {
      you: { spot: 'outside', name: 'You', glyph: 'person', tone: 'plain' },
      alerts: { spot: 'left', name: 'Alerts', role: 'Slack, email', glyph: 'bell', tone: 'graphite' },
      incidents: { spot: 'middle', name: 'Incidents', role: 'errors, outages', glyph: 'warning', tone: 'graphite' },
      monitoring: {
        spot: 'right',
        name: 'Monitoring',
        role: 'metrics, logs, traces',
        glyph: 'chart',
        tone: 'graphite'
      },
      costs: { spot: 'front', name: 'Costs', role: 'budgets', glyph: 'dollar', tone: 'graphite' }
    },
    flows: [
      ['monitoring', 'incidents'],
      ['incidents', 'alerts'],
      ['alerts', 'you']
    ]
  }
];

const TONES: Record<Tone, { tile: string; ink: string }> = {
  teal: { tile: '#1a827e', ink: '#ffffff' },
  graphite: { tile: '#2b3434', ink: '#36bebe' },
  plain: { tile: '#3a4444', ink: '#ffffff' }
};

const glyphSymbol = (glyph: Glyph, tone: Tone) => {
  const { tile, ink } = TONES[tone];
  return `<symbol id="h8-glyph-${glyph}-${tone}" viewBox="0 0 64 64"><rect width="64" height="64" fill="${tile}"/><path d="${GLYPHS[glyph]}" fill="none" stroke="${ink}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>`;
};

const awsSymbol = (id: AwsIcon) =>
  AWS_ICONS[id]
    .replace(/<title>.*?<\/title>/, '')
    .replace(/^<svg[^>]*viewBox="([^"]+)"[^>]*>/, `<symbol id="h8-aws-${id}" viewBox="$1">`)
    .replace(/<\/svg>\s*$/, '</symbol>');

const symbolOf = (item: Item) => ('aws' in item ? `h8-aws-${item.aws}` : `h8-glyph-${item.glyph}-${item.tone}`);

/** Every icon once, as a symbol the sheets reuse. */
export const symbols = [
  ...new Set(
    LAYERS.flatMap((layer) => Object.values(layer.items)).map((item) =>
      'aws' in item ? awsSymbol(item.aws) : glyphSymbol(item.glyph, item.tone)
    )
  )
].join('');

/** The layer captions are HTML right of the picture, so the box ends at the sheets' right corner. */
const left = project(0, SHEET_Y).x - 4;
const right = project(SHEET_X, 0).x + 4;
const top = project(SHEET_X, SHEET_Y, GAP * (LAYERS.length - 1)).y - 8;
const bottom = project(0, 0).y + SLAB + 4;

export const viewBox = { x: left, y: top, width: right - left, height: bottom - top };
const percent = (point: Point) => ({
  left: round(((point.x - left) / viewBox.width) * 1000) / 10,
  top: round(((point.y - top) / viewBox.height) * 1000) / 10
});

/** The flow line between two icons stops short of both; the arrowhead ends it. */
const flowPath = (from: Item, to: Item, z: number) => {
  const a = SPOTS[from.spot];
  const b = SPOTS[to.spot];
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / length;
  const uy = (b.y - a.y) / length;
  const start = project(a.x + ux * 0.72, a.y + uy * 0.72, z + LIFT);
  const end = project(b.x - ux * 0.86, b.y - uy * 0.86, z + LIFT);
  return `M${round(start.x)} ${round(start.y)}L${round(end.x)} ${round(end.y)}`;
};

/** The icon stands on its spot: a flat isometric pad on the sheet, the icon upright above it. */
const placeItem = (id: string, item: Item, z: number) => {
  const spot = SPOTS[item.spot];
  const foot = project(spot.x, spot.y, z);
  const onSheet = item.spot !== 'outside';
  const pad = 0.46;
  return {
    id,
    href: `#${symbolOf(item)}`,
    name: item.name,
    /** Phones show the drawing small, so the label there is one short word. */
    short: item.short ?? item.name,
    role: item.role,
    pad:
      onSheet &&
      points(
        project(spot.x - pad, spot.y - pad, z),
        project(spot.x + pad, spot.y - pad, z),
        project(spot.x + pad, spot.y + pad, z),
        project(spot.x - pad, spot.y + pad, z)
      ),
    icon: { x: round(foot.x - ICON / 2), y: round(foot.y - ICON - FLOAT), size: ICON },
    /** Centred under the icon, below its pad, where no arrow passes. Off the sheet the label goes above. */
    label: { x: round(foot.x), y: round(onSheet ? foot.y + 16 : foot.y - ICON - FLOAT - 10) }
  };
};

const depth = (item: Item) => SPOTS[item.spot].x + SPOTS[item.spot].y;

export const sheets = LAYERS.map((layer, index) => {
  const z = index * GAP;
  const corner = (x: number, y: number, dz = 0) => project(x, y, z + dz);
  return {
    id: layer.id,
    index,
    label: layer.label,
    caption: layer.caption,
    top: points(corner(0, 0), corner(SHEET_X, 0), corner(SHEET_X, SHEET_Y), corner(0, SHEET_Y)),
    sideLeft: points(corner(0, SHEET_Y), corner(0, 0), corner(0, 0, -SLAB), corner(0, SHEET_Y, -SLAB)),
    sideRight: points(corner(0, 0), corner(SHEET_X, 0), corner(SHEET_X, 0, -SLAB), corner(0, 0, -SLAB)),
    edge: points(corner(0, SHEET_Y), corner(0, 0), corner(SHEET_X, 0)),
    flows: layer.flows.map(([from, to]) => flowPath(layer.items[from], layer.items[to], z)),
    /** Painter's order inside a sheet: far icons first. */
    items: Object.entries(layer.items)
      .toSorted(([, a], [, b]) => depth(b) - depth(a))
      .map(([id, item]) => placeItem(id, item, z)),
    /** The layer's tape label and caption sit right of the sheet's right corner. */
    at: percent(corner(SHEET_X, 0, -SLAB / 2))
  };
});
