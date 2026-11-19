/**
 * Routes for a picture that hides some of the laid-out nodes.
 *
 * The layout routes every connector of the whole picture around every node. A picture that hides a node folds its
 * connectors into a visible one; joined through the hidden node's spot, such a connector can zigzag around an empty
 * place. These helpers find the simplest route the hiding allows: straight along the flow, or out along the flow, one
 * jog across it and in along the flow again, like the layout's own routes. Positions never change.
 */
import type { IsoTilePoint } from '../scene.js';
import type { ProjectedBox } from './projected-box.js';
import { boxOverlapArea, projectTile, shiftBox } from './projected-box.js';

/** How far along the flow a route runs out of its source and into its target before it may turn, in tiles. */
const LEAD = 1.41;
/** Candidate jog positions, in tiles along the flow. */
const JOG_STEP = 0.25;
/** Sample spacing along a route when testing it against what it must not cross, in tiles. */
const SAMPLE_STEP = 0.1;
/** Chip candidate spacing along a route, in tiles, and the cost per tile of sitting farther from the start. */
const CHIP_STEP = 0.25;
const CHIP_DISTANCE_COST = 0.05;
const EPSILON = 1e-6;

const turnsOf = (route: IsoTilePoint[]) => Math.max(0, route.length - 2);

const lengthOf = (route: IsoTilePoint[]) =>
  route
    .slice(1)
    .reduce((sum, point, index) => sum + Math.abs(point.x - route[index].x) + Math.abs(point.y - route[index].y), 0);

/** Whether a projected point lies inside a box. */
const inside = (box: ProjectedBox, u: number, v: number) => u > box.u0 && u < box.u1 && v > box.v0 && v < box.v1;

/**
 * Whether the part of a route outside its two end footprints stays clear of the obstacles. `endClearance` is how far
 * from each end the test starts, so a route may leave its own node's footprint.
 */
const isClear = ({
  route,
  obstacles,
  endClearance
}: {
  route: IsoTilePoint[];
  obstacles: readonly ProjectedBox[];
  endClearance: number;
}) => {
  const total = lengthOf(route);
  let travelled = 0;
  for (let index = 0; index + 1 < route.length; index++) {
    const start = route[index];
    const end = route[index + 1];
    const length = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
    const samples = Math.max(1, Math.ceil(length / SAMPLE_STEP));
    for (let sample = 0; sample <= samples; sample++) {
      const along = travelled + (length * sample) / samples;
      if (along < endClearance - EPSILON || along > total - endClearance + EPSILON) continue;
      const fraction = sample / samples;
      const { u, v } = projectTile({
        x: start.x + (end.x - start.x) * fraction,
        y: start.y + (end.y - start.y) * fraction
      });
      if (obstacles.some((box) => inside(box, u, v))) return false;
    }
    travelled += length;
  }
  return true;
};

/**
 * The simplest route between two shown nodes that keeps clear of `obstacles` (the projected bodies and name tags of
 * the other shown nodes, grown by a margin): straight when the two share a row, otherwise out along the flow, one jog
 * across it and in along the flow, with the jog where the route stays between its ends on screen, nearest the middle. Returns `current` when it has no more
 * turns than that, or when nothing simpler is clear.
 */
