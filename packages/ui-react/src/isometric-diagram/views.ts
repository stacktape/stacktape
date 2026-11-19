/**
 * Layers: what a reader adds to one laid-out picture.
 *
 * The layout runs once, on every node, connector and zone the topology has, so a node keeps its exact place whichever
 * layers are on. A layer only shows or hides things. The picture without layers is the application: the resources the
 * configuration declares and how requests and events flow between them. Two layers add to it, in any combination:
 *
 * - Infrastructure: what Stacktape creates under the configuration (per-service gateways and load balancers, CDNs, an
 *   SSR site's server function and assets bucket, Convex's parts), the VPC with its subnet tiers and the edge network,
 *   the NAT and outbound traffic, load balancer exposure and VPC Links.
 * - Access: who can connect to each resource of a deployed stage, as one tag above it (`security-view.ts`). It
 *   changes nothing else in the picture.
 *
 * A Stacktape-created node that is hidden folds into the resource that owns it: the per-service gateway of a web
 * service folds into the service, so the user's connector runs through the gateway's empty spot into the service. A
 * hidden node with no owner (the NAT) takes its connectors with it.
 */
import type { LayoutConnectorLabel, LayoutNode } from './layout/diagram-layout.js';
import type { ProjectedBox } from './layout/projected-box.js';
import type { IsoConnector, IsoNode, IsoNodeConnection, IsoScene, IsoTilePoint } from './scene.js';
import type { TopologyNode } from './topology.js';
import { BODY_SHAPES, nodeShapes, simplifyRoute } from './layout/diagram-layout.js';
import { coveredArea, findDirectRoute, placeChipOnRoute } from './layout/direct-route.js';
import { projectTile, shiftBox } from './layout/projected-box.js';

export type DiagramLayer = 'infrastructure' | 'access';

export type DiagramLayers = Readonly<Record<DiagramLayer, boolean>>;

export const DIAGRAM_LAYERS: readonly DiagramLayer[] = ['infrastructure', 'access'];

export const DIAGRAM_LAYER_NAMES: Record<DiagramLayer, string> = {
  infrastructure: 'Infrastructure',
  access: 'Access'
};

/** The application alone: the picture a diagram opens with. */
export const NO_LAYERS: DiagramLayers = { infrastructure: false, access: false };

/** Everything on: the picture the layout is computed for. */
export const ALL_LAYERS: DiagramLayers = { infrastructure: true, access: true };

export const isDiagramLayer = (value: unknown): value is DiagramLayer =>
  typeof value === 'string' && (DIAGRAM_LAYERS as readonly string[]).includes(value);

// ── Membership ──

/** A node only the Infrastructure layer shows, and what it folds into when the layer is off. */
export type NodeMembership = { foldInto?: string | undefined };

/**
 * `infrastructure` marks a connector only the Infrastructure layer shows (outbound traffic); `infrastructureLabel`
 * marks a label only that layer shows ("VPC Link").
 */
export type ConnectorMembership = { infrastructure?: boolean; infrastructureLabel?: boolean };

export type ViewMembership = {
  /** The nodes of the Infrastructure layer. Every other node is in every picture. */
  nodes: Map<string, NodeMembership>;
  connectors: Map<string, ConnectorMembership>;
};

/** The resource an implicit node belongs to: implicit IDs are `<owner>--<part>`, and resource names never hold `--`. */
const ownerOf = (nodeId: string) => {
  const index = nodeId.indexOf('--');
  return index > 0 ? nodeId.slice(0, index) : undefined;
};

/**
 * The nodes of the Infrastructure layer. The schedule node is a trigger, not infrastructure, and stays in every
 * picture, as does any implicit data store open to the internet: its `public` badge is never hidden.
 */
export const classifyNodes = (nodes: readonly TopologyNode[]): Map<string, NodeMembership> => {
  const ids = new Set(nodes.map((node) => node.id));
  const membership = new Map<string, NodeMembership>();
  for (const node of nodes) {
    if (node.resourceType === 'nat-gateway') {
      membership.set(node.id, {});
      continue;
    }
    if (!node.implicit || node.resourceType === 'schedule' || node.isPublic) continue;
    const owner = ownerOf(node.id);
    membership.set(node.id, { foldInto: owner && ids.has(owner) ? owner : undefined });
  }
  return membership;
};

