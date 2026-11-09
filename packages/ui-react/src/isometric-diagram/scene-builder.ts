/**
 * Scene composition: semantic topology → `IsoScene`.
 *
 * This stage decides what the layout has to respect — which edges carry the flow, which nodes are
 * sources or sinks, which zones exist and how much room flat text needs — and turns the engine's
 * tile-space result into scene nodes, zone rectangles and connectors. The engine itself lives in
 * `layout/`. `buildIsometricScene` is pure: the caller's parsed config is only ever read.
 */
import type { StacktapeConfig } from '@stacktape/config';
import type {
  DiagramLayout,
  DiagramLayoutInput,
  LayoutNode,
  LayoutZone,
  ZoneTagSize
} from './layout/diagram-layout.js';
import type { IsoConnector, IsoLabel, IsoNode, IsoRectangle, IsoScene } from './scene.js';
import type { DiagramTopology, TopologyEdge, TopologyNode } from './topology.js';
import { layoutDiagram } from './layout/diagram-layout.js';
import {
  BADGE_HEIGHT_PX,
  BADGE_OFFSET_PX,
  getNodeAppearance,
  hasBadge,
  NAME_MAX_CHARS,
  SHAPE_HEIGHT_PX,
  TYPE_MAX_CHARS
} from './node-appearance.js';
import { RESOURCE_EXPLANATIONS, ZONE_EXPLANATIONS } from './resource-explanations.js';
import { buildDiagramTopology } from './topology.js';

type LayoutPlacement = {
  x: number;
  y: number;
};

// ── What the layout must respect ──

/** Sinks: they share the last column, and events they emit are drawn as back edges. */
const DATA_STORE_TYPES = new Set([
  'relational-database',
  'dynamo-db-table',
  'redis',
  'mongo-db-atlas-cluster',
  'upstash-redis',
  'open-search-domain',
  'bucket',
  'efs-filesystem',
  'user-auth-pool',
  'dsql-database',
  'agentcore-memory'
]);

/**
 * A `connectTo` into one of these sends work to it — a producer publishing to a channel, or one
 * workload calling another — so the caller comes first. Other `connectTo` targets (data stores,
 * gateways) do not move anything.
 */
const FLOW_TARGET_TYPES = new Set([
  'sqs-queue',
  'sns-topic',
  'event-bus',
  'kinesis-stream',
  'state-machine',
  'function',
  'web-service',
  'private-service',
  'worker-service',
  'multi-container-workload',
  'batch-job',
  'kafka-cluster',
  'email-sender',
  'convex',
  'agentcore-runtime',
  'agentcore-gateway',
  'agentcore-browser',
  'agentcore-code-interpreter'
]);

/** Whether an edge places its target one column after its source. Events from data stores never do. */
const isFlowEdge = ({ edge, nodeById }: { edge: TopologyEdge; nodeById: Map<string, TopologyNode> }) => {
  const from = nodeById.get(edge.from);
  const to = nodeById.get(edge.to);
  if (!from || !to || DATA_STORE_TYPES.has(from.resourceType)) return false;
  if (edge.semantic === 'request' || edge.semantic === 'event' || edge.semantic === 'egress') return true;
  // A firewall stands in front of what it protects. Other security edges (an authorizer function, a user pool)
  // follow the general rule.
  if (edge.semantic === 'security' && from.resourceType === 'web-app-firewall') return true;
  return FLOW_TARGET_TYPES.has(to.resourceType);
};

// The renderer's geometry and text, converted to the layout's units. A node block is `NODE_FOOTPRINT`
// tiles square. Projected units are 40 px wide (`u`) and 20 px tall (`v`) at zoom 1.
const NODE_FOOTPRINT = 1.32;
const U_PX = 40;
const V_PX = 20;
/** Room above a shape's top: a small margin, or the badge (replica range or `public`) that sits there. */
const BODY_MARGIN_PX = 4;
const BADGE_ROOM_PX = BADGE_OFFSET_PX + BADGE_HEIGHT_PX / 2 + 1;
/**
 * The name tag: the name in 12 px semibold and the muted type line in 10 px under it, as the renderer truncates them.
 * Measured in Chromium, names stay under 7.4 px per character and type lines under 5.6 px. The two lines end 31 px below
 * the front tip, plus the halo.
 */
