/**
 * Layout: semantic topology → `IsoScene`.
 *
 * This stage assigns layers and tile coordinates, builds compound boundaries and routes connectors.
 * It reads the topology and writes a scene; it never touches SVG coordinates, interaction state or
 * the configuration it came from. `buildIsometricScene` is pure — the caller's parsed config is only
 * ever read.
 */
import type { StacktapeConfig } from '@stacktape/config';
import type {
  IsoConnector,
  IsoConnectorRoute,
  IsoLabel,
  IsoNode,
  IsoRectangle,
  IsoScene,
  IsoTilePoint,
  PedestalType
} from './scene.js';
import type { DiagramTopology, EdgeSemantic, FlowLayer, TopologyEdge, TopologyNode } from './topology.js';
import { getResourceIconUrl } from './icons.js';
import { RESOURCE_EXPLANATIONS, ZONE_EXPLANATIONS } from './resource-explanations.js';
import { buildDiagramTopology } from './topology.js';

type LayoutPlacement = {
  x: number;
  y: number;
};

type RoutedEdge = {
  edge: TopologyEdge;
  route: IsoConnectorRoute;
};

type RouteCandidate = {
  route: IsoConnectorRoute;
  elbowAtTargetColumn: boolean;
  kind: 'direct' | 'target-elbow' | 'source-elbow' | 'detour';
};

type RouteKeepout = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  ownerId?: string;
};

const CONNECTOR_LANE_STEP = 0.7;
const DETOUR_ROUTE_GAP = 1.8;
// Connector labels render as horizontal chips centered on the route, so no perpendicular offset.
const ROUTE_LABEL_OFFSET = 0;
const LAYOUT_ITERATIONS = 4;

const getLaneStep = ({ count }: { count: number }) => {
  if (count >= 6) return CONNECTOR_LANE_STEP * 0.62;
  if (count >= 4) return CONNECTOR_LANE_STEP * 0.76;
  return CONNECTOR_LANE_STEP;
};

// ── Color / pedestal maps (unchanged rendering config) ──
// The icon table lives in `icons.ts` with the isopack data it indexes.

// Body colours follow AWS's own service-category palette, which is deliberately not the semantic
// `awsCategory` token set: these are literal values because the renderer shades them arithmetically
// to build the pedestal faces, so they cannot be CSS variable references.
const BLOCK_COLORS: Record<string, string> = {
  function: '#FF9900',
  'web-service': '#FF9900',
  'private-service': '#FF9900',
  'worker-service': '#FF9900',
  'multi-container-workload': '#FF9900',
  'batch-job': '#FF9900',
  'deployment-script': '#FF9900',
  bastion: '#FF9900',
  'state-machine': '#FF4F8B',
  'http-api-gateway': '#FF4F8B',
  'sqs-queue': '#FF4F8B',
  'sns-topic': '#FF4F8B',
  'event-bus': '#FF4F8B',
  'relational-database': '#527FFF',
  'dynamo-db-table': '#527FFF',
  'redis-cluster': '#527FFF',
  'mongo-db-atlas-cluster': '#527FFF',
  'upstash-redis': '#527FFF',
  'open-search-domain': '#A166FF',
  'application-load-balancer': '#A166FF',
  'network-load-balancer': '#A166FF',
  'kinesis-stream': '#A166FF',
  'nextjs-web': '#A166FF',
  'astro-web': '#A166FF',
  'nuxt-web': '#A166FF',
  'sveltekit-web': '#A166FF',
  'solidstart-web': '#A166FF',
  'tanstack-web': '#A166FF',
  'remix-web': '#A166FF',
  'edge-lambda-function': '#A166FF',
  'nat-gateway': '#A166FF',
  cloudfront: '#A166FF',
  schedule: '#FF4F8B',
  'hosting-bucket': '#A166FF',
  bucket: '#6CAE3E',
  'efs-filesystem': '#6CAE3E',
  'user-auth-pool': '#FF5252',
  'web-app-firewall': '#FF5252',
  user: '#cbd5e1'
};

const PEDESTAL_MAP: Record<string, PedestalType> = {
  'relational-database': 'database',
  'dynamo-db-table': 'database',
  'redis-cluster': 'database',
  'mongo-db-atlas-cluster': 'database',
  'upstash-redis': 'database',
  'open-search-domain': 'database',
  function: 'compute',
  'web-service': 'compute',
  'private-service': 'compute',
  'worker-service': 'compute',
  'multi-container-workload': 'compute',
  'batch-job': 'compute',
  'deployment-script': 'compute',
  'state-machine': 'compute',
  'http-api-gateway': 'gateway',
  'application-load-balancer': 'gateway',
  'network-load-balancer': 'gateway',
  'nat-gateway': 'gateway',
  cloudfront: 'gateway',
  'sqs-queue': 'messaging',
  'sns-topic': 'messaging',
  'event-bus': 'messaging',
  'kinesis-stream': 'messaging',
  schedule: 'messaging',
  bucket: 'storage',
  'hosting-bucket': 'storage',
  'efs-filesystem': 'storage',
  'user-auth-pool': 'auth',
  'web-app-firewall': 'auth',
  'nextjs-web': 'gateway',
  'astro-web': 'gateway',
  'nuxt-web': 'gateway',
  'sveltekit-web': 'gateway',
  'solidstart-web': 'gateway',
  'tanstack-web': 'gateway',
  'remix-web': 'gateway',
  user: 'user'
};

// Plain-English explanations shown in the hover tooltip so users without infra
// ── Layout constants ──

const LAYER_SPACING = 4.0; // spacing between layers along the flow axis (isometric X)
const ROW_SPACING = 2.8; // spacing between rows within a layer (isometric Y, perpendicular)
const SUBNET_GAP = 1.2;
const CONTAINER_EXPAND = 1.3;
const VPC_RECT_EXTRA_X = 0.8;
const VPC_RECT_EXTRA_Y = 0.5;
const MAX_EXTRA_LAYER_SPACING = 2.4;

// Edge semantic weights for crossing minimization (higher = more important to keep uncrossed)
const EDGE_WEIGHT: Record<EdgeSemantic, number> = {
  request: 3,
  event: 2,
  dependency: 1,
  egress: 0.5
};

// ── Helpers ──

const getBlockColor = (type: string) => BLOCK_COLORS[type] || '#e6e7e8';
const getPedestal = (type: string) => PEDESTAL_MAP[type] || 'default';

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const groupBy = <T, K extends string>({ items, getKey }: { items: T[]; getKey: (item: T) => K }) => {
  const grouped = new Map<K, T[]>();
  for (const item of items) {
    const key = getKey(item);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(item);
  }
  return grouped;
};

const getPlacementBounds = ({ placements }: { placements: LayoutPlacement[] }) => {
  if (placements.length === 0) return null;

  return {
    minX: Math.min(...placements.map((placement) => placement.x)),
    maxX: Math.max(...placements.map((placement) => placement.x)),
    minY: Math.min(...placements.map((placement) => placement.y)),
    maxY: Math.max(...placements.map((placement) => placement.y))
  };
};

const midpoint = ({ a, b }: { a: IsoTilePoint; b: IsoTilePoint }): IsoTilePoint => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2
});

const getLaneOffset = ({ index, count }: { index: number; count: number }) =>
  (index - (count - 1) / 2) * getLaneStep({ count });

const normalizeRoutePoints = ({ points }: { points: IsoTilePoint[] }) => {
  const deduped = points.filter((point, index) => {
    const previous = points[index - 1];
    return !previous || previous.x !== point.x || previous.y !== point.y;
  });

  return deduped.filter((point, index) => {
    if (index === 0 || index === deduped.length - 1) return true;
    const previous = deduped[index - 1];
    const next = deduped[index + 1];
    const sameX = previous.x === point.x && point.x === next.x;
    const sameY = previous.y === point.y && point.y === next.y;
    return !sameX && !sameY;
  });
};

const rangesOverlap = ({ minA, maxA, minB, maxB }: { minA: number; maxA: number; minB: number; maxB: number }) =>
  !(maxA < minB || maxB < minA);

