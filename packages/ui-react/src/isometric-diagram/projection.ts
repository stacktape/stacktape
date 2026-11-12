/**
 * The diagram's 2:1 isometric projection, shared by the renderer and the node shapes.
 *
 * Y is flipped so the flow runs bottom-left (external) to top-right (data): a larger `x + y` is further from the
 * viewer and higher on screen.
 */

export type ScreenPoint = { x: number; y: number };

/** Tile width and height in SVG units. */
export const TW = 80;
export const TH = 40;

export const t2s = (tx: number, ty: number): ScreenPoint => ({
  x: (tx - ty) * (TW / 2),
  y: -((tx + ty) * (TH / 2))
});

/** A screen point raised by `z` SVG units. */
export const lift = (point: ScreenPoint, z: number): ScreenPoint => ({ x: point.x, y: point.y - z });

export const pts = (...points: ScreenPoint[]) => points.map((point) => `${round(point.x)},${round(point.y)}`).join(' ');

export const round = (value: number) => Math.round(value * 100) / 100;