const NAME_CHAR_PX = 7.4;
const TYPE_CHAR_PX = 5.6;
const NAME_TAG_HEIGHT_PX = 34;
/** Connector chips: 10 px text with 6 px padding, 18 px tall. */
const CHIP_CHAR_PX = 6.6;
const CHIP_PADDING_PX = 12;
const CHIP_HEIGHT_PX = 18;
const CHIP_MARGIN_PX = 4;

const toLayoutNode = ({ node, zone }: { node: TopologyNode; zone: string | undefined }): LayoutNode => {
  const nameWidth = Math.min(node.label.length, NAME_MAX_CHARS) * NAME_CHAR_PX;
  const typeWidth = Math.min(node.typeLabel?.length ?? 0, TYPE_MAX_CHARS) * TYPE_CHAR_PX;
  const { shape } = getNodeAppearance(node.resourceType);
  const above = hasBadge({ shape, replicas: node.replicas, isPublic: node.isPublic }) ? BADGE_ROOM_PX : BODY_MARGIN_PX;
  return {
    id: node.id,
    width: NODE_FOOTPRINT,
    depth: NODE_FOOTPRINT,
    lift: (SHAPE_HEIGHT_PX[shape] + above) / V_PX,
    tag: { halfWidth: Math.max(nameWidth, typeWidth) / 2 / U_PX, height: NAME_TAG_HEIGHT_PX / V_PX },
    rank: node.layer === 'external' ? 'first' : DATA_STORE_TYPES.has(node.resourceType) ? 'last' : undefined,
    zone
  };
};

// ── Zones ──

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

const EDGE_CONTAINER: ContainerDef = {
  id: 'zone-edge',
  color: 'rgba(161, 102, 255, 0.05)',
  borderColor: 'rgba(161, 102, 255, 0.18)',
  fontSize: 11
};

/** Back to front: the edge network, then the VPC with its public tier behind the private one. */
const ZONES: LayoutZone[] = [
  { id: EDGE_CONTAINER.id },
  { id: VPC_CONTAINER.id },
  { id: SUBNET_CONTAINERS.public.id, parent: VPC_CONTAINER.id },
  { id: SUBNET_CONTAINERS.private.id, parent: VPC_CONTAINER.id }
];
const CONTAINERS = new Map(
  [EDGE_CONTAINER, VPC_CONTAINER, ...Object.values(SUBNET_CONTAINERS)].map((def) => [def.id, def])
);

/** The innermost zone of a node. Regional services such as SQS never sit in a fictional zone. */
const getZone = (node: TopologyNode) => {
  if (node.subnet) return SUBNET_CONTAINERS[node.subnet].id;
  return node.layer === 'edge' ? EDGE_CONTAINER.id : undefined;
};

/**
 * A zone tag is a strip of bold text laid along a zone edge. Measured in Chromium, its characters stay under 0.72 em
 * with the 0.4 px letter spacing. Along an edge one tile spans `hypot(U_PX, V_PX)` px; across it, a tile of the
 * perpendicular axis spans `2 · U_PX · V_PX / hypot(U_PX, V_PX)` px.
 */
const ZONE_TAG_CHAR_EM = 0.74;
const TILE_ALONG_EDGE_PX = Math.hypot(U_PX, V_PX);
const TILE_ACROSS_EDGE_PX = (2 * U_PX * V_PX) / Math.hypot(U_PX, V_PX);