const buildRouteKeepouts = ({
  rectangles,
  labels,
  sceneNodes
}: {
  rectangles: IsoRectangle[];
  labels: IsoLabel[];
  sceneNodes: IsoNode[];
}): RouteKeepout[] => {
  const rectangleBands = rectangles.map((rectangle) => ({
    minX: rectangle.from.x,
    maxX: rectangle.to.x,
    minY: rectangle.to.y - 0.25,
    maxY: rectangle.to.y + 0.95
  }));

  const labelBands = labels.map((label) => {
    // Zone tags hang just below the zone's front tip; approximate their screen box
    // with a small square around the anchor in tile space.
    const halfExtent = Math.max(0.8, label.text.length * 0.09);
    return {
      minX: label.tile.x - halfExtent,
      maxX: label.tile.x + halfExtent,
      minY: label.tile.y - halfExtent,
      maxY: label.tile.y + halfExtent
    };
  });

  const nodeBands = sceneNodes.map((node) => ({
    minX: node.tile.x - 1.15,
    maxX: node.tile.x + 1.15,
    minY: node.tile.y - 1.1,
    maxY: node.tile.y + 1.1,
    ownerId: node.id
  }));

  return [...rectangleBands, ...labelBands, ...nodeBands];
};

const shouldUseKeepout = ({
  keepout,
  ignoredKeepoutOwnerIds
}: {
  keepout: RouteKeepout;
  ignoredKeepoutOwnerIds?: string[] | undefined;
}) => !keepout.ownerId || !ignoredKeepoutOwnerIds?.includes(keepout.ownerId);

const adjustHorizontalLane = ({
  fromX,
  toX,
  baseY,
  keepouts,
  ignoredKeepoutOwnerIds
}: {
  fromX: number;
  toX: number;
  baseY: number;
  keepouts: RouteKeepout[];
  ignoredKeepoutOwnerIds?: string[] | undefined;
}) => {
  const minX = Math.min(fromX, toX);
  const maxX = Math.max(fromX, toX);
  const candidates = [0, -1, 1, -2, 2, -3, 3].map((step) => baseY + step * CONNECTOR_LANE_STEP);

  for (const candidateY of candidates) {
    const blocked = keepouts.some((keepout) => {
      if (!shouldUseKeepout({ keepout, ignoredKeepoutOwnerIds })) return false;
      if (!rangesOverlap({ minA: minX, maxA: maxX, minB: keepout.minX, maxB: keepout.maxX })) return false;
      return candidateY >= keepout.minY && candidateY <= keepout.maxY;
    });

    if (!blocked) return candidateY;
  }

  return baseY;
};

const adjustVerticalLane = ({
  fromY,
  toY,
  baseX,
  keepouts,
  ignoredKeepoutOwnerIds
}: {
  fromY: number;
  toY: number;
  baseX: number;
  keepouts: RouteKeepout[];
  ignoredKeepoutOwnerIds?: string[] | undefined;
}) => {
  const minY = Math.min(fromY, toY);
  const maxY = Math.max(fromY, toY);
  const candidates = [0, -1, 1, -2, 2].map((step) => baseX + step * CONNECTOR_LANE_STEP);

  for (const candidateX of candidates) {
    const blocked = keepouts.some((keepout) => {
      if (!shouldUseKeepout({ keepout, ignoredKeepoutOwnerIds })) return false;
      if (!rangesOverlap({ minA: minY, maxA: maxY, minB: keepout.minY, maxB: keepout.maxY })) return false;
      return candidateX >= keepout.minX && candidateX <= keepout.maxX;
    });

    if (!blocked) return candidateX;
  }

  return baseX;
};

const estimateLabelWidthTiles = ({ text }: { text?: string | undefined }) => Math.max(1.2, (text?.length || 0) * 0.34);

const getLabelKeepoutPenalty = ({
  point,
  text,
  keepouts,
  routedLabelTiles
}: {
  point: IsoTilePoint;
  text?: string | undefined;
  keepouts: RouteKeepout[];
  routedLabelTiles: IsoTilePoint[];
}) => {
  const width = estimateLabelWidthTiles({ text });
  const labelBox = {
    minX: point.x - width / 2,
    maxX: point.x + width / 2,
    minY: point.y - 0.55,
    maxY: point.y + 0.4
  };
  const keepoutHits = keepouts.filter((keepout) => {
    return (
      rangesOverlap({ minA: labelBox.minX, maxA: labelBox.maxX, minB: keepout.minX, maxB: keepout.maxX }) &&
      rangesOverlap({ minA: labelBox.minY, maxA: labelBox.maxY, minB: keepout.minY, maxB: keepout.maxY })
    );
  }).length;
  const routedLabelHits = routedLabelTiles.filter(
    (tile) => Math.abs(tile.x - point.x) < 1.4 && Math.abs(tile.y - point.y) < 1.1
  ).length;

  return keepoutHits * 18 + routedLabelHits * 12;
};

const getRouteLabelTile = ({
  points,
  text,
  keepouts,
  routedLabelTiles
}: {
  points: IsoTilePoint[];
  text?: string | undefined;
  keepouts: RouteKeepout[];
  routedLabelTiles: IsoTilePoint[];
}) => {
  if (points.length <= 1) return points[0] || { x: 0, y: 0 };

  const candidateSegments = points
    .slice(0, -1)
    .map((point, index) => ({
      start: point,
      end: points[index + 1],
      index
    }))
    .filter(({ index }) => index < points.length - 2);

  const bestSegment = (
    candidateSegments.length > 0 ? candidateSegments : [{ start: points[0], end: points[1], index: 0 }]
  )
    .slice()
    .sort((a, b) => {
      const aLength = Math.abs(a.end.x - a.start.x) + Math.abs(a.end.y - a.start.y);
      const bLength = Math.abs(b.end.x - b.start.x) + Math.abs(b.end.y - b.start.y);
      const aHorizontal = a.start.y === a.end.y ? 1 : 0;
      const bHorizontal = b.start.y === b.end.y ? 1 : 0;
      const aBasePoint = midpoint({ a: a.start, b: a.end });
      const bBasePoint = midpoint({ a: b.start, b: b.end });
      const aOffsetPoint = aHorizontal
        ? { x: aBasePoint.x, y: aBasePoint.y - ROUTE_LABEL_OFFSET }
        : { x: aBasePoint.x + ROUTE_LABEL_OFFSET, y: aBasePoint.y };
      const bOffsetPoint = bHorizontal
        ? { x: bBasePoint.x, y: bBasePoint.y - ROUTE_LABEL_OFFSET }
        : { x: bBasePoint.x + ROUTE_LABEL_OFFSET, y: bBasePoint.y };
      const aPenalty = getLabelKeepoutPenalty({ point: aOffsetPoint, text, keepouts, routedLabelTiles });
      const bPenalty = getLabelKeepoutPenalty({ point: bOffsetPoint, text, keepouts, routedLabelTiles });

      if (aPenalty !== bPenalty) return aPenalty - bPenalty;
      if (aHorizontal !== bHorizontal) return bHorizontal - aHorizontal;
      if (aLength !== bLength) return bLength - aLength;
      const aDistanceFromEnd = points.length - 2 - a.index;
      const bDistanceFromEnd = points.length - 2 - b.index;
      if (aDistanceFromEnd !== bDistanceFromEnd) return bDistanceFromEnd - aDistanceFromEnd;
      return a.index - b.index;
    })[0];

  const midpointTile = midpoint({ a: bestSegment.start, b: bestSegment.end });
  return bestSegment.start.y === bestSegment.end.y
    ? { x: midpointTile.x, y: midpointTile.y - ROUTE_LABEL_OFFSET }
    : { x: midpointTile.x + ROUTE_LABEL_OFFSET, y: midpointTile.y };
};

const GEOMETRY_EPSILON = 0.000001;

type RouteSegment = {
  start: IsoTilePoint;
  end: IsoTilePoint;
};

const getRouteSegments = ({ route }: { route: IsoConnectorRoute }): RouteSegment[] =>
  route.points.slice(0, -1).map((point, index) => ({
    start: point,
    end: route.points[index + 1]
  }));

const nearlyEqual = (a: number, b: number) => Math.abs(a - b) < GEOMETRY_EPSILON;

