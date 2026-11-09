/**
 * Scene composition: semantic topology → `IsoScene`.
 *
 * This stage decides what the layout has to respect — which edges carry the flow, which nodes are
 * sources or sinks, which zones exist and how much room flat text needs — and turns the engine's
 * tile-space result into scene nodes, zone rectangles and connectors. The engine itself lives in
 * `layout/`. `buildIsometricScene` is pure: the caller's parsed config is only ever read.
 */
import type { StacktapeConfig } from '@stacktape/config';
import type { DiagramLayout, DiagramLayoutInput, LayoutNode, LayoutZone } from './layout/diagram-layout.js';
import type { ProjectedBox } from './layout/projected-box.js';
import type { IsoConnector, IsoLabel, IsoNode, IsoRectangle, IsoScene, PedestalType } from './scene.js';
import type { DiagramTopology, TopologyEdge, TopologyNode } from './topology.js';
import { getResourceIconUrl } from '../resource-icon/isopack.js';
import { layoutDiagram } from './layout/diagram-layout.js';
import { RESOURCE_EXPLANATIONS, ZONE_EXPLANATIONS } from './resource-explanations.js';
import { buildDiagramTopology } from './topology.js';

type LayoutPlacement = {
  x: number;
  y: number;
};

// ── Color / pedestal maps (unchanged rendering config) ──
// The semantic assignment lives in the shared resource-icon catalog; only this diagram path loads
// the comparatively large isopack assets that resolve those assignments to image URLs.

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
  redis: '#527FFF',
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
  redis: 'database',
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

const getBlockColor = (type: string) => BLOCK_COLORS[type] || '#e6e7e8';
const getPedestal = (type: string) => PEDESTAL_MAP[type] || 'default';

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
  'user-auth-pool'
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
  'batch-job'
]);

/** Whether an edge places its target one column after its source. Events from data stores never do. */
const isFlowEdge = ({ edge, nodeById }: { edge: TopologyEdge; nodeById: Map<string, TopologyNode> }) => {
  const from = nodeById.get(edge.from);
  const to = nodeById.get(edge.to);
  if (!from || !to || DATA_STORE_TYPES.has(from.resourceType)) return false;
  if (edge.semantic === 'request' || edge.semantic === 'event' || edge.semantic === 'egress') return true;
  return FLOW_TARGET_TYPES.has(to.resourceType);
};

// The renderer's geometry and text, converted to the layout's units. A node block is `NODE_FOOTPRINT`
// tiles square. Projected units are 40 px wide (`u`) and 20 px tall (`v`) at zoom 1.
const NODE_FOOTPRINT = 1.32;
const U_PX = 40;
const V_PX = 20;
/** Room above the floor for the tallest body shapes (about 40 px) and the replica badge. */
const BODY_LIFT_PX = 44;
const USER_LIFT_PX = 48;
/** The name tag: up to 20 characters of 12 px semibold text, plus a short muted type line below it. */
const NAME_CHAR_PX = 7.4;
const NAME_MAX_CHARS = 20;
const TYPE_CHAR_PX = 5.6;
const TYPE_MAX_CHARS = 16;
const NAME_TAG_HEIGHT_PX = 36;
/** Connector chips: 10 px text with 6 px padding, 18 px tall. */
const CHIP_CHAR_PX = 6.6;
const CHIP_PADDING_PX = 12;
const CHIP_HEIGHT_PX = 18;
const CHIP_MARGIN_PX = 4;

const toLayoutNode = ({ node, zone }: { node: TopologyNode; zone: string | undefined }): LayoutNode => {
  const nameWidth = Math.min(node.label.length, NAME_MAX_CHARS) * NAME_CHAR_PX;
  const typeWidth = Math.min(RESOURCE_EXPLANATIONS[node.resourceType]?.name.length ?? 0, TYPE_MAX_CHARS) * TYPE_CHAR_PX;
  return {
    id: node.id,
    width: NODE_FOOTPRINT,
    depth: NODE_FOOTPRINT,
    lift: (node.resourceType === 'user' ? USER_LIFT_PX : BODY_LIFT_PX) / V_PX,
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

/** A zone tag hangs 14 px under the zone's front tip, centered on it. */
const getZoneTagBox = (zoneId: string): ProjectedBox | undefined => {
  const def = CONTAINERS.get(zoneId);
  const text = ZONE_EXPLANATIONS[zoneId]?.name ?? zoneId;
  if (!def) return undefined;
  const halfWidth = (text.length * def.fontSize * 0.62) / 2 / U_PX;
  return { u0: -halfWidth, u1: halfWidth, v0: -(14 + def.fontSize) / V_PX, v1: -(14 - def.fontSize) / V_PX };
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
    zoneTag: getZoneTagBox
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
    // The label anchor is the zone's FRONT TIP — the lowest vertex of its diamond. The renderer
    // hangs a horizontal screen-space tag just below it, drawn above all scene geometry, so the zone
    // name can never be occluded and unambiguously touches its own boundary.
    labels.push({
      id: `${def.id}-label`,
      tile: rect.from,
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
