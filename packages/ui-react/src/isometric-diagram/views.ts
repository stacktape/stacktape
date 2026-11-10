/**
 * Views: which parts of one laid-out picture a reader sees.
 *
 * The layout runs once, on every node, connector and zone the topology has, so a node keeps its exact place whichever
 * view shows it. A view only hides things. Three presets cover what most readers ask: Application (your resources and
 * how requests and events flow), Network (the VPC, its subnets, NAT and the infrastructure Stacktape creates) and
 * Security (security groups and the traffic their rules allow, firewalls, authorizers and IAM access). Overlays are the
 * individual switches behind the presets; changing one leaves the presets ("Custom").
 *
 * A Stacktape-created node that a view hides folds into the resource that owns it: the per-service gateway of a web
 * service folds into the service, so the user's connector runs through the gateway's empty spot into the service. A
 * hidden node with no owner (the NAT) takes its connectors with it.
 */
import type { IsoConnector, IsoNode, IsoNodeConnection, IsoScene, IsoTilePoint } from './scene.js';
import type { TopologyNode } from './topology.js';
import { simplifyRoute } from './layout/diagram-layout.js';

export type DiagramView = 'application' | 'network' | 'security';

export const DIAGRAM_VIEWS: readonly DiagramView[] = ['application', 'network', 'security'];

export const DIAGRAM_VIEW_NAMES: Record<DiagramView, string> = {
  application: 'Application',
  network: 'Network',
  security: 'Security'
};

/**
 * - `createdResources`: resources Stacktape creates for you (per-service gateways and load balancers, CDNs, an SSR
 *   site's server function and assets bucket, Convex's parts). Off, each folds into the resource that owns it.
 * - `network`: the VPC and subnet tiers, the edge network, the NAT and outbound traffic, load balancer exposure and
 *   VPC Links.
 * - `securityGroups`: security groups of a deployed stage and the traffic their rules allow.
 * - `permissions`: `connectTo` and other references, which grant IAM access.
 * - `labels`: connector labels.
 */
export type DiagramOverlay = 'createdResources' | 'network' | 'securityGroups' | 'permissions' | 'labels';

export type DiagramOverlays = Readonly<Record<DiagramOverlay, boolean>>;

export const DIAGRAM_OVERLAYS: readonly DiagramOverlay[] = [
  'createdResources',
  'network',
  'securityGroups',
  'permissions',
  'labels'
];

export const DIAGRAM_OVERLAY_NAMES: Record<DiagramOverlay, string> = {
  createdResources: 'Stacktape-created resources',
  network: 'VPC & subnets',
  securityGroups: 'Security groups',
  permissions: 'Permissions (connectTo)',
  labels: 'Connector labels'
};

export const VIEW_PRESETS: Record<DiagramView, DiagramOverlays> = {
  application: { createdResources: false, network: false, securityGroups: false, permissions: true, labels: true },
  network: { createdResources: true, network: true, securityGroups: false, permissions: true, labels: true },
  security: { createdResources: true, network: false, securityGroups: true, permissions: true, labels: true }
};

/** Everything on: the picture the layout is computed for. */
export const ALL_OVERLAYS: DiagramOverlays = {
  createdResources: true,
  network: true,
  securityGroups: true,
  permissions: true,
  labels: true
};

/** The preset these overlays are, or undefined for a custom combination. */
export const presetOf = (overlays: DiagramOverlays): DiagramView | undefined =>
  DIAGRAM_VIEWS.find((view) => DIAGRAM_OVERLAYS.every((overlay) => VIEW_PRESETS[view][overlay] === overlays[overlay]));

export const isDiagramView = (value: unknown): value is DiagramView =>
  typeof value === 'string' && (DIAGRAM_VIEWS as readonly string[]).includes(value);

// ── Membership ──

/** Which overlay shows a node, and what it folds into when that overlay is off. */
export type NodeMembership = { overlay?: 'createdResources' | 'network' | undefined; foldInto?: string | undefined };

/** Which overlay shows a connector; `networkLabel` marks a label only the network overlay shows ("VPC Link"). */
export type ConnectorMembership = { overlay?: 'network' | 'permissions' | undefined; networkLabel?: boolean };

export type ViewMembership = {
  nodes: Map<string, NodeMembership>;
  connectors: Map<string, ConnectorMembership>;
};

/** The resource an implicit node belongs to: implicit IDs are `<owner>--<part>`, and resource names never hold `--`. */
const ownerOf = (nodeId: string) => {
  const index = nodeId.indexOf('--');
  return index > 0 ? nodeId.slice(0, index) : undefined;
};

/**
 * Sorts the topology's nodes into overlays. The schedule node is a trigger, not infrastructure, and stays in every
 * view, as does any implicit data store open to the internet: its `public` badge is never hidden.
 */
export const classifyNodes = (nodes: readonly TopologyNode[]): Map<string, NodeMembership> => {
  const ids = new Set(nodes.map((node) => node.id));
  const membership = new Map<string, NodeMembership>();
  for (const node of nodes) {
    if (node.resourceType === 'nat-gateway') {
      membership.set(node.id, { overlay: 'network' });
      continue;
    }
    if (!node.implicit || node.resourceType === 'schedule' || node.isPublic) continue;
    const owner = ownerOf(node.id);
    membership.set(node.id, { overlay: 'createdResources', foldInto: owner && ids.has(owner) ? owner : undefined });
  }
  return membership;
};

export const connectorOverlay = (semantic: string | undefined): ConnectorMembership['overlay'] =>
  semantic === 'egress' ? 'network' : semantic === 'dependency' ? 'permissions' : undefined;

// ── Selection ──

/** Joins route pieces end to start into one route. */
const joinRoutes = (pieces: IsoTilePoint[][]) => simplifyRoute(pieces.flat());

export type ViewSelection = {
  scene: IsoScene;
  /** The visible node each node of the full picture is drawn as, or null when the view drops it. */
  resolve: (nodeId: string) => string | null;
};

/**
 * The part of the full scene these overlays show. Positions are untouched; hidden nodes fold into their owners and
 * their connectors are rerouted through the hidden node's spot. Security groups are added afterwards, from the
 * deployment, by `security-view.ts`.
 */
export const selectView = ({
  scene,
  membership,
  overlays
}: {
  scene: IsoScene;
  membership: ViewMembership;
  overlays: DiagramOverlays;
}): ViewSelection => {
  const isShown = (nodeId: string) => {
    const overlay = membership.nodes.get(nodeId)?.overlay;
    return !overlay || overlays[overlay];
  };
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

  const connectorShown = (connector: IsoConnector) => {
    const overlay = membership.connectors.get(connector.id)?.overlay ?? connectorOverlay(connector.semantic);
    return !overlay || overlays[overlay];
  };

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
    const networkOnlyLabel = membership.connectors.get(connector.id)?.networkLabel && !overlays.network;
    const label = overlays.labels && !networkOnlyLabel ? connector.label : undefined;
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

  const connectionShown = (connection: IsoNodeConnection) =>
    !(connection.semantic === 'egress' && !overlays.network) &&
    !(connection.semantic === 'dependency' && !overlays.permissions);
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
      return Object.assign({}, node, { connections, exposure: overlays.network ? node.exposure : undefined });
    });

  return {
    scene: {
      ...scene,
      nodes,
      connectors,
      rectangles: overlays.network ? scene.rectangles : [],
      labels: overlays.network ? scene.labels : []
    },
    resolve
  };
};