const isSamePoint = ({ a, b }: { a: IsoTilePoint; b: IsoTilePoint }) => nearlyEqual(a.x, b.x) && nearlyEqual(a.y, b.y);

const pointIsInsideKeepout = ({ point, keepout }: { point: IsoTilePoint; keepout: RouteKeepout }) =>
  point.x >= keepout.minX - GEOMETRY_EPSILON &&
  point.x <= keepout.maxX + GEOMETRY_EPSILON &&
  point.y >= keepout.minY - GEOMETRY_EPSILON &&
  point.y <= keepout.maxY + GEOMETRY_EPSILON;

const crossProduct = ({ a, b, c }: { a: IsoTilePoint; b: IsoTilePoint; c: IsoTilePoint }) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

const pointIsOnSegment = ({ point, segment }: { point: IsoTilePoint; segment: RouteSegment }) =>
  nearlyEqual(crossProduct({ a: segment.start, b: segment.end, c: point }), 0) &&
  point.x >= Math.min(segment.start.x, segment.end.x) - GEOMETRY_EPSILON &&
  point.x <= Math.max(segment.start.x, segment.end.x) + GEOMETRY_EPSILON &&
  point.y >= Math.min(segment.start.y, segment.end.y) - GEOMETRY_EPSILON &&
  point.y <= Math.max(segment.start.y, segment.end.y) + GEOMETRY_EPSILON;

const segmentsIntersect = ({ first, second }: { first: RouteSegment; second: RouteSegment }) => {
  const d1 = crossProduct({ a: first.start, b: first.end, c: second.start });
  const d2 = crossProduct({ a: first.start, b: first.end, c: second.end });
  const d3 = crossProduct({ a: second.start, b: second.end, c: first.start });
  const d4 = crossProduct({ a: second.start, b: second.end, c: first.end });
  const firstStraddlesSecond =
    (d1 > GEOMETRY_EPSILON && d2 < -GEOMETRY_EPSILON) || (d1 < -GEOMETRY_EPSILON && d2 > GEOMETRY_EPSILON);
  const secondStraddlesFirst =
    (d3 > GEOMETRY_EPSILON && d4 < -GEOMETRY_EPSILON) || (d3 < -GEOMETRY_EPSILON && d4 > GEOMETRY_EPSILON);

  if (firstStraddlesSecond && secondStraddlesFirst) {
    return true;
  }

  return (
    pointIsOnSegment({ point: second.start, segment: first }) ||
    pointIsOnSegment({ point: second.end, segment: first }) ||
    pointIsOnSegment({ point: first.start, segment: second }) ||
    pointIsOnSegment({ point: first.end, segment: second })
  );
};

const segmentIsCollinear = ({ first, second }: { first: RouteSegment; second: RouteSegment }) =>
  nearlyEqual(crossProduct({ a: first.start, b: first.end, c: second.start }), 0) &&
  nearlyEqual(crossProduct({ a: first.start, b: first.end, c: second.end }), 0);

const getCollinearOverlapLength = ({ first, second }: { first: RouteSegment; second: RouteSegment }) => {
  const useX = Math.abs(first.start.x - first.end.x) >= Math.abs(first.start.y - first.end.y);
  const firstMin = Math.min(useX ? first.start.x : first.start.y, useX ? first.end.x : first.end.y);
  const firstMax = Math.max(useX ? first.start.x : first.start.y, useX ? first.end.x : first.end.y);
  const secondMin = Math.min(useX ? second.start.x : second.start.y, useX ? second.end.x : second.end.y);
  const secondMax = Math.max(useX ? second.start.x : second.start.y, useX ? second.end.x : second.end.y);

  return Math.max(0, Math.min(firstMax, secondMax) - Math.max(firstMin, secondMin));
};

const segmentTouchesAtEndpoint = ({ first, second }: { first: RouteSegment; second: RouteSegment }) =>
  isSamePoint({ a: first.start, b: second.start }) ||
  isSamePoint({ a: first.start, b: second.end }) ||
  isSamePoint({ a: first.end, b: second.start }) ||
  isSamePoint({ a: first.end, b: second.end });

const segmentIntersectsKeepout = ({ segment, keepout }: { segment: RouteSegment; keepout: RouteKeepout }) => {
  if (
    pointIsInsideKeepout({ point: segment.start, keepout }) ||
    pointIsInsideKeepout({ point: segment.end, keepout })
  ) {
    return true;
  }

  const corners = [
    { x: keepout.minX, y: keepout.minY },
    { x: keepout.maxX, y: keepout.minY },
    { x: keepout.maxX, y: keepout.maxY },
    { x: keepout.minX, y: keepout.maxY }
  ];
  const sides = corners.map((corner, index) => ({
    start: corner,
    end: corners[(index + 1) % corners.length]
  }));

  return sides.some((side) => segmentsIntersect({ first: segment, second: side }));
};

const getRouteLength = ({ route }: { route: IsoConnectorRoute }) =>
  route.points.slice(0, -1).reduce((sum, point, index) => {
    const next = route.points[index + 1];
    return sum + Math.abs(next.x - point.x) + Math.abs(next.y - point.y);
  }, 0);

const getRouteExpansion = ({ route }: { route: IsoConnectorRoute }) => {
  const xs = route.points.map((point) => point.x);
  const ys = route.points.map((point) => point.y);
  const directWidth = Math.abs(xs[0] - xs[xs.length - 1]);
  const directHeight = Math.abs(ys[0] - ys[ys.length - 1]);
  const routeWidth = Math.max(...xs) - Math.min(...xs);
  const routeHeight = Math.max(...ys) - Math.min(...ys);

  return Math.max(0, routeWidth - directWidth) + Math.max(0, routeHeight - directHeight);
};

const clampToFlowXRange = ({ value, fromX, toX }: { value: number; fromX: number; toX: number }) => {
  const minX = Math.min(fromX, toX);
  const maxX = Math.max(fromX, toX);
  return Math.min(maxX, Math.max(minX, value));
};

const isBacktrackingRoute = ({ route, fromX, toX }: { route: IsoConnectorRoute; fromX: number; toX: number }) => {
  const direction = Math.sign(toX - fromX);
  if (direction === 0) return false;

  let previousX = route.points[0]?.x ?? fromX;
  for (const point of route.points.slice(1)) {
    const delta = point.x - previousX;
    if (Math.sign(delta) === -direction) return true;
    previousX = point.x;
  }

  return false;
};

const getRouteInteractionCounts = ({ first, second }: { first: IsoConnectorRoute; second: IsoConnectorRoute }) => {
  const counts = { crossings: 0, touches: 0, sharedSegments: 0 };

  for (const firstSegment of getRouteSegments({ route: first })) {
    for (const secondSegment of getRouteSegments({ route: second })) {
      if (!segmentsIntersect({ first: firstSegment, second: secondSegment })) continue;

      if (segmentIsCollinear({ first: firstSegment, second: secondSegment })) {
        if (getCollinearOverlapLength({ first: firstSegment, second: secondSegment }) > GEOMETRY_EPSILON) {
          counts.sharedSegments += 1;
        } else {
          counts.touches += 1;
        }
      } else if (segmentTouchesAtEndpoint({ first: firstSegment, second: secondSegment })) {
        counts.touches += 1;
      } else {
        counts.crossings += 1;
      }
    }
  }

  return counts;
};

const getRouteKeepoutHitCount = ({
  route,
  keepouts,
  ignoredKeepoutOwnerIds
}: {
  route: IsoConnectorRoute;
  keepouts: RouteKeepout[];
  ignoredKeepoutOwnerIds: string[];
}) => {
  let hitCount = 0;

  for (const keepout of keepouts) {
    if (!shouldUseKeepout({ keepout, ignoredKeepoutOwnerIds })) continue;
    if (getRouteSegments({ route }).some((segment) => segmentIntersectsKeepout({ segment, keepout }))) {
      hitCount += 1;
    }
  }

  return hitCount;
};

