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
  | 'http'
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
  color?: string | undefined;
  semantic?: string | undefined;
  description?: string | undefined;
  route: IsoConnectorRoute;
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
};