/** Whether the Infrastructure layer would add anything to this picture. A stack of functions and tables has none. */
export const hasInfrastructure = ({ scene, membership }: { scene: IsoScene; membership: ViewMembership }) =>
  membership.nodes.size > 0 ||
  scene.rectangles.length > 0 ||
  scene.nodes.some((node) => node.exposure) ||
  scene.connectors.some(
    (connector) =>
      connector.semantic === 'egress' ||
      membership.connectors.get(connector.id)?.infrastructure ||
      (membership.connectors.get(connector.id)?.infrastructureLabel && connector.label)
  );

// ── Folding ──

/**
 * The visible node each node is drawn as: itself when shown, else what it folds into, or null when nothing it folds
 * into is shown.
 */
export const createResolver = ({
  membership,
  isShown
}: {
  membership: ViewMembership;
  isShown: (nodeId: string) => boolean;
}) => {
  const resolved = new Map<string, string | null>();
  return (nodeId: string): string | null => {
    const known = resolved.get(nodeId);
    if (known !== undefined) return known;
    let current: string | undefined = nodeId;
    const seen = new Set<string>();
    while (current && !isShown(current) && !seen.has(current)) {
      seen.add(current);
      current = membership.nodes.get(current)?.foldInto;
    }
    const result = current && isShown(current) ? current : null;
    resolved.set(nodeId, result);
    return result;
  };
};

type FoldableNode = Pick<IsoNode, 'id' | 'label' | 'connections'>;

/**
 * Each shown node's connections as the picture draws them: a hidden node's connections move to the node it folds into,
 * and a connection to a hidden node is listed under the visible node that stands for it. Outbound traffic is only for
 * the Infrastructure layer.
 */