const scoreRouteCandidate = ({
  candidate,
  routedEdges,
  edge,
  conflictingSiblingExists,
  keepouts,
  labelTile,
  ignoredKeepoutOwnerIds
}: {
  candidate: RouteCandidate;
  routedEdges: RoutedEdge[];
  edge: TopologyEdge;
  conflictingSiblingExists: boolean;
  keepouts: RouteKeepout[];
  labelTile: IsoTilePoint;
  ignoredKeepoutOwnerIds: string[];
}) => {
  let score = getRouteLength({ route: candidate.route });

  for (const routed of routedEdges) {
    const interactions = getRouteInteractionCounts({ first: candidate.route, second: routed.route });
    const related =
      routed.edge.from === edge.from ||
      routed.edge.from === edge.to ||
      routed.edge.to === edge.from ||
      routed.edge.to === edge.to;

    score += interactions.sharedSegments * (related ? 6 : 22);
    score += interactions.crossings * (related ? 8 : 30);
    score += interactions.touches * (related ? 2 : 8);
  }

  score += getRouteKeepoutHitCount({ route: candidate.route, keepouts, ignoredKeepoutOwnerIds }) * 28;
  score += getRouteExpansion({ route: candidate.route }) * 6;
  score += Math.max(0, candidate.route.points.length - 4) * 4;
  score += getLabelKeepoutPenalty({ point: labelTile, text: edge.label, keepouts, routedLabelTiles: [] });

  if (conflictingSiblingExists && candidate.elbowAtTargetColumn) score += 14;
  if (candidate.kind === 'direct') score += 1.5;
  if (candidate.kind === 'source-elbow') score += 2;
  if (candidate.kind === 'detour') score += 16;

  return score;
};

const getRowBounds = ({ nodes, rowByNodeId }: { nodes: TopologyNode[]; rowByNodeId: Map<string, number> }) => {
  if (nodes.length === 0) return null;

  const rows = nodes.map((node) => rowByNodeId.get(node.id) ?? 0);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const halfStep = ROW_SPACING / 2;

  return {
    min: minRow * ROW_SPACING - halfStep,
    max: maxRow * ROW_SPACING + halfStep
  };
};

// ── Adjacency for layout ──

const buildUndirectedAdj = ({ edges }: { edges: TopologyEdge[] }) => {
  const adj = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a)?.add(b);
  };
  for (const edge of edges) {
    add(edge.from, edge.to);
    add(edge.to, edge.from);
  }
  return adj;
};

// ── Edge weight lookup ──

const buildEdgeWeightMap = ({ edges }: { edges: TopologyEdge[] }) => {
  const map = new Map<string, number>();
  for (const edge of edges) {
    const key1 = `${edge.from}->${edge.to}`;
    const key2 = `${edge.to}->${edge.from}`;
    const w = EDGE_WEIGHT[edge.semantic];
    map.set(key1, Math.max(map.get(key1) || 0, w));
    map.set(key2, Math.max(map.get(key2) || 0, w));
  }
  return map;
};

const getLayerSpacing = ({
  leftLayerIdx,
  rightLayerIdx,
  topology,
  layerByNodeId
}: {
  leftLayerIdx: number;
  rightLayerIdx: number;
  topology: DiagramTopology;
  layerByNodeId: Map<string, number>;
}) => {
  const crossingEdges = topology.edges.filter((edge) => {
    const fromLayer = layerByNodeId.get(edge.from) ?? 0;
    const toLayer = layerByNodeId.get(edge.to) ?? 0;
    return (
      (fromLayer === leftLayerIdx && toLayer === rightLayerIdx) ||
      (fromLayer === rightLayerIdx && toLayer === leftLayerIdx)
    );
  });

  if (crossingEdges.length === 0) return LAYER_SPACING;

  const countsByBoundaryNode = new Map<string, number>();
  for (const edge of crossingEdges) {
    const fromLayer = layerByNodeId.get(edge.from) ?? 0;
    const boundaryNodeId = fromLayer === leftLayerIdx ? edge.from : edge.to;
    countsByBoundaryNode.set(boundaryNodeId, (countsByBoundaryNode.get(boundaryNodeId) || 0) + 1);
  }

  const maxFanout = Math.max(...Array.from(countsByBoundaryNode.values()), 1);
  const fanoutExtra = Math.max(0, maxFanout - 1) * 0.8;
  const densityExtra = Math.max(0, crossingEdges.length - 2) * 0.18;

  return LAYER_SPACING + Math.min(MAX_EXTRA_LAYER_SPACING, fanoutExtra + densityExtra);
};

// ── Phase 2A: Layer assignment (flow-first) ──
// Assigns each node a column index. Layers go left-to-right:
// external(0) -> edge(1) -> ingress(2) -> compute(3) -> integration(4) -> data(5)

const LAYER_INDEX: Record<FlowLayer, number> = {
  external: 0,
  edge: 1,
  ingress: 2,
  compute: 3,
  integration: 4,
  data: 5
};

const assignLayers = ({ topology }: { topology: DiagramTopology }): Map<string, number> => {
  const layerByNodeId = new Map<string, number>();

  // Start with semantic default from the topology
  for (const node of topology.nodes) {
    layerByNodeId.set(node.id, LAYER_INDEX[node.layer]);
  }

  return layerByNodeId;
};

// ── Phase 2B+2C: Row assignment with median crossing minimization ──
// Within each layer, assign rows. Use median heuristic with forward+backward sweeps.

const assignRows = ({
  topology,
  layerByNodeId,
  edgeWeightMap
}: {
  topology: DiagramTopology;
  layerByNodeId: Map<string, number>;
  edgeWeightMap: Map<string, number>;
}): Map<string, number> => {
  const rowByNodeId = new Map<string, number>();
  const undirectedAdj = buildUndirectedAdj({ edges: topology.edges });

  // Group nodes by layer
  const nodesByLayer = new Map<number, TopologyNode[]>();
  for (const node of topology.nodes) {
    const layer = layerByNodeId.get(node.id) ?? 0;
    if (!nodesByLayer.has(layer)) nodesByLayer.set(layer, []);
    nodesByLayer.get(layer)?.push(node);
  }

  // Get sorted layer indices
  const layerIndices = Array.from(nodesByLayer.keys()).sort((a, b) => a - b);

  // Initial row assignment: sort alphabetically within each layer, spread evenly
  for (const layerIdx of layerIndices) {
    const nodes = nodesByLayer.get(layerIdx) || [];
    nodes.sort((a, b) => {
      // Explicit before implicit
      if (a.implicit !== b.implicit) return a.implicit ? 1 : -1;
      return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
    });
    const offset = (nodes.length - 1) / 2;
    nodes.forEach((node, i) => rowByNodeId.set(node.id, i - offset));
  }

  // Median crossing minimization: forward + backward sweeps
  for (let iteration = 0; iteration < LAYOUT_ITERATIONS; iteration++) {
    // Forward sweep (left to right)
    for (const layerIdx of layerIndices) {
      reorderLayerByMedian({ layerIdx, nodesByLayer, rowByNodeId, undirectedAdj, edgeWeightMap, layerByNodeId });
    }
    // Backward sweep (right to left)
    for (const layerIdx of layerIndices.slice().reverse()) {
      reorderLayerByMedian({ layerIdx, nodesByLayer, rowByNodeId, undirectedAdj, edgeWeightMap, layerByNodeId });
    }
  }

  // Greedy adjacent swap pass: for each layer, try swapping adjacent nodes to reduce crossings
  for (const layerIdx of layerIndices) {
    greedySwap({ layerIdx, nodesByLayer, rowByNodeId, undirectedAdj, edgeWeightMap, layerByNodeId });
  }

  return rowByNodeId;
};

/**
 * The working state one crossing-minimization pass reads and reorders: which nodes sit in each layer,
 * which row each node currently occupies, and the weighted adjacency it is trying to untangle.
 */
type LayerOrderingPass = {
  layerIdx: number;
  nodesByLayer: Map<number, TopologyNode[]>;
  rowByNodeId: Map<string, number>;
  undirectedAdj: Map<string, Set<string>>;
  edgeWeightMap: Map<string, number>;
  layerByNodeId: Map<string, number>;
};

