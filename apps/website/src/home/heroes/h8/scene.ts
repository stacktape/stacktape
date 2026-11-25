/**
 * The h8 picture: one app's AWS resources, deployed three times as three stacked stage sheets. The projection is the
 * Console diagram's 2:1 isometric one. This file only places things; Hero.astro draws them.
 */
import cloudfront from './icons/AmazonCloudFront.svg?raw';
import rds from './icons/AmazonRDS.svg?raw';
import sqs from './icons/AmazonSimpleQueueService.svg?raw';
import s3 from './icons/AmazonSimpleStorageService.svg?raw';
import fargate from './icons/AWSFargate.svg?raw';
import lambda from './icons/AWSLambda.svg?raw';

type Point = { x: number; y: number };
type NodeId = 'users' | 'cdn' | 'files' | 'api' | 'db' | 'queue' | 'worker';
type IconId = Exclude<NodeId, 'users'>;

const TILE_W = 80;
const TILE_H = 40;
/** Sheet size in tiles, slab thickness and the height between two sheets, in screen units. */
const SHEET_X = 9.5;
const SHEET_Y = 7.1;
const SLAB = 9;
const GAP = 214;
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

/** Where each resource stands on a sheet, in tiles, and what it is called. */
const NODES: Record<NodeId, { x: number; y: number; name: string; role: string }> = {
  users: { x: -1.3, y: 3.75, name: 'Your users', role: '' },
  cdn: { x: 2.45, y: 3.75, name: 'CloudFront', role: 'CDN' },
  files: { x: 2.45, y: 6.3, name: 'S3', role: 'website files' },
  api: { x: 5.25, y: 3.75, name: 'ECS Fargate', role: 'API' },
  db: { x: 8.05, y: 3.75, name: 'RDS Postgres', role: 'database' },
  queue: { x: 5.25, y: 1.15, name: 'SQS', role: 'job queue' },
  worker: { x: 8.05, y: 1.15, name: 'Lambda', role: 'worker' }
};

/** Requests and data, along the sheet's grid lines. */
const FLOWS: [NodeId, NodeId][] = [
  ['users', 'cdn'],
  ['cdn', 'files'],
  ['cdn', 'api'],
  ['api', 'db'],
  ['api', 'queue'],
  ['queue', 'worker'],
  ['worker', 'db']
];

const ICONS: Record<IconId, string> = { cdn: cloudfront, files: s3, api: fargate, db: rds, queue: sqs, worker: lambda };

/** Each AWS icon becomes a symbol, so the three sheets reuse one copy of its markup. */
export const symbols = Object.entries(ICONS)
  .map(([id, markup]) =>
    markup
      .replace(/<title>.*?<\/title>/, '')
      .replace(/^<svg[^>]*viewBox="([^"]+)"[^>]*>/, `<symbol id="h8-icon-${id}" viewBox="$1">`)
      .replace(/<\/svg>\s*$/, '</symbol>')
  )
  .join('');

type Stage = { id: string; label: string; caption: string; live: boolean };

/** Bottom to top. Facts: docs/ci-cd-and-gitops/gitops-with-console.mdx (push to branch, `pr-<number>` previews). */
const STAGES: Stage[] = [
  { id: 'dev', label: 'dev', caption: 'Deployed from your laptop', live: false },
  { id: 'preview', label: 'pr-142', caption: 'Preview of pull request #142', live: false },
  { id: 'production', label: 'production', caption: 'Deploys on every push to main', live: true }
];

/** The stage captions are HTML right of the picture, so the box ends at the sheets' right corner. */
const left = project(0, SHEET_Y).x - 4;
const right = project(SHEET_X, 0).x + 4;
const top = project(SHEET_X, SHEET_Y, GAP * (STAGES.length - 1)).y - 8;
const bottom = project(0, 0).y + SLAB + 4;

export const viewBox = { x: left, y: top, width: right - left, height: bottom - top };
const percent = (point: Point) => ({
  left: round(((point.x - left) / viewBox.width) * 1000) / 10,
  top: round(((point.y - top) / viewBox.height) * 1000) / 10
});

/** The flow line between two resources stops short of both icons; the arrowhead ends it. */
const flowPath = (from: NodeId, to: NodeId, z: number) => {
  const a = NODES[from];
  const b = NODES[to];
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / length;
  const uy = (b.y - a.y) / length;
  const start = project(a.x + ux * 0.72, a.y + uy * 0.72, z + LIFT);
  const end = project(b.x - ux * 0.86, b.y - uy * 0.86, z + LIFT);
  return `M${round(start.x)} ${round(start.y)}L${round(end.x)} ${round(end.y)}`;
};

/** The icon's square stands on its spot: a flat isometric pad on the sheet, the icon upright above it. */
const placeNode = (id: NodeId, z: number) => {
  const node = NODES[id];
  const onSheet = node.x >= 0 && node.y >= 0;
  const foot = project(node.x, node.y, z);
  const pad = 0.46;
  return {
    id,
    name: node.name,
    role: node.role,
    pad:
      onSheet &&
      points(
        project(node.x - pad, node.y - pad, z),
        project(node.x + pad, node.y - pad, z),
        project(node.x + pad, node.y + pad, z),
        project(node.x - pad, node.y + pad, z)
      ),
    icon: { x: round(foot.x - ICON / 2), y: round(foot.y - ICON - FLOAT), size: ICON },
    /** Centred under the icon, below its pad, where no arrow passes. Your users stand off the sheet, so theirs is above. */
    label: { x: round(foot.x), y: round(onSheet ? foot.y + 16 : foot.y - ICON - FLOAT - 10) }
  };
};

/** Painter's order inside a sheet: far resources first. */
const DEPTH_ORDER = (Object.keys(NODES) as NodeId[]).toSorted(
  (a, b) => NODES[b].x + NODES[b].y - (NODES[a].x + NODES[a].y)
);

export const sheets = STAGES.map((stage, index) => {
  const z = index * GAP;
  const corner = (x: number, y: number, dz = 0) => project(x, y, z + dz);
  const onTop = index === STAGES.length - 1;
  return {
    ...stage,
    onTop,
    top: points(corner(0, 0), corner(SHEET_X, 0), corner(SHEET_X, SHEET_Y), corner(0, SHEET_Y)),
    sideLeft: points(corner(0, SHEET_Y), corner(0, 0), corner(0, 0, -SLAB), corner(0, SHEET_Y, -SLAB)),
    sideRight: points(corner(0, 0), corner(SHEET_X, 0), corner(SHEET_X, 0, -SLAB), corner(0, 0, -SLAB)),
    edge: points(corner(0, SHEET_Y), corner(0, 0), corner(SHEET_X, 0)),
    flows: FLOWS.filter(([from]) => onTop || from !== 'users').map(([from, to]) => flowPath(from, to, z)),
    nodes: DEPTH_ORDER.filter((id) => onTop || id !== 'users').map((id) => placeNode(id, z)),
    /** The stage's tape label and caption sit right of the sheet's right corner. */
    at: percent(corner(SHEET_X, 0, -SLAB / 2))
  };
});

/** "Your AWS account" sits centred above the top sheet's far corner. */
export const crown = percent(project(SHEET_X, SHEET_Y, GAP * (STAGES.length - 1)));
