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
import type { GroupedTopology } from './grouping.js';
import type { IsoConnector, IsoLabel, IsoNode, IsoRectangle, IsoScene } from './scene.js';
import type { SecurityGroupModel } from './security-groups.js';
import type { DiagramTopology, TopologyEdge, TopologyNode } from './topology.js';
import type { ConnectorMembership, DiagramLayers, ViewMembership } from './views.js';
import { groupTopology } from './grouping.js';
import { layoutDiagram } from './layout/diagram-layout.js';
import { addAccessLayer } from './security-view.js';
import { ALL_LAYERS, classifyNodes, selectView } from './views.js';
import {
  BADGE_HEIGHT_PX,
  BADGE_OFFSET_PX,
  getNameTagWidthPx,
  getNodeAppearance,
  hasBadge,
  SHAPE_HEIGHT_PX,
  STATUS_LINE_HEIGHT_PX,
  STATUS_MIN_WIDTH_PX
} from './node-appearance.js';
import { GROUP_EXPLANATION, RESOURCE_EXPLANATIONS, ZONE_EXPLANATIONS } from './resource-explanations.js';
import { buildSceneDetails } from './scene-details.js';
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
/** The name tag's two lines (`getNameTagWidthPx`) end 31 px below the front tip, plus the halo. */
const NAME_TAG_HEIGHT_PX = 34;
/** Connector chips: 10 px text with 6 px padding, 18 px tall. */
const CHIP_CHAR_PX = 6.6;
const CHIP_PADDING_PX = 12;
const CHIP_HEIGHT_PX = 18;
const CHIP_MARGIN_PX = 4;

const LOAD_BALANCER_TYPES = new Set(['application-load-balancer', 'network-load-balancer']);

/** Whether the internet reaches a load balancer. The Infrastructure layer marks it. */
const getExposure = (node: TopologyNode): IsoNode['exposure'] =>
  LOAD_BALANCER_TYPES.has(node.resourceType) ? (node.internal ? 'internal' : 'internet-facing') : undefined;

const CONTAINER_TYPES = new Set(['web-service', 'private-service', 'worker-service', 'multi-container-workload']);

/** An HTTP API reaches a container in the VPC through a VPC Link, which the Infrastructure layer labels. */
const isVpcLink = ({ edge, nodeById }: { edge: TopologyEdge; nodeById: Map<string, TopologyNode> }) =>
  edge.semantic === 'request' &&
  nodeById.get(edge.from)?.resourceType === 'http-api-gateway' &&
  CONTAINER_TYPES.has(nodeById.get(edge.to)?.resourceType ?? '');

const VPC_LINK_LABEL = 'VPC Link';

const toLayoutNode = ({
  node,
  zone,
  statusLines
}: {
  node: TopologyNode;
  zone: string | undefined;
  statusLines: boolean;
}): LayoutNode => {
  // A declared resource or group can report a status; its pill hangs under the name tag.
  const status = statusLines && !node.implicit;
  const tagWidth = Math.max(getNameTagWidthPx(node), status ? STATUS_MIN_WIDTH_PX : 0);
  const { shape } = getNodeAppearance(node.resourceType, { group: Boolean(node.memberIds) });
  const above = hasBadge({
    shape,
    replicas: node.replicas,
    isPublic: node.isPublic,
    exposure: getExposure(node),
    memberCount: node.memberIds?.length
  })
    ? BADGE_ROOM_PX
    : BODY_MARGIN_PX;
  return {
    id: node.id,
    width: NODE_FOOTPRINT,
    depth: NODE_FOOTPRINT,
    lift: (SHAPE_HEIGHT_PX[shape] + above) / V_PX,
    tag: {
      halfWidth: tagWidth / 2 / U_PX,
      height: (NAME_TAG_HEIGHT_PX + (status ? STATUS_LINE_HEIGHT_PX : 0)) / V_PX
    },
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

const buildLayoutInput = (topology: DiagramTopology, statusLines: boolean): DiagramLayoutInput => {
  const nodeById = new Map(topology.nodes.map((node) => [node.id, node]));
  return {
    nodes: topology.nodes.map((node) => toLayoutNode({ node, zone: getZone(node), statusLines })),
    edges: topology.edges.map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      flow: isFlowEdge({ edge, nodeById }),
      bundle: edge.semantic,
      // Room for the Infrastructure layer's "VPC Link" is kept in every picture.
      label: edge.label ?? (isVpcLink({ edge, nodeById }) ? VPC_LINK_LABEL : undefined)
    })),
    zones: ZONES,
    measureLabel: measureChip,
    zoneTag: getZoneTagSize
  };
};

