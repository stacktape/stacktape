/**
 * The contract between the two halves of the diagram.
 *
 * `scene-builder.ts` produces an `IsoScene` from a topology; `IsoRenderer.tsx` draws one. Neither
 * imports the other, so the pipeline stays one-way:
 *
 *     StacktapeConfig → topology.ts → scene-builder.ts → IsoScene → IsoRenderer.tsx
 *
 * Everything here is in *tile* space. Tiles are the diagram's own grid, not pixels: the projection
 * that turns a tile into a screen coordinate belongs to the renderer alone, which is what lets the
 * layout be reasoned about — and tested — without a DOM. Nothing in this file may describe SVG
 * geometry, interaction state or CSS.
 */
import type { ResourceVisualCategory } from '../resource-icon/catalog.js';

/**
 * The isometric shape a node is drawn as. Each kind is a recognisable silhouette, so the shape alone tells a
 * reader what sort of resource it is; the renderer owns every pixel of it.
 */
export type IsoNodeShape =
  | 'function'
  | 'deck'
  | 'container'
  | 'batch'
  | 'server'
  | 'agent'
  | 'tool'
  | 'construct'
  | 'database'
  | 'key-value'
  | 'cache'
  | 'search'
  | 'queue'
  | 'topic'
  | 'stream'
  | 'workflow'
  | 'schedule'
  | 'email'
  | 'bucket'
  | 'filesystem'
  | 'api'
  | 'load-balancer'
  | 'cdn'
  | 'nat'
  | 'firewall'
  | 'user-pool'
  | 'user';

/**
 * A flat, single-colour mark on a shape's top face, for shapes several resource types share (an API can be HTTP,
 * WebSocket, GraphQL or MCP). Omitted when the silhouette already says enough.
 */
export type IsoNodeGlyph =
  | 'lambda'
  | 'websocket'
  | 'graphql'
  | 'mcp'
  | 'leaf'
  | 'bolt'
  | 'table'
  | 'search'
  | 'browser'
  | 'code'
  | 'spark'
  | 'memory'
  | 'person'
  | 'flow';

/** The body colour family: AWS's service category, or neutral for things that are not AWS services. */
export type IsoNodeCategory = ResourceVisualCategory | 'neutral';

export type IsoTilePoint = {
  x: number;
  y: number;
};

export type IsoNode = {
  id: string;
  label: string;
  resourceType?: string | undefined;
  /** Friendly type name shown as the tooltip subtitle, e.g. "HTTP API Gateway". */
  typeName?: string | undefined;
  /** Short muted line under the name, e.g. "Aurora Postgres · 2 instances" or "Worker service · 2–6 tasks". */
  typeLabel?: string | undefined;
  /** One-sentence lead for the tooltip. */
  summary?: string | undefined;
  /** Longer explanation paragraph. */
  details?: string | undefined;
  /** Reachability note (accessibility mode etc.) rendered as a highlighted line. */
  accessNote?: string | undefined;
  tile: IsoTilePoint;
  isImplicit?: boolean | undefined;
  shape: IsoNodeShape;
  category: IsoNodeCategory;
  glyph?: IsoNodeGlyph | undefined;
  /**
   * Copies the resource really runs: container tasks (`min` running, up to `max`), database instances, NAT gateways
   * per zone. Absent for a single copy.
   */
  replicas?: { min: number; max: number } | undefined;
  /** Reachable from the internet by its accessibility mode; the renderer marks it in every view. */
  isPublic?: boolean | undefined;
  /** On a load balancer: whether the internet can reach it. The Infrastructure layer marks it. */
  exposure?: 'internal' | 'internet-facing' | undefined;
  /** The security groups this node carries in the deployed stage, under the Access layer. */
  securityGroups?: IsoNodeSecurityGroup[] | undefined;
  /** Who can connect to this node, under the Access layer. */
  access?: IsoNodeAccess | undefined;
  /**
   * The role group this node belongs to: its own id on a collapsed group's node, the group's id on each member drawn
   * after the group was expanded. See `IsoScene.groups`.
   */
  groupId?: string | undefined;
  /** On a collapsed group's node: how many resources it stands for. */
  memberCount?: number | undefined;
  /** Everything this node is connected to as drawn, for the side panel. */
  connections: IsoNodeConnection[];
  /** Routes an API or load balancer sends to its targets, in declaration order. */
  routes?: IsoRoute[] | undefined;
  /** Declared triggers whose sender is not drawn, e.g. "payments-queue · poll (not drawn)". */
  undrawnTriggers?: string[] | undefined;
};