const reorderLayerByMedian = ({
  layerIdx,
  nodesByLayer,
  rowByNodeId,
  undirectedAdj,
  edgeWeightMap,
  layerByNodeId
}: LayerOrderingPass) => {
  const nodes = nodesByLayer.get(layerIdx) || [];
  if (nodes.length <= 1) return;

  // For each node, compute weighted median of neighbor rows in OTHER layers
  const medianValues = new Map<string, number>();
  for (const node of nodes) {
    const neighbors = Array.from(undirectedAdj.get(node.id) || []);
    const neighborRows: { row: number; weight: number }[] = [];

    for (const neighborId of neighbors) {
      const neighborLayer = layerByNodeId.get(neighborId) ?? 0;
      if (neighborLayer === layerIdx) continue; // skip same-layer neighbors
      const row = rowByNodeId.get(neighborId) ?? 0;
      const key = `${node.id}->${neighborId}`;
      const weight = edgeWeightMap.get(key) || 1;
      neighborRows.push({ row, weight });
    }

    if (neighborRows.length > 0) {
      // Weighted median: expand by weight, then take median
      const expanded: number[] = [];
      for (const { row, weight } of neighborRows) {
        const count = Math.max(1, Math.round(weight));
        for (let i = 0; i < count; i++) expanded.push(row);
      }
      medianValues.set(node.id, median(expanded));
    } else {
      medianValues.set(node.id, rowByNodeId.get(node.id) ?? 0);
    }
  }

  // Sort by median, using current position as tie-breaker for stability
  nodes.sort((a, b) => {
    const ma = medianValues.get(a.id) ?? 0;
    const mb = medianValues.get(b.id) ?? 0;
    if (ma !== mb) return ma - mb;
    return (rowByNodeId.get(a.id) ?? 0) - (rowByNodeId.get(b.id) ?? 0);
  });

  // Reassign rows centered around 0
  const offset = (nodes.length - 1) / 2;
  nodes.forEach((node, i) => rowByNodeId.set(node.id, i - offset));
};

// Count weighted crossings between two adjacent layers
const countCrossings = ({
  layerNodes,
  rowByNodeId,
  undirectedAdj,
  edgeWeightMap,
  otherLayerIdx,
  layerByNodeId
}: {
  layerNodes: TopologyNode[];
  rowByNodeId: Map<string, number>;
  undirectedAdj: Map<string, Set<string>>;
  edgeWeightMap: Map<string, number>;
  otherLayerIdx: number;
  layerByNodeId: Map<string, number>;
}) => {
  // Build edge pairs: (row_in_layer, row_in_other_layer, weight)
  const edgePairs: { r1: number; r2: number; w: number }[] = [];
  for (const node of layerNodes) {
    const row = rowByNodeId.get(node.id) ?? 0;
    for (const neighborId of Array.from(undirectedAdj.get(node.id) || [])) {
      if ((layerByNodeId.get(neighborId) ?? 0) !== otherLayerIdx) continue;
      const neighborRow = rowByNodeId.get(neighborId) ?? 0;
      const key = `${node.id}->${neighborId}`;
      edgePairs.push({ r1: row, r2: neighborRow, w: edgeWeightMap.get(key) || 1 });
    }
  }

  // Count crossings: two edges cross if (r1a < r1b && r2a > r2b) or vice versa
  let crossings = 0;
  for (let i = 0; i < edgePairs.length; i++) {
    for (let j = i + 1; j < edgePairs.length; j++) {
      const a = edgePairs[i];
      const b = edgePairs[j];
      if ((a.r1 - b.r1) * (a.r2 - b.r2) < 0) {
        crossings += a.w * b.w;
      }
    }
  }
  return crossings;
};

const greedySwap = ({
  layerIdx,
  nodesByLayer,
  rowByNodeId,
  undirectedAdj,
  edgeWeightMap,
  layerByNodeId
}: LayerOrderingPass) => {
  const nodes = nodesByLayer.get(layerIdx) || [];
  if (nodes.length <= 1) return;

  // Find adjacent layer indices to compute crossings against
  const allLayers = Array.from(nodesByLayer.keys()).sort((a, b) => a - b);
  const layerPos = allLayers.indexOf(layerIdx);
  const adjLayers: number[] = [];
  if (layerPos > 0) adjLayers.push(allLayers[layerPos - 1]);
  if (layerPos < allLayers.length - 1) adjLayers.push(allLayers[layerPos + 1]);

  const getCrossings = () => {
    let total = 0;
    for (const otherIdx of adjLayers) {
      total += countCrossings({
        layerNodes: nodes,
        rowByNodeId,
        undirectedAdj,
        edgeWeightMap,
        otherLayerIdx: otherIdx,
        layerByNodeId
      });
    }
    return total;
  };

  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < nodes.length - 1; i++) {
      const before = getCrossings();

      // Swap nodes[i] and nodes[i+1]
      const rowA = rowByNodeId.get(nodes[i].id) ?? 0;
      const rowB = rowByNodeId.get(nodes[i + 1].id) ?? 0;
      rowByNodeId.set(nodes[i].id, rowB);
      rowByNodeId.set(nodes[i + 1].id, rowA);
      [nodes[i], nodes[i + 1]] = [nodes[i + 1], nodes[i]];

      const after = getCrossings();

      if (after >= before) {
        // Swap back
        rowByNodeId.set(nodes[i].id, rowB);
        rowByNodeId.set(nodes[i + 1].id, rowA);
        [nodes[i], nodes[i + 1]] = [nodes[i + 1], nodes[i]];
      } else {
        improved = true;
      }
    }
  }
};

// ── Phase 3: Convert (layer, row) to isometric tile coordinates ──
// In isometric space:
//   - flow direction (layers) maps to increasing tile X (goes upper-right)
//   - row direction maps to increasing tile Y (goes lower-right)
// This creates the natural left-to-right flow in isometric projection.

// VPC container layout: VPC nodes are placed in a contiguous block.
// Non-VPC nodes are placed with a gap so they don't overlap the VPC rectangle.