export const findDirectRoute = ({
  current,
  obstacles,
  endClearance
}: {
  /** The route as drawn now, from the source's centre to the target's. */
  current: IsoTilePoint[];
  obstacles: readonly ProjectedBox[];
  /** How far from each end the route may pass through the end nodes' own footprints, in tiles. */
  endClearance: number;
}): IsoTilePoint[] => {
  const from = current[0];
  const to = current[current.length - 1];
  if (!from || !to || turnsOf(current) === 0) return current;
  const clear = (route: IsoTilePoint[]) => isClear({ route, obstacles, endClearance });

  const sameRow = Math.abs(from.y - to.y) < EPSILON;
  if (sameRow && clear([from, to])) return [from, to];
  if (turnsOf(current) <= 2) return current;

  // Of the clear jogs, the one whose route stays within the space between its two ends on screen, so it does not run
  // past its target and turn back; then the one nearest the middle.
  const forward = to.x >= from.x;
  const low = Math.min(from.x, to.x) + LEAD;
  const high = Math.max(from.x, to.x) - LEAD;
  if (high < low - EPSILON) return current;
  const ends = [projectTile(from), projectTile(to)];
  const box = {
    u0: Math.min(ends[0].u, ends[1].u),
    u1: Math.max(ends[0].u, ends[1].u),
    v0: Math.min(ends[0].v, ends[1].v),
    v1: Math.max(ends[0].v, ends[1].v)
  };
  // One `u` unit is twice as wide on screen as one `v` unit is tall.
  const overshoot = (route: IsoTilePoint[]) =>
    route.reduce((sum, point) => {
      const { u, v } = projectTile(point);
      return (
        sum +
        2 * (Math.max(0, u - box.u1) + Math.max(0, box.u0 - u)) +
        Math.max(0, v - box.v1) +
        Math.max(0, box.v0 - v)
      );
    }, 0);
  const middle = (low + high) / 2;
  let best: { route: IsoTilePoint[]; cost: number } | undefined;
  // On one row, a single jog is the straight line already found blocked.
  const firstJog = sameRow ? Number.POSITIVE_INFINITY : low;
  for (let jog = firstJog; jog <= high + EPSILON; jog += JOG_STEP) {
    const x = Math.round(jog * 1000) / 1000;
    const route = [from, { x, y: from.y }, { x, y: to.y }, to];
    const cost = overshoot(route) * 100 + Math.abs(x - middle);
    if ((!best || cost < best.cost - EPSILON) && clear(route)) best = { route, cost };
  }
  if (best) return best.route;
  if (turnsOf(current) <= 4) return current;

  // No single jog is clear: two jogs, across to a row the current route already uses and back, at places where it
  // already turns or the first and last places a jog may go.
  const turnXs = new Set([low, high, ...current.slice(1, -1).map((point) => point.x)]);
  const xs = [...turnXs].filter((x) => x >= low - EPSILON && x <= high + EPSILON).sort((a, b) => a - b);
  if (!forward) xs.reverse();
  const rows = [...new Set(current.slice(1, -1).map((point) => point.y))];
  for (const [index, first] of xs.entries()) {
    for (const second of xs.slice(index + 1)) {
      for (const row of rows) {
        const route = simplifyPoints([
          from,
          { x: first, y: from.y },
          { x: first, y: row },
          { x: second, y: row },
          { x: second, y: to.y },
          to
        ]);
        if (turnsOf(route) >= turnsOf(current)) continue;
        const cost = turnsOf(route) * 1000 + overshoot(route) * 100 + lengthOf(route) / 100;
        if ((!best || cost < best.cost - EPSILON) && clear(route)) best = { route, cost };
      }
    }
  }
  return best?.route ?? current;
};

/** Drops repeated points and points in the middle of a straight run. */
const simplifyPoints = (points: IsoTilePoint[]) => {
  const unique = points.filter(
    (point, index) =>
      index === 0 ||
      Math.abs(point.x - points[index - 1].x) > EPSILON ||
      Math.abs(point.y - points[index - 1].y) > EPSILON
  );
  return unique.filter((point, index) => {
    if (index === 0 || index === unique.length - 1) return true;
    const previous = unique[index - 1];
    const next = unique[index + 1];
    const sameX = Math.abs(previous.x - point.x) < EPSILON && Math.abs(point.x - next.x) < EPSILON;
    const sameY = Math.abs(previous.y - point.y) < EPSILON && Math.abs(point.y - next.y) < EPSILON;
    return !sameX && !sameY;
  });
};

/**
 * Where a connector's chip goes on its route: the spot nearest the start whose box no obstacle covers, else the least
 * covered one. `blockedArea` measures how much of a box is covered.
 */
export const placeChipOnRoute = ({
  route,
  chip,
  blockedArea,
  skip
}: {
  route: IsoTilePoint[];
  /** The chip's box around its centre, in projected units. */
  chip: ProjectedBox;
  blockedArea: (box: ProjectedBox) => number;
  /** How far from each end a chip may not sit, so it stays off the end nodes, in tiles. */
  skip: number;
}): IsoTilePoint | undefined => {
  const total = lengthOf(route);
  let best: { tile: IsoTilePoint; cost: number } | undefined;
  let travelled = 0;
  for (let index = 0; index + 1 < route.length; index++) {
    const start = route[index];
    const end = route[index + 1];
    const length = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
    const samples = Math.max(1, Math.round(length / CHIP_STEP));
    for (let sample = 0; sample < samples; sample++) {
      const fraction = (sample + 0.5) / samples;
      const along = travelled + length * fraction;
      if (along < skip || along > total - skip) continue;
      const tile = { x: start.x + (end.x - start.x) * fraction, y: start.y + (end.y - start.y) * fraction };
      const { u, v } = projectTile(tile);
      const cost = blockedArea(shiftBox({ box: chip, u, v })) * 1000 + along * CHIP_DISTANCE_COST;
      if (!best || cost < best.cost - EPSILON) best = { tile, cost };
    }
    travelled += length;
  }
  return best && { x: Math.round(best.tile.x * 1000) / 1000, y: Math.round(best.tile.y * 1000) / 1000 };
};

/** How much of `box` the given boxes cover. */
export const coveredArea = (box: ProjectedBox, boxes: readonly ProjectedBox[]) =>
  boxes.reduce((sum, other) => sum + boxOverlapArea({ a: box, b: other }), 0);