/**
 * Who the deployed stage lets connect to a node, as the Access layer's tag above it. `exposed` is a data store or an
 * admin port open to the internet; `public` an entry point meant to be reached from it; `limited` everything the
 * internet cannot reach; `unknown` a node with a security group defined outside the stack, whose rules the template
 * does not hold.
 */
export type IsoNodeAccess = {
  reach: 'exposed' | 'public' | 'limited' | 'unknown';
  /** "Open to the internet", "Public", "Anything in the VPC", "Only web + 203.0.113.10". */
  text: string;
  /** The tag's centre, placed clear of other nodes, their names and connector chips. */
  tile: IsoTilePoint;
  /** The drawn nodes its rules let connect, which focusing the node keeps lit. */
  sources: string[];
};

/**
 * One end of a relation, seen from a node: what is at the other end and what travels along it. The other end is the
 * node as drawn, so a collapsed member is reached through its group.
 */
export type IsoNodeConnection = {
  direction: 'in' | 'out';
  /** The connector's semantic, except that sign-in and authorizer checks are `auth` and only firewalls `security`. */
  semantic: string;
  /** The drawn node at the other end, or the group a collapsed member is drawn as. */
  nodeId: string;
  /** The other end's name: a resource name even when it is drawn inside a group. */
  name: string;
  /** What travels along it: "GET /orders", "poll", "18 routes", "used by 7 of 18". */
  text?: string | undefined;
};

/** A route of an API or load balancer. */
export type IsoRoute = {
  method: string;
  path: string;
  /** The resource that serves it, and the drawn node to select for it. */
  target: string;
  targetNodeId: string;
  authorizer?: string | undefined;
};

export type IsoGroupMember = {
  id: string;
  label: string;
  typeLabel?: string | undefined;
  /** What starts it: "GET /orders", "orderQueue · poll", "rate(1 hour)". */
  triggers: string[];
  connections: IsoNodeConnection[];
};

/**
 * Resources that play one role, such as the functions behind one API, drawn as one node until the reader expands
 * them. Groups are listed whether collapsed or expanded, so a view can offer to collapse one again.
 */
export type IsoGroup = {
  id: string;
  label: string;
  /** "18 functions". */
  typeLabel: string;
  members: IsoGroupMember[];
  expanded: boolean;
};

export type IsoConnectorRoute = {
  points: IsoTilePoint[];
  labelTile: IsoTilePoint;
};

export type IsoConnector = {
  id: string;
  from: string;
  to: string;
  label?: string | undefined;
  /** On a connector that stands for several (into or out of a group): how many. */
  count?: number | undefined;
  color?: string | undefined;
  semantic?: string | undefined;
  description?: string | undefined;
  route: IsoConnectorRoute;
};

/** A security group a node carries, and its rules in plain words, for the side panel. */
export type IsoNodeSecurityGroup = {
  id: string;
  name: string;
  /** Defined outside this stack: its rules are not in the template. */
  external: boolean;
  /** "Allows TCP 5432 from api, worker". */
  inbound: string[];
  outbound: string[];
};

/**
 * What the view must fit, whichever layers are on: the whole picture, so switching layers neither moves nor rescales
 * anything. `key` changes only when the set of nodes does.
 */
export type IsoSceneFrame = {
  key: string;
  nodeTiles: IsoTilePoint[];
  points: IsoTilePoint[];
  chips: Array<{ tile: IsoTilePoint; text: string }>;
};

/** A network boundary drawn as a floor plane, e.g. the VPC or a subnet tier. */
export type IsoRectangle = {
  id: string;
  from: IsoTilePoint;
  to: IsoTilePoint;
  color: string;
  borderColor: string;
  label?: string | undefined;
  summary?: string | undefined;
  details?: string | undefined;
  memberNodeIds?: string[] | undefined;
};

/**
 * A boundary's name, laid along one of its edges by the layout. `tile` is where the text's centre line starts and
 * `axis` the tile axis it runs along: `y` runs towards −y (down-right on screen, the front-left and back-right edges),
 * `x` runs towards +x (up-right on screen, the front-right and back-left edges).
 */
export type IsoLabel = {
  id: string;
  tile: IsoTilePoint;
  axis: 'x' | 'y';
  text: string;
  color?: string | undefined;
  fontSize?: number | undefined;
};

export type IsoScene = {
  nodes: IsoNode[];
  connectors: IsoConnector[];
  rectangles: IsoRectangle[];
  labels: IsoLabel[];
  groups: IsoGroup[];
  frame?: IsoSceneFrame | undefined;
};