const buildPlacements = ({
  topology,
  layerByNodeId,
  rowByNodeId
}: {
  topology: DiagramTopology;
  layerByNodeId: Map<string, number>;
  rowByNodeId: Map<string, number>;
}): Map<string, LayoutPlacement> => {
  const placements = new Map<string, LayoutPlacement>();

  // Separate VPC and non-VPC nodes for compound container layout
  const vpcNodes = topology.nodes.filter((n) => n.subnet !== null);
  const nonVpcNodes = topology.nodes.filter((n) => n.subnet === null);

  // Build ordered set of visible layers
  const allLayerIndices = new Set<number>();
  for (const node of topology.nodes) {
    allLayerIndices.add(layerByNodeId.get(node.id) ?? 0);
  }
  const orderedLayers = Array.from(allLayerIndices).sort((a, b) => a - b);

  // Assign X positions for each layer index, keeping VPC and non-VPC separated
  const layerXOffset = new Map<number, number>();
  let currentX = 0;
  for (const [index, layerIdx] of orderedLayers.entries()) {
    layerXOffset.set(layerIdx, currentX);

    const nextLayerIdx = orderedLayers[index + 1];
    if (nextLayerIdx !== undefined) {
      currentX += getLayerSpacing({ leftLayerIdx: layerIdx, rightLayerIdx: nextLayerIdx, topology, layerByNodeId });
    }
  }

  // Stack subnet bands using the actual row spread produced by crossing minimization,
  // not just resource counts. This keeps sparse/fractional rows from collapsing together.
  const subnetOffset: Record<string, number> = {
    public: 0,
    private: 0
  };

  const vpcBySubnet = groupBy({ items: vpcNodes, getKey: (n) => n.subnet || 'public' });
  let currentSubnetStart = 0;
  for (const subnetType of ['public', 'private'] as const) {
    const subnetNodes = vpcBySubnet.get(subnetType) || [];
    const bounds = getRowBounds({ nodes: subnetNodes, rowByNodeId });
    if (!bounds) continue;

    subnetOffset[subnetType] = currentSubnetStart - bounds.min;
    currentSubnetStart += bounds.max - bounds.min + SUBNET_GAP;
  }

  // Place VPC nodes first so non-VPC nodes can avoid the actual VPC footprint.
  for (const node of vpcNodes) {
    const layerIdx = layerByNodeId.get(node.id) ?? 0;
    const row = rowByNodeId.get(node.id) ?? 0;
    const baseX = layerXOffset.get(layerIdx) ?? 0;
    const currentSubnetOffset = subnetOffset[node.subnet || 'public'] ?? 0;

    placements.set(node.id, {
      x: baseX,
      y: row * ROW_SPACING + currentSubnetOffset
    });
  }

  const vpcPlacementEntries = Array.from(placements.entries());
  const vpcBounds = getPlacementBounds({ placements: vpcPlacementEntries.map(([, placement]) => placement) });
  if (vpcBounds) {
    const vpcCenterY = (vpcBounds.minY + vpcBounds.maxY) / 2;
    for (const [id, placement] of vpcPlacementEntries) {
      placements.set(id, { x: placement.x, y: placement.y - vpcCenterY });
    }
  }

  // Any non-VPC node whose column lands within the VPC rectangle's x-range would be
  // drawn inside the VPC, so shift the whole overlapping group in front of it.
  const centeredVpcBounds = getPlacementBounds({ placements: Array.from(placements.values()) });
  const vpcFootprintBounds = centeredVpcBounds
    ? {
        minX: centeredVpcBounds.minX - CONTAINER_EXPAND - VPC_RECT_EXTRA_X,
        maxX: centeredVpcBounds.maxX + CONTAINER_EXPAND + VPC_RECT_EXTRA_X,
        minY: centeredVpcBounds.minY - CONTAINER_EXPAND - VPC_RECT_EXTRA_Y,
        maxY: centeredVpcBounds.maxY + CONTAINER_EXPAND + VPC_RECT_EXTRA_Y
      }
    : null;
  const overlapsVpcXRange = (node: TopologyNode) => {
    if (!vpcFootprintBounds) return false;
    const x = layerXOffset.get(layerByNodeId.get(node.id) ?? 0) ?? 0;
    return x >= vpcFootprintBounds.minX && x <= vpcFootprintBounds.maxX;
  };
  const overlappingNonVpcNodes = nonVpcNodes.filter(overlapsVpcXRange);
  const overlappingRawPlacements = overlappingNonVpcNodes.map((node) => ({
    id: node.id,
    x: layerXOffset.get(layerByNodeId.get(node.id) ?? 0) ?? 0,
    y: (rowByNodeId.get(node.id) ?? 0) * ROW_SPACING
  }));
  const overlappingBounds = getPlacementBounds({ placements: overlappingRawPlacements });
  const VPC_GAP = ROW_SPACING + 0.8;
  const overlapShift =
    vpcFootprintBounds && overlappingBounds ? vpcFootprintBounds.minY - VPC_GAP - overlappingBounds.maxY : 0;
  const shiftedNodeIds = new Set(overlappingNonVpcNodes.map((node) => node.id));

  for (const node of nonVpcNodes) {
    const layerIdx = layerByNodeId.get(node.id) ?? 0;
    const row = rowByNodeId.get(node.id) ?? 0;
    const baseX = layerXOffset.get(layerIdx) ?? 0;
    const yShift = shiftedNodeIds.has(node.id) ? overlapShift : 0;

    placements.set(node.id, {
      x: baseX,
      y: row * ROW_SPACING + yShift
    });
  }

  // Center the entire diagram around (0, 0) for better default view
  const allPlacements = Array.from(placements.values());
  if (allPlacements.length > 0) {
    const avgX = allPlacements.reduce((s, p) => s + p.x, 0) / allPlacements.length;
    const avgY = allPlacements.reduce((s, p) => s + p.y, 0) / allPlacements.length;
    for (const [id, placement] of Array.from(placements.entries())) {
      placements.set(id, { x: placement.x - avgX, y: placement.y - avgY });
    }
  }

  return placements;
};

// ── Scene building ──

const buildSceneNodes = ({
  topology,
  placements
}: {
  topology: DiagramTopology;
  placements: Map<string, LayoutPlacement>;
}) => {
  const sceneNodes: IsoNode[] = [];

  for (const node of topology.nodes) {
    const placement = placements.get(node.id);
    if (!placement) continue;

    const explanation = RESOURCE_EXPLANATIONS[node.resourceType];
    sceneNodes.push({
      id: node.id,
      label: node.label,
      resourceType: node.resourceType,
      typeName: explanation?.name,
      summary: explanation?.summary,
      details: explanation?.details,
      accessNote: node.accessNote,
      iconUrl: getResourceIconUrl(node.resourceType),
      tile: placement,
      isImplicit: node.implicit,
      color: getBlockColor(node.resourceType),
      pedestal: getPedestal(node.resourceType),
      isAwsIcon: node.resourceType !== 'user',
      replicaCount: node.replicaCount
    });
  }

  return sceneNodes;
};

const routeStraightConnector = ({ from, to }: { from: LayoutPlacement; to: LayoutPlacement }): IsoConnectorRoute => ({
  points: [from, to],
  labelTile: midpoint({ a: from, b: to })
});

const routeElbowConnector = ({
  from,
  to,
  elbowAtTargetColumn,
  laneOffset = 0,
  targetLaneOffset = 0,
  sourceGroupCount = 1,
  targetGroupCount = 1,
  keepouts,
  ignoredKeepoutOwnerIds
}: {
  from: LayoutPlacement;
  to: LayoutPlacement;
  elbowAtTargetColumn: boolean;
  laneOffset?: number;
  targetLaneOffset?: number;
  sourceGroupCount?: number;
  targetGroupCount?: number;
  keepouts: RouteKeepout[];
  ignoredKeepoutOwnerIds: string[];
}): IsoConnectorRoute => {
  const preferSourceBundling = sourceGroupCount >= targetGroupCount;
  const useSourceLane = Math.abs(laneOffset) > 0.05 && preferSourceBundling;
  const useTargetLane = Math.abs(targetLaneOffset) > 0.05 && !preferSourceBundling;
  const horizontalLaneY = adjustHorizontalLane({
    fromX: from.x,
    toX: to.x,
    baseY: from.y + (useSourceLane ? laneOffset : 0),
    keepouts,
    ignoredKeepoutOwnerIds
  });
  const verticalLaneX = adjustVerticalLane({
    fromY: from.y,
    toY: to.y,
    baseX: from.x + (useSourceLane ? laneOffset : 0),
    keepouts,
    ignoredKeepoutOwnerIds
  });
  const targetApproachX = adjustVerticalLane({
    fromY: horizontalLaneY,
    toY: to.y,
    baseX: to.x + (useTargetLane ? targetLaneOffset : 0),
    keepouts,
    ignoredKeepoutOwnerIds
  });
  const targetApproachY = adjustHorizontalLane({
    fromX: verticalLaneX,
    toX: to.x,
    baseY: to.y + (useTargetLane ? targetLaneOffset : 0),
    keepouts,
    ignoredKeepoutOwnerIds
  });
  const points = normalizeRoutePoints({
    points: elbowAtTargetColumn
      ? [
          from,
          { x: from.x, y: horizontalLaneY },
          { x: clampToFlowXRange({ value: targetApproachX, fromX: from.x, toX: to.x }), y: horizontalLaneY },
          { x: clampToFlowXRange({ value: targetApproachX, fromX: from.x, toX: to.x }), y: to.y },
          to
        ]
      : [
          from,
          { x: clampToFlowXRange({ value: verticalLaneX, fromX: from.x, toX: to.x }), y: from.y },
          { x: clampToFlowXRange({ value: verticalLaneX, fromX: from.x, toX: to.x }), y: targetApproachY },
          { x: to.x, y: targetApproachY },
          to
        ]
  });

  return {
    points,
    labelTile: points[0] || { x: 0, y: 0 }
  };
};

const routeDetourConnector = ({
  from,
  to,
  targetLaneOffset = 0,
  keepouts,
  ignoredKeepoutOwnerIds
}: {
  from: LayoutPlacement;
  to: LayoutPlacement;
  targetLaneOffset?: number;
  keepouts: RouteKeepout[];
  ignoredKeepoutOwnerIds: string[];
}): IsoConnectorRoute => {
  const direction = to.x >= from.x ? 1 : -1;
  const detourX = adjustVerticalLane({
    fromY: from.y,
    toY: to.y,
    baseX: Math.max(from.x, to.x) + direction * (DETOUR_ROUTE_GAP + Math.abs(targetLaneOffset)),
    keepouts,
    ignoredKeepoutOwnerIds
  });
  const points = normalizeRoutePoints({
    points: [from, { x: detourX, y: from.y }, { x: detourX, y: to.y }, to]
  });

  return {
    points,
    labelTile: points[0] || { x: 0, y: 0 }
  };
};