// ── Scene building ──

const buildSceneNodes = ({
  topology,
  placements,
  details,
  memberGroup
}: {
  topology: DiagramTopology;
  placements: Map<string, LayoutPlacement>;
  details: ReturnType<typeof buildSceneDetails>;
  /** The group of each member drawn on its own because its group is expanded. */
  memberGroup: Map<string, string>;
}) => {
  const sceneNodes: IsoNode[] = [];

  for (const node of topology.nodes) {
    const placement = placements.get(node.id);
    if (!placement) continue;

    const isGroup = Boolean(node.memberIds);
    const explanation = isGroup ? GROUP_EXPLANATION[node.resourceType] : RESOURCE_EXPLANATIONS[node.resourceType];
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
      ...getNodeAppearance(node.resourceType, { group: isGroup }),
      replicas: node.replicas,
      isPublic: node.isPublic,
      exposure: getExposure(node),
      groupId: isGroup ? node.id : memberGroup.get(node.id),
      memberCount: node.memberIds?.length,
      connections: details.connections.get(node.id) ?? [],
      routes: details.routes.get(node.id),
      undrawnTriggers: node.undrawnTriggers?.map((trigger) => trigger.text)
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

/**
 * The whole picture, laid out once: every node, connector and zone any view can show. Views select from it without
 * moving anything (see `views.ts`).
 */
export type DiagramModel = {
  scene: IsoScene;
  membership: ViewMembership;
  /** The topology before grouping, whose node IDs security-group members map to. */
  base: DiagramTopology;
  grouped: GroupedTopology;
  /** What each node occupies on screen, for placing the Access layer's tags clear of it. */
  layoutNodes: Map<string, LayoutNode>;
};

export const buildDiagramModel = ({
  parsedConfig,
  expandedGroups,
  statusLines = false
}: {
  parsedConfig: StacktapeConfig | null;
  /** Role groups the reader has expanded; every other group is drawn as one node. */
  expandedGroups?: ReadonlySet<string> | undefined;
  /** Reserve a live-status line under every declared resource, so statuses can come and go without moving anything. */
  statusLines?: boolean | undefined;
}): DiagramModel | null => {
  const base = buildDiagramTopology({ parsedConfig });
  if (!base || base.nodes.length === 0) return null;

  const topology = groupTopology({ topology: base, expandedGroupIds: expandedGroups });
  const details = buildSceneDetails({ base, grouped: topology });
  const memberGroup = new Map(
    topology.groups.filter((group) => group.expanded).flatMap((group) => group.memberIds.map((id) => [id, group.id]))
  );
  const layoutInput = buildLayoutInput(topology, statusLines);
  const layout = layoutDiagram(layoutInput);
  const sceneNodes = buildSceneNodes({ topology, placements: layout.nodes, details, memberGroup });
  const { rectangles, labels } = buildRectanglesAndLabels({ topology, layout });
  const nodeById = new Map(topology.nodes.map((node) => [node.id, node]));
  const connectorMembership = new Map<string, ConnectorMembership>();
  const connectors: IsoConnector[] = topology.edges.flatMap((edge) => {
    const route = layout.edges.get(edge.id);
    if (!route) return [];
    const vpcLink = !edge.label && isVpcLink({ edge, nodeById });
    if (vpcLink) connectorMembership.set(edge.id, { infrastructureLabel: true });
    return [
      {
        id: edge.id,
        from: edge.from,
        to: edge.to,
        label: vpcLink ? VPC_LINK_LABEL : edge.label,
        count: edge.count,
        semantic: edge.semantic,
        description: vpcLink
          ? `${edge.description ?? ''} The VPC Link is the gateway’s private entry into the VPC.`.trim()
          : edge.description,
        route: { points: route.points, labelTile: route.labelTile }
      }
    ];
  });

  return {
    scene: { nodes: sceneNodes, connectors, rectangles, labels, groups: details.groups },
    membership: { nodes: classifyNodes(topology.nodes), connectors: connectorMembership },
    base,
    grouped: topology,
    layoutNodes: new Map(layoutInput.nodes.map((node) => [node.id, node]))
  };
};

/**
 * The scene one combination of layers shows. `security` is the deployed stage's security-group model, which the Access
 * layer reads; without it that layer adds nothing.
 */
export const selectDiagramView = ({
  model,
  layers,
  security
}: {
  model: DiagramModel;
  layers: DiagramLayers;
  security?: SecurityGroupModel | null | undefined;
}): IsoScene => {
  const selection = selectView({
    scene: model.scene,
    membership: model.membership,
    infrastructure: layers.infrastructure
  });
  if (!layers.access || !security) return selection.scene;
  return addAccessLayer({
    scene: selection.scene,
    resolve: selection.resolve,
    base: model.base,
    collapsedInto: model.grouped.collapsedInto,
    layoutNodes: model.layoutNodes,
    security,
    measureChip
  });
};

/**
 * The frame every picture of this model fits: the one with every layer on. Hosts and tests that switch layers pass it
 * along, so nothing moves or rescales.
 */
export const diagramFrame = ({
  model,
  security
}: {
  model: DiagramModel;
  security?: SecurityGroupModel | null | undefined;
}): IsoScene['frame'] => {
  const scene = selectDiagramView({ model, layers: ALL_LAYERS, security });
  // Tags sit above their nodes and can differ without the Infrastructure layer, whose nodes then fold into others.
  const tagged = [scene, selectDiagramView({ model, layers: { infrastructure: false, access: true }, security })];
  return {
    key: model.scene.nodes
      .map((node) => node.id)
      .sort()
      .join('\n'),
    nodeTiles: scene.nodes.map((node) => node.tile),
    points: [
      ...scene.rectangles.flatMap((rect) => [
        rect.from,
        rect.to,
        { x: rect.from.x, y: rect.to.y },
        { x: rect.to.x, y: rect.from.y }
      ]),
      ...scene.connectors.flatMap((connector) => connector.route.points)
    ],
    chips: [
      ...scene.connectors.flatMap((connector) =>
        connector.label ? [{ tile: connector.route.labelTile, text: connector.label }] : []
      ),
      ...tagged.flatMap((view) =>
        view.nodes.flatMap((node) => (node.access ? [{ tile: node.access.tile, text: node.access.text }] : []))
      )
    ]
  };
};

/** A connector chip's size in projected units, as the layout reserves it. */
export const measureChip = (text: string) => ({
  halfWidth: (text.length * CHIP_CHAR_PX + CHIP_PADDING_PX + CHIP_MARGIN_PX) / 2 / U_PX,
  halfHeight: (CHIP_HEIGHT_PX + CHIP_MARGIN_PX) / 2 / V_PX
});

/**
 * The scene for one combination of layers, laid out like every other combination. Unless told otherwise it shows the
 * Infrastructure layer: every node, the VPC and its subnets, connectors and labels.
 */
export const buildIsometricScene = ({
  parsedConfig,
  expandedGroups,
  statusLines,
  layers = { infrastructure: true, access: false },
  security
}: {
  parsedConfig: StacktapeConfig | null;
  /** Role groups the reader has expanded; every other group is drawn as one node. */
  expandedGroups?: ReadonlySet<string> | undefined;
  /** Reserve a live-status line under every declared resource, so statuses can come and go without moving anything. */
  statusLines?: boolean | undefined;
  layers?: DiagramLayers | undefined;
  security?: SecurityGroupModel | null | undefined;
}): IsoScene | null => {
  const model = buildDiagramModel({ parsedConfig, expandedGroups, statusLines });
  if (!model) return null;
  return { ...selectDiagramView({ model, layers, security }), frame: diagramFrame({ model, security }) };
};
