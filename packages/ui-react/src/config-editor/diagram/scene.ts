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

/** The silhouette a node's pedestal is extruded into. Chosen by resource category, not by service. */
export type PedestalType = 'database' | 'compute' | 'gateway' | 'messaging' | 'storage' | 'auth' | 'user' | 'default';

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
  /** One-sentence lead for the tooltip. */
  summary?: string | undefined;
  /** Longer explanation paragraph. */
  details?: string | undefined;
  /** Reachability note (accessibility mode etc.) rendered as a highlighted line. */
  accessNote?: string | undefined;
  iconUrl?: string | undefined;
  tile: IsoTilePoint;
  isImplicit?: boolean | undefined;
  color?: string | undefined;
  pedestal?: PedestalType | undefined;
  isAwsIcon?: boolean | undefined;
  replicaCount?: number | undefined;
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

/** A flat name tag for a boundary, positioned at the boundary's front tip. */
export type IsoLabel = {
  id: string;
  tile: IsoTilePoint;
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