const getRouteCandidates = ({
  from,
  to,
  laneOffset,
  targetLaneOffset,
  sourceGroupCount,
  targetGroupCount,
  keepouts,
  ignoredKeepoutOwnerIds
}: {
  from: LayoutPlacement;
  to: LayoutPlacement;
  laneOffset: number;
  targetLaneOffset: number;
  sourceGroupCount: number;
  targetGroupCount: number;
  keepouts: RouteKeepout[];
  ignoredKeepoutOwnerIds: string[];
}) =>
  (
    [
      {
        elbowAtTargetColumn: false,
        kind: 'direct',
        route: routeStraightConnector({ from, to })
      },
      {
        elbowAtTargetColumn: true,
        kind: 'target-elbow',
        route: routeElbowConnector({
          from,
          to,
          elbowAtTargetColumn: true,
          laneOffset,
          targetLaneOffset,
          sourceGroupCount,
          targetGroupCount,
          keepouts,
          ignoredKeepoutOwnerIds
        })
      },
      {
        elbowAtTargetColumn: false,
        kind: 'source-elbow',
        route: routeElbowConnector({
          from,
          to,
          elbowAtTargetColumn: false,
          laneOffset,
          targetLaneOffset,
          sourceGroupCount,
          targetGroupCount,
          keepouts,
          ignoredKeepoutOwnerIds
        })
      },
      {
        elbowAtTargetColumn: false,
        kind: 'detour',
        route: routeDetourConnector({ from, to, targetLaneOffset, keepouts, ignoredKeepoutOwnerIds })
      }
    ] satisfies RouteCandidate[]
  ).filter((candidate) => !isBacktrackingRoute({ route: candidate.route, fromX: from.x, toX: to.x }));

const buildConnectorRoutes = ({
  edges,
  placements,
  layerByNodeId,
  rectangles,
  labels,
  sceneNodes
}: {
  edges: TopologyEdge[];
  placements: Map<string, LayoutPlacement>;
  layerByNodeId: Map<string, number>;
  rectangles: IsoRectangle[];
  labels: IsoLabel[];
  sceneNodes: IsoNode[];
}): RoutedEdge[] => {
  const keepouts = buildRouteKeepouts({ rectangles, labels, sceneNodes });
  const sortedEdges = edges
    .filter((edge) => placements.has(edge.from) && placements.has(edge.to))
    .slice()
    .sort((a, b) => {
      const fromLayerDiff = (layerByNodeId.get(a.from) ?? 0) - (layerByNodeId.get(b.from) ?? 0);
      if (fromLayerDiff !== 0) return fromLayerDiff;
      const toLayerDiff = (layerByNodeId.get(a.to) ?? 0) - (layerByNodeId.get(b.to) ?? 0);
      if (toLayerDiff !== 0) return toLayerDiff;
      const fromPlacementA = placements.get(a.from);
      const fromPlacementB = placements.get(b.from);
      const toPlacementA = placements.get(a.to);
      const toPlacementB = placements.get(b.to);
      if (fromPlacementA && fromPlacementB && fromPlacementA.y !== fromPlacementB.y) {
        return fromPlacementA.y - fromPlacementB.y;
      }
      if (toPlacementA && toPlacementB && toPlacementA.y !== toPlacementB.y) {
        return toPlacementA.y - toPlacementB.y;
      }
      return a.id.localeCompare(b.id);
    });

  const edgesBySourceAndTargetLayer = groupBy({
    items: sortedEdges,
    getKey: (edge) => `${edge.from}::${layerByNodeId.get(edge.to) ?? 0}`
  });
  const edgesByTarget = groupBy({
    items: sortedEdges,
    getKey: (edge) => edge.to
  });
  const routedEdges: RoutedEdge[] = [];

  for (const edge of sortedEdges) {
    const from = placements.get(edge.from);
    const to = placements.get(edge.to);
    if (!from || !to) continue;

    let route: IsoConnectorRoute;
    const siblingKey: `${string}::${number}` = `${edge.from}::${layerByNodeId.get(edge.to) ?? 0}`;
    const siblingGroup = edgesBySourceAndTargetLayer.get(siblingKey) || [];
    const sourceGroupCount = siblingGroup.length;
    const siblingIndex = siblingGroup.findIndex((candidate) => candidate.id === edge.id);
    const laneOffset = getLaneOffset({ index: Math.max(0, siblingIndex), count: siblingGroup.length });
    const targetGroup = edgesByTarget.get(edge.to) || [];
    const targetGroupCount = targetGroup.length;
    const targetIndex = targetGroup.findIndex((candidate) => candidate.id === edge.id);
    const targetLaneOffset = getLaneOffset({ index: Math.max(0, targetIndex), count: targetGroup.length });
    const siblings = siblingGroup.filter((candidate) => candidate.id !== edge.id);
    const conflictingSiblingExists = siblings.some((candidate) => {
      const candidateTo = placements.get(candidate.to);
      return candidateTo && candidateTo.x === to.x;
    });
    const ignoredKeepoutOwnerIds = [edge.from, edge.to];
    const routedLabelTiles = routedEdges.map((routed) => routed.route.labelTile);
    const candidates = getRouteCandidates({
      from,
      to,
      laneOffset,
      targetLaneOffset,
      sourceGroupCount,
      targetGroupCount,
      keepouts,
      ignoredKeepoutOwnerIds
    });

    if (candidates.length === 0) {
      route = routeStraightConnector({ from, to });
      routedEdges.push({ edge, route });
      continue;
    }

    const scoredRoute = candidates
      .map((candidate) => {
        const labelTile = getRouteLabelTile({
          points: candidate.route.points,
          text: edge.label,
          keepouts,
          routedLabelTiles
        });

        return {
          candidate,
          labelTile,
          score: scoreRouteCandidate({
            candidate,
            routedEdges,
            edge,
            conflictingSiblingExists,
            keepouts,
            labelTile,
            ignoredKeepoutOwnerIds
          })
        };
      })
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return Number(b.candidate.elbowAtTargetColumn) - Number(a.candidate.elbowAtTargetColumn);
      })[0];

    route = { ...scoredRoute.candidate.route, labelTile: scoredRoute.labelTile };

    if (route.labelTile === route.points[0]) {
      route = {
        ...route,
        labelTile: getRouteLabelTile({
          points: route.points,
          text: edge.label,
          keepouts,
          routedLabelTiles: routedEdges.map((routed) => routed.route.labelTile)
        })
      };
    }

    routedEdges.push({ edge, route });
  }

  return routedEdges;
};

const validateScene = ({
  topology,
  sceneNodes,
  connectors,
  rectangles
}: {
  topology: DiagramTopology;
  sceneNodes: IsoNode[];
  connectors: IsoConnector[];
  rectangles: IsoRectangle[];
}) => {
  // Warn about layout invariant violations only during local development. `import.meta.env`
  // covers Vite builds; the NODE_ENV check covers the Bun test runner.
  const isDevBuild =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) === true &&
    !(typeof process !== 'undefined' && process.env.NODE_ENV === 'production');
  if (!isDevBuild) return;

  const duplicateNodeTiles = groupBy({
    items: sceneNodes,
    getKey: (node) => `${node.tile.x}:${node.tile.y}`
  });
  const duplicateTileGroups = Array.from(duplicateNodeTiles.values()).filter((nodes) => nodes.length > 1);

  if (duplicateTileGroups.length > 0) {
    console.warn(
      'Diagram scene contains overlapping node placements',
      duplicateTileGroups.map((nodes) => nodes.map((node) => node.id))
    );
  }

  const vpcRect = rectangles.find((rectangle) => rectangle.id === 'vpc');
  if (vpcRect) {
    const topologyNodeMap = new Map(topology.nodes.map((node) => [node.id, node]));
    const overlappingNonVpcNodes = sceneNodes.filter((node) => {
      const topologyNode = topologyNodeMap.get(node.id);
      if (!topologyNode || topologyNode.subnet !== null) return false;
      return (
        node.tile.x >= vpcRect.from.x &&
        node.tile.x <= vpcRect.to.x &&
        node.tile.y >= vpcRect.from.y &&
        node.tile.y <= vpcRect.to.y
      );
    });

    if (overlappingNonVpcNodes.length > 0) {
      console.warn(
        'Diagram scene contains non-VPC nodes inside VPC footprint',
        overlappingNonVpcNodes.map((node) => node.id)
      );
    }
  }

  const nodeIds = new Set(sceneNodes.map((node) => node.id));
  const danglingConnectors = connectors.filter(
    (connector) => !nodeIds.has(connector.from) || !nodeIds.has(connector.to)
  );
  if (danglingConnectors.length > 0) {
    console.warn(
      'Diagram scene contains dangling connectors',
      danglingConnectors.map((connector) => connector.id)
    );
  }
};

