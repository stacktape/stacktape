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
import type { IsoConnector, IsoNode, IsoNodeConnection, IsoScene, IsoTilePoint } from './scene.js';
import type { TopologyNode } from './topology.js';
import { simplifyRoute } from './layout/diagram-layout.js';

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
  infrastructure
}: {
  scene: IsoScene;
  membership: ViewMembership;
  infrastructure: boolean;
}): ViewSelection => {
  const isShown = (nodeId: string) => infrastructure || !membership.nodes.has(nodeId);
  const resolved = new Map<string, string | null>();
  const resolve = (nodeId: string): string | null => {
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

  const connectorShown = (connector: IsoConnector) =>
    infrastructure || !(connector.semantic === 'egress' || membership.connectors.get(connector.id)?.infrastructure);

  // Routes between a hidden node and the node it folds into, to extend a folded connector through the hidden spot.
  const routeBetween = (from: string, to: string): IsoTilePoint[] | undefined => {
    for (const connector of scene.connectors) {
      if (connector.from === from && connector.to === to) return connector.route.points;
      if (connector.from === to && connector.to === from) return [...connector.route.points].reverse();
    }
    return undefined;
  };
  const tileOf = new Map(scene.nodes.map((node) => [node.id, node.tile]));
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
    for (let index = chain.length - 1; index > 0; index--) {
      const piece = routeBetween(chain[index], chain[index - 1]);
      const start = tileOf.get(chain[index]);
      const end = tileOf.get(chain[index - 1]);
      pieces.push(piece ?? [start, end].filter((point): point is IsoTilePoint => Boolean(point)));
    }
    return joinRoutes(pieces);
  };

  const connectors: IsoConnector[] = [];
  const byKey = new Map<string, IsoConnector>();
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
  }

  const connectionShown = (connection: IsoNodeConnection) => infrastructure || connection.semantic !== 'egress';
  const foldedInto = new Map<string, string[]>();
  for (const node of scene.nodes) {
    if (isShown(node.id)) continue;
    const target = resolve(node.id);
    if (target) foldedInto.set(target, [...(foldedInto.get(target) ?? []), node.id]);
  }
  const nodeById = new Map(scene.nodes.map((node) => [node.id, node]));
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

  const nodes: IsoNode[] = scene.nodes
    .filter((node) => isShown(node.id))
    .map((node) => {
      const absorbed = (foldedInto.get(node.id) ?? []).flatMap((id) => nodeById.get(id)?.connections ?? []);
      const seen = new Set<string>();
      const connections = remapConnections(node.id, [...node.connections, ...absorbed]).filter((connection) => {
        const key = `${connection.direction}|${connection.semantic}|${connection.nodeId}|${connection.text ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return Object.assign({}, node, { connections, exposure: infrastructure ? node.exposure : undefined });
    });

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
