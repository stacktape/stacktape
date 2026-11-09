/**
 * Projected boxes: how the layout reasons about what the reader sees without knowing pixels.
 *
 * The renderer projects a tile `(x, y)` with a 2:1 isometric projection whose screen position is
 * proportional to `u = x - y` horizontally and `v = x + y` vertically (larger `v` is higher on the
 * screen). One `u` unit is twice as wide on screen as one `v` unit is tall. Flat text (name tags,
 * connector chips, zone tags) and the extruded node bodies are axis-aligned boxes in `(u, v)`, so the
 * layout can keep them apart while every position it produces stays in tile space.
 */

export type ProjectedBox = {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
};

export const projectTile = ({ x, y }: { x: number; y: number }) => ({ u: x - y, v: x + y });

export const shiftBox = ({ box, u, v }: { box: ProjectedBox; u: number; v: number }): ProjectedBox => ({
  u0: box.u0 + u,
  u1: box.u1 + u,
  v0: box.v0 + v,
  v1: box.v1 + v
});

export const boxOverlapArea = ({ a, b }: { a: ProjectedBox; b: ProjectedBox }) => {
  const width = Math.min(a.u1, b.u1) - Math.max(a.u0, b.u0);
  const height = Math.min(a.v1, b.v1) - Math.max(a.v0, b.v0);
  return width > 0 && height > 0 ? width * height : 0;
};

/**
 * The smallest `s` such that box `q`, moved `s` tiles in front of box `p` along the tile y axis, no
 * longer overlaps it for any larger `s` either. Moving in front by `s` shifts `q` by `(+s, -s)` in
 * `(u, v)`; the overlapping offsets form one interval, so clearing it means passing its upper end.
 */
export const clearanceInFront = ({ p, q }: { p: ProjectedBox; q: ProjectedBox }) => {
  const low = Math.max(p.u0 - q.u1, q.v0 - p.v1);
  const high = Math.min(p.u1 - q.u0, q.v1 - p.v0);
  return low < high ? high : Number.NEGATIVE_INFINITY;
};

/**
 * The smallest tile x distance at which box `q`, placed `dx` behind-right of box `p` and `dy` further
 * along the tile y axis, stops overlapping it. The offset in `(u, v)` is `(dx - dy, dx + dy)`.
 */
export const clearanceAlongFlow = ({ p, q, dy }: { p: ProjectedBox; q: ProjectedBox; dy: number }) => {
  const low = Math.max(p.u0 - q.u1 + dy, p.v0 - q.v1 - dy);
  const high = Math.min(p.u1 - q.u0 + dy, p.v1 - q.v0 - dy);
  return low < high ? high : Number.NEGATIVE_INFINITY;
};