const getZoneTagSize = (zoneId: string): ZoneTagSize | undefined => {
  const def = CONTAINERS.get(zoneId);
  if (!def) return undefined;
  const text = ZONE_EXPLANATIONS[zoneId]?.name ?? zoneId;
  return {
    length: (text.length * def.fontSize * ZONE_TAG_CHAR_EM) / TILE_ALONG_EDGE_PX,
    thickness: (def.fontSize + 3) / TILE_ACROSS_EDGE_PX
  };
};

const buildLayoutInput = (topology: DiagramTopology): DiagramLayoutInput => {
  const nodeById = new Map(topology.nodes.map((node) => [node.id, node]));
  return {
    nodes: topology.nodes.map((node) => toLayoutNode({ node, zone: getZone(node) })),
    edges: topology.edges.map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      flow: isFlowEdge({ edge, nodeById }),
      bundle: edge.semantic,
      label: edge.label
    })),
    zones: ZONES,
    measureLabel: (text) => ({
      halfWidth: (text.length * CHIP_CHAR_PX + CHIP_PADDING_PX + CHIP_MARGIN_PX) / 2 / U_PX,
      halfHeight: (CHIP_HEIGHT_PX + CHIP_MARGIN_PX) / 2 / V_PX
    }),
    zoneTag: getZoneTagSize
  };
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
      typeLabel: node.typeLabel,
      tile: placement,
      isImplicit: node.implicit,
      ...getNodeAppearance(node.resourceType),
      replicas: node.replicas,
      isPublic: node.isPublic
    });
  }

  return sceneNodes;
};

const buildRectanglesAndLabels = ({ topology, layout }: { topology: DiagramTopology; layout: DiagramLayout }) => {
  const rectangles: IsoRectangle[] = [];
  const labels: IsoLabel[] = [];
  const membersOf = (zoneId: string) =>
    topology.nodes
      .filter((node) => (zoneId === VPC_CONTAINER.id ? node.subnet !== null : getZone(node) === zoneId))
      .map((node) => node.id);

  for (const zone of ZONES) {
    const rect = layout.zones.get(zone.id);
    const def = CONTAINERS.get(zone.id);
    if (!rect || !def) continue;
    const explanation = ZONE_EXPLANATIONS[def.id];
    rectangles.push({
      id: def.id,
      from: rect.from,
      to: rect.to,
      color: def.color,
      borderColor: def.borderColor,
      label: explanation?.name ?? def.id,
      summary: explanation?.summary,
      details: explanation?.details,
      memberNodeIds: membersOf(def.id)
    });
    // The layout lays the name along one of the zone's edges, inside it where nothing covers that spot.
    const tag = layout.zoneTags.get(zone.id);
    labels.push({
      id: `${def.id}-label`,
      tile: tag?.start ?? rect.from,
      axis: tag?.axis ?? 'y',
      text: explanation?.name ?? def.id,
      color: def.borderColor.replace(/0\.\d+\)$/, '0.9)'),
      fontSize: def.fontSize
    });
  }

  return { rectangles, labels };
};

// ── Main entry point ──

export const buildIsometricScene = ({ parsedConfig }: { parsedConfig: StacktapeConfig | null }): IsoScene | null => {
  const topology = buildDiagramTopology({ parsedConfig });
  if (!topology || topology.nodes.length === 0) return null;

  const layout = layoutDiagram(buildLayoutInput(topology));
  const sceneNodes = buildSceneNodes({ topology, placements: layout.nodes });
  const { rectangles, labels } = buildRectanglesAndLabels({ topology, layout });
  const connectors: IsoConnector[] = topology.edges.flatMap((edge) => {
    const route = layout.edges.get(edge.id);
    if (!route) return [];
    return [
      {
        id: edge.id,
        from: edge.from,
        to: edge.to,
        label: edge.label,
        semantic: edge.semantic,
        description: edge.description,
        route: { points: route.points, labelTile: route.labelTile }
      }
    ];
  });

  return {
    nodes: sceneNodes,
    connectors,
    rectangles,
    labels
  };
};