// ── Zone rectangles and labels ──
// Compute VPC and subnet rectangles as compound containers around their children.

// Visual styling per zone; names and explanations come from ZONE_EXPLANATIONS.
type ContainerDef = {
  id: string;
  color: string;
  borderColor: string;
  fontSize: number;
};

const VPC_CONTAINER: ContainerDef = {
  id: 'vpc',
  color: 'rgba(54, 190, 190, 0.06)',
  borderColor: 'rgba(54, 190, 190, 0.2)',
  fontSize: 12
};

const SUBNET_CONTAINERS: Record<string, ContainerDef> = {
  public: {
    id: 'subnet-public',
    color: 'rgba(92, 160, 52, 0.06)',
    borderColor: 'rgba(92, 160, 52, 0.2)',
    fontSize: 11
  },
  private: {
    id: 'subnet-private',
    color: 'rgba(237, 113, 0, 0.06)',
    borderColor: 'rgba(237, 113, 0, 0.2)',
    fontSize: 11
  }
};

const NON_VPC_CONTAINERS: Record<FlowLayer, ContainerDef | null> = {
  external: null,
  edge: {
    id: 'zone-edge',
    color: 'rgba(161, 102, 255, 0.05)',
    borderColor: 'rgba(161, 102, 255, 0.18)',
    fontSize: 11
  },
  ingress: null, // ingress nodes inside VPC don't need extra container; non-VPC ingress is gateway zone
  compute: null,
  // No container for integration services: SQS/SNS/EventBridge are regional AWS
  // services, not a network boundary — grouping them drew a meaningless border.
  integration: null,
  data: null
};

const buildContainerRect = ({
  nodes,
  def
}: {
  nodes: IsoNode[];
  def: ContainerDef;
}): { rect: IsoRectangle; label: IsoLabel } | null => {
  if (nodes.length === 0) return null;

  const explanation = ZONE_EXPLANATIONS[def.id];
  const minX = Math.min(...nodes.map((n) => n.tile.x)) - CONTAINER_EXPAND;
  const maxX = Math.max(...nodes.map((n) => n.tile.x)) + CONTAINER_EXPAND;
  const minY = Math.min(...nodes.map((n) => n.tile.y)) - CONTAINER_EXPAND;
  const maxY = Math.max(...nodes.map((n) => n.tile.y)) + CONTAINER_EXPAND;

  return {
    rect: {
      id: def.id,
      from: { x: minX, y: minY },
      to: { x: maxX, y: maxY },
      color: def.color,
      borderColor: def.borderColor,
      label: explanation?.name ?? def.id,
      summary: explanation?.summary,
      details: explanation?.details,
      memberNodeIds: nodes.map((n) => n.id)
    },
    // The label anchor is the zone's FRONT TIP — the lowest vertex of its diamond.
    // The renderer hangs a horizontal screen-space tag just below it, drawn above all
    // scene geometry, so the zone name can never be occluded and unambiguously touches
    // its own boundary.
    label: {
      id: `${def.id}-label`,
      tile: { x: minX, y: minY },
      text: explanation?.name ?? def.id,
      color: def.borderColor.replace(/0\.\d+\)$/, '0.9)'),
      fontSize: def.fontSize
    }
  };
};

const buildRectanglesAndLabels = ({ topology, sceneNodes }: { topology: DiagramTopology; sceneNodes: IsoNode[] }) => {
  const topologyNodeMap = new Map(topology.nodes.map((n) => [n.id, n]));
  const rectangles: IsoRectangle[] = [];
  const labels: IsoLabel[] = [];

  // VPC compound container
  if (topology.hasVpc) {
    const vpcSceneNodes = sceneNodes.filter((n) => topologyNodeMap.get(n.id)?.subnet !== null);
    if (vpcSceneNodes.length > 0) {
      const vpcRect = buildContainerRect({ nodes: vpcSceneNodes, def: VPC_CONTAINER });
      if (vpcRect) {
        // Expand VPC slightly beyond subnet rects
        vpcRect.rect.from.x -= VPC_RECT_EXTRA_X;
        vpcRect.rect.from.y -= VPC_RECT_EXTRA_Y;
        vpcRect.rect.to.x += VPC_RECT_EXTRA_X;
        vpcRect.rect.to.y += VPC_RECT_EXTRA_Y;
        // Tag hangs at the expanded rect's front tip.
        vpcRect.label.tile = { x: vpcRect.rect.from.x, y: vpcRect.rect.from.y };
        rectangles.push(vpcRect.rect);
        labels.push(vpcRect.label);
      }

      // Subnet sub-containers within VPC
      for (const [subnetType, def] of Object.entries(SUBNET_CONTAINERS)) {
        const subnetNodes = vpcSceneNodes.filter((n) => topologyNodeMap.get(n.id)?.subnet === subnetType);
        const subnetRect = buildContainerRect({ nodes: subnetNodes, def });
        if (subnetRect) {
          rectangles.push(subnetRect.rect);
          labels.push(subnetRect.label);
        }
      }
    }
  }

  // Non-VPC zone containers (edge, managed services)
  const nonVpcNodes = sceneNodes.filter((n) => topologyNodeMap.get(n.id)?.subnet === null);
  const nonVpcByLayer = groupBy({
    items: nonVpcNodes.filter((n) => {
      const tNode = topologyNodeMap.get(n.id);
      return tNode && tNode.layer !== 'external'; // Don't draw container around User
    }),
    getKey: (n) => topologyNodeMap.get(n.id)?.layer || 'compute'
  });

  for (const [layer, nodes] of Array.from(nonVpcByLayer.entries())) {
    const def = NON_VPC_CONTAINERS[layer as FlowLayer];
    if (!def || nodes.length === 0) continue;
    // Only show container if there are 2+ nodes, or it's an important zone
    if (nodes.length < 2 && layer !== 'edge') continue;
    const containerResult = buildContainerRect({ nodes, def });
    if (containerResult) {
      rectangles.push(containerResult.rect);
      labels.push(containerResult.label);
    }
  }

  return { rectangles, labels };
};

// ── Main entry point ──

export const buildIsometricScene = ({ parsedConfig }: { parsedConfig: StacktapeConfig | null }): IsoScene | null => {
  const topology = buildDiagramTopology({ parsedConfig });
  if (!topology || topology.nodes.length === 0) return null;

  const layerByNodeId = assignLayers({ topology });
  const edgeWeightMap = buildEdgeWeightMap({ edges: topology.edges });
  const rowByNodeId = assignRows({ topology, layerByNodeId, edgeWeightMap });
  const placements = buildPlacements({ topology, layerByNodeId, rowByNodeId });
  const sceneNodes = buildSceneNodes({ topology, placements });
  const { rectangles, labels } = buildRectanglesAndLabels({ topology, sceneNodes });
  const routedConnectors = buildConnectorRoutes({
    edges: topology.edges,
    placements,
    layerByNodeId,
    rectangles,
    labels,
    sceneNodes
  });
  const connectors: IsoConnector[] = routedConnectors.map(({ edge, route }) => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    label: edge.label,
    semantic: edge.semantic,
    description: edge.description,
    route
  }));

  validateScene({ topology, sceneNodes, connectors, rectangles });

  return {
    nodes: sceneNodes,
    connectors,
    rectangles,
    labels
  };
};