export const foldConnections = ({
  nodes,
  isShown,
  resolve,
  infrastructure
}: {
  nodes: readonly FoldableNode[];
  isShown: (nodeId: string) => boolean;
  resolve: (nodeId: string) => string | null;
  infrastructure: boolean;
}): Map<string, IsoNodeConnection[]> => {
  const connectionShown = (connection: IsoNodeConnection) => infrastructure || connection.semantic !== 'egress';
  const foldedInto = new Map<string, string[]>();
  for (const node of nodes) {
    if (isShown(node.id)) continue;
    const target = resolve(node.id);
    if (target) foldedInto.set(target, [...(foldedInto.get(target) ?? []), node.id]);
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const labelOf = (nodeId: string) => nodeById.get(nodeId)?.label ?? nodeId;
  const remapConnections = (owner: string, connections: IsoNodeConnection[]) =>
    connections.flatMap((connection): IsoNodeConnection[] => {
      if (!connectionShown(connection)) return [];
      const other = resolve(connection.nodeId);
      if (!other || other === owner) return [];
      if (other === connection.nodeId) return [connection];
      // A hidden node is reached through its owner, under the owner's name.
      return [{ ...connection, nodeId: other, name: labelOf(other) }];
    });

  const result = new Map<string, IsoNodeConnection[]>();
  for (const node of nodes) {
    if (!isShown(node.id)) continue;
    const absorbed = (foldedInto.get(node.id) ?? []).flatMap((id) => nodeById.get(id)?.connections ?? []);
    const seen = new Set<string>();
    result.set(
      node.id,
      remapConnections(node.id, [...node.connections, ...absorbed]).filter((connection) => {
        const key = `${connection.direction}|${connection.semantic}|${connection.nodeId}|${connection.text ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
    );
  }
  return result;
};

// ── Folded connectors ──

export type ViewGeometry = {
  nodes: ReadonlyMap<string, LayoutNode>;
  measureLabel: (text: string) => LayoutConnectorLabel;
};

/** Room kept between a folded connector and the bodies and names it passes, in projected units. */
const FOLD_MARGIN = 0.25;
/** How far a folded connector may run inside its own end nodes' footprints, in tiles. */
const END_CLEARANCE = 0.66;
/** How far from its ends a chip sits at least, in tiles. */
const CHIP_SKIP = 1.1;

const grow = (box: ProjectedBox, margin: number): ProjectedBox => ({
  u0: box.u0 - margin,
  u1: box.u1 + margin,
  v0: box.v0 - margin,
  v1: box.v1 + margin
});

/**
 * Gives each folded connector the simplest route the hidden nodes leave free: a connector joined through a hidden
 * node's spot would otherwise zigzag around an empty place. Routes keep clear of every shown body, name and chip; a
 * chip that is no longer on its route moves onto it.
 */
const straightenFolds = ({
  scene,
  isShown,
  connectors,
  folds,
  geometry
}: {
  scene: IsoScene;
  isShown: (nodeId: string) => boolean;
  connectors: IsoConnector[];
  folds: ReadonlySet<IsoConnector>;
  geometry: ViewGeometry;
}) => {
  const placed = new Map<string, { bodies: ProjectedBox[]; tags: ProjectedBox[] }>();
  for (const node of scene.nodes) {
    const layoutNode = geometry.nodes.get(node.id);
    if (!layoutNode || !isShown(node.id)) continue;
    const { u, v } = projectTile(node.tile);
    const shapes = nodeShapes(layoutNode).map((box) => shiftBox({ box, u, v }));
    placed.set(node.id, { bodies: shapes.slice(0, BODY_SHAPES), tags: shapes.slice(BODY_SHAPES) });
  }
  const chipBox = (connector: IsoConnector) => {
    if (!connector.label) return undefined;
    const size = geometry.measureLabel(connector.label);
    const { u, v } = projectTile(connector.route.labelTile);
    return { u0: u - size.halfWidth, u1: u + size.halfWidth, v0: v - size.halfHeight, v1: v + size.halfHeight };
  };
  const chips = new Map<IsoConnector, ProjectedBox>();
  for (const connector of connectors) {
    const box = chipBox(connector);
    if (box && !folds.has(connector)) chips.set(connector, box);
  }

  for (const connector of folds) {
    const obstacles: ProjectedBox[] = [];
    for (const [id, shapes] of placed) {
      if (id === connector.from || id === connector.to) continue;
      for (const box of [...shapes.bodies, ...shapes.tags]) obstacles.push(grow(box, FOLD_MARGIN));
    }
    for (const box of chips.values()) obstacles.push(box);
    const points = findDirectRoute({ current: connector.route.points, obstacles, endClearance: END_CLEARANCE });
    if (points !== connector.route.points) connector.route = { ...connector.route, points };
    if (!connector.label) continue;
    const size = geometry.measureLabel(connector.label);
    const chip = { u0: -size.halfWidth, u1: size.halfWidth, v0: -size.halfHeight, v1: size.halfHeight };
    if (!onRoute(connector.route.labelTile, connector.route.points)) {
      const everything = [...placed.values()].flatMap((shapes) => shapes.bodies.concat(shapes.tags));
      const labelTile = placeChipOnRoute({
        route: connector.route.points,
        chip,
        skip: CHIP_SKIP,
        blockedArea: (box) => coveredArea(box, everything) + coveredArea(box, [...chips.values()])
      });
      if (labelTile) connector.route = { ...connector.route, labelTile };
    }
    const box = chipBox(connector);
    if (box) chips.set(connector, box);
  }
};

const onRoute = (point: IsoTilePoint, route: readonly IsoTilePoint[]) =>
  route.slice(0, -1).some((start, index) => {
    const end = route[index + 1];
    const epsilon = 1e-3;
    return (
      point.x >= Math.min(start.x, end.x) - epsilon &&
      point.x <= Math.max(start.x, end.x) + epsilon &&
      point.y >= Math.min(start.y, end.y) - epsilon &&
      point.y <= Math.max(start.y, end.y) + epsilon
    );
  });

// ── Selection ──

/** Joins route pieces end to start into one route. */
const joinRoutes = (pieces: IsoTilePoint[][]) => simplifyRoute(pieces.flat());

export type ViewSelection = {
  scene: IsoScene;
  /** The visible node each node of the full picture is drawn as, or null when the view drops it. */
  resolve: (nodeId: string) => string | null;
};

/**
 * The full scene with or without its Infrastructure layer. Positions are untouched; hidden nodes fold into their owners
 * and their connectors are rerouted through the hidden node's spot. The Access layer is added afterwards, from the
 * deployment, by `security-view.ts`.
 */
export const selectView = ({
  scene,
  membership,
  infrastructure,
  geometry
}: {
  scene: IsoScene;
  membership: ViewMembership;
  infrastructure: boolean;
  /**
   * What each node occupies and how big a chip is, as the layout reserved them. With it, a folded connector takes the
   * simplest route the hidden nodes leave free instead of running through their spots.
   */
  geometry?: ViewGeometry | undefined;
}): ViewSelection => {
  const isShown = (nodeId: string) => infrastructure || !membership.nodes.has(nodeId);
  const resolve = createResolver({ membership, isShown });

  const connectorShown = (connector: IsoConnector) =>
    infrastructure || !(connector.semantic === 'egress' || membership.connectors.get(connector.id)?.infrastructure);

  // Routes between a hidden node and the node it folds into, to extend a folded connector through the hidden spot.
  const directRoute = (from: string, to: string): IsoTilePoint[] | undefined => {
    for (const connector of scene.connectors) {
      if (connector.from === from && connector.to === to) return connector.route.points;
      if (connector.from === to && connector.to === from) return [...connector.route.points].reverse();
    }
    return undefined;
  };
  const tileOf = new Map(scene.nodes.map((node) => [node.id, node.tile]));
  /**
   * The route between two nodes: their own connector, else the connectors through hidden nodes between them (a CDN
   * reaches its service through the hidden load balancer), else an orthogonal jog between the two spots.
   */
  const routeBetween = (from: string, to: string): IsoTilePoint[] => {
    const direct = directRoute(from, to);
    if (direct) return direct;
    const previous = new Map<string, string>([[from, from]]);
    const queue = [from];
    while (queue.length > 0 && !previous.has(to)) {
      const current = queue.shift() as string;
      for (const connector of scene.connectors) {
        const next = connector.from === current ? connector.to : connector.to === current ? connector.from : undefined;
        if (!next || previous.has(next) || (next !== to && isShown(next))) continue;
        previous.set(next, current);
        queue.push(next);
      }
    }
    if (previous.has(to)) {
      const path = [to];
      while (path[0] !== from) path.unshift(previous.get(path[0]) as string);
      return joinRoutes(path.slice(1).map((node, index) => directRoute(path[index], node) ?? []));
    }
    const start = tileOf.get(from);
    const end = tileOf.get(to);
    if (!start || !end) return [];
    const middle = (start.x + end.x) / 2;
    return simplifyRoute([start, { x: middle, y: start.y }, { x: middle, y: end.y }, end]);
  };
  /** The path from a visible node to a hidden one that folds into it, through any hidden nodes between. */
  const pathFromOwner = (owner: string, hidden: string): IsoTilePoint[] => {
    const chain: string[] = [hidden];
    let current = membership.nodes.get(hidden)?.foldInto;
    while (current && current !== owner && chain.length < 8) {
      chain.push(current);
      current = membership.nodes.get(current)?.foldInto;
    }
    chain.push(owner);
    const pieces: IsoTilePoint[][] = [];
    for (let index = chain.length - 1; index > 0; index--) pieces.push(routeBetween(chain[index], chain[index - 1]));
    return joinRoutes(pieces);
  };

  const connectors: IsoConnector[] = [];
  const byKey = new Map<string, IsoConnector>();
  const folds = new Set<IsoConnector>();
  for (const connector of scene.connectors) {
    if (!connectorShown(connector)) continue;
    const from = resolve(connector.from);
    const to = resolve(connector.to);
    if (!from || !to || from === to) continue;
    const hiddenLabel = membership.connectors.get(connector.id)?.infrastructureLabel && !infrastructure;
    const label = hiddenLabel ? undefined : connector.label;
    const folded = from !== connector.from || to !== connector.to;
    const points = folded
      ? joinRoutes([
          from !== connector.from ? pathFromOwner(from, connector.from) : [],
          connector.route.points,
          to !== connector.to ? [...pathFromOwner(to, connector.to)].reverse() : []
        ])
      : connector.route.points;
    const key = `${from}->${to}::${connector.semantic}`;
    const existing = byKey.get(key);
    if (existing) {
      // Two connectors that fold onto the same pair become one; it keeps the first route and the first label.
      if (!existing.label && label) {
        existing.label = label;
        existing.route = { ...existing.route, labelTile: connector.route.labelTile };
      }
      continue;
    }
    const next: IsoConnector = {
      ...connector,
      from,
      to,
      label,
      route: { points: points.length >= 2 ? points : connector.route.points, labelTile: connector.route.labelTile }
    };
    byKey.set(key, next);
    connectors.push(next);
    if (folded) folds.add(next);
  }
  if (geometry && folds.size > 0) straightenFolds({ scene, isShown, connectors, folds, geometry });

  const connections = foldConnections({ nodes: scene.nodes, isShown, resolve, infrastructure });
  const nodes: IsoNode[] = scene.nodes
    .filter((node) => isShown(node.id))
    .map((node) =>
      Object.assign({}, node, {
        connections: connections.get(node.id) ?? [],
        exposure: infrastructure ? node.exposure : undefined
      })
    );

  return {
    scene: {
      ...scene,
      nodes,
      connectors,
      rectangles: infrastructure ? scene.rectangles : [],
      labels: infrastructure ? scene.labels : []
    },
    resolve
  };
};
