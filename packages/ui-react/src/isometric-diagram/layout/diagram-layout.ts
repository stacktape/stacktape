/**
 * The diagram's layout engine: a layered drawing on a partition grid, laid out in tile space.
 *
 * Columns follow the flow (`columns.ts`). Zones such as the VPC and its subnet tiers are horizontal
 * bands across the columns they span: their members stay inside the band and every other node in
 * those columns stays outside it, which an ordinary layered layout cannot promise. The steps are the
 * classic Sugiyama ones, adapted to that grid:
 *
 * 1. Long edges get one shared waypoint ("dummy") per column they cross, bundled by source or target.
 * 2. Columns are ordered by barycenter sweeps; zone members stay grouped in a fixed band order and
 *    other nodes go above or below the bands.
 * 3. Positions across the flow come from one network simplex: it straightens edges while satisfying
 *    the band constraints and keeping flat text clear of the bodies in front of it.
 * 4. Gutters between columns get one track per bundle; routes run along gutters and waypoints only,
 *    so they never cross a node they do not start or end at.
 *
 * The engine knows nothing about AWS. The scene builder decides which edges are flow, which nodes
 * are sources or sinks and which zones exist.
 */
import type { IsoTilePoint } from '../scene.js';
import type { ProjectedBox } from './projected-box.js';
import { assignFlowColumns, wrapTallColumns } from './columns.js';
import { solveDifferenceConstraints } from './network-simplex.js';
import { clearanceAlongFlow, clearanceInFront, createBoxIndex, projectTile, shiftBox } from './projected-box.js';

export type LayoutNode = {
  id: string;
  /** Footprint along the flow (tile x). */
  width: number;
  /** Footprint across the flow (tile y). */
  depth: number;
  /** How far the drawn body rises above its floor, in projected `v` units. */
  lift: number;
  /** The flat name tag under the node's front tip, in projected units. */
  tag: { halfWidth: number; height: number };
  rank?: 'first' | 'last' | undefined;
  /** The innermost zone the node belongs to. */
  zone?: string | undefined;
};

export type LayoutEdge = {
  id: string;
  from: string;
  to: string;
  /** Whether the edge places its target one column after its source. */
  flow: boolean;
  /** Edges that share an endpoint and a bundle key may share a trunk. */
  bundle: string;
  label?: string | undefined;
};

/** Zones are listed back to front: earlier siblings sit further back (larger tile y). */
export type LayoutZone = {
  id: string;
  parent?: string | undefined;
};

export type LayoutConnectorLabel = { halfWidth: number; halfHeight: number };

export type DiagramLayoutInput = {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  zones: LayoutZone[];
  /** The size of an edge's label chip, in projected units. */
  measureLabel: (text: string) => LayoutConnectorLabel;
  /** Boxes of flat zone tags hanging under a zone's front tip, relative to that tip. */
  zoneTag?: ((zoneId: string) => ProjectedBox | undefined) | undefined;
};

export type DiagramLayout = {
  nodes: Map<string, IsoTilePoint>;
  columns: Map<string, number>;
  zones: Map<string, { from: IsoTilePoint; to: IsoTilePoint }>;
  edges: Map<string, { points: IsoTilePoint[]; labelTile: IsoTilePoint; reversed: boolean }>;
};

// ── Spacing, in tile units ──

/** Minimum floor gap between two nodes stacked in one column. */
const ROW_GAP = 1;
/** Minimum distance between a passing connector and a node's footprint. */
const PASSING_CLEARANCE = 0.8;
/** Distance between parallel connectors. */
const TRACK_GAP = 0.5;
/** Minimum distance between a gutter track and the footprints on either side. */
const GUTTER_CLEARANCE = 0.75;
const MIN_GUTTER = 2.1;
/** Padding of a zone around its members, and of a parent zone around its children. */
const ZONE_PAD_FRONT = 1.15;
const ZONE_PAD_BACK = 0.75;
const ZONE_PAD_SIDE = 0.65;
const PARENT_ZONE_PAD = 0.5;
/** Gap between stacked sibling zones; it leaves room for the back zone's tag. */
const ZONE_STACK_GAP = 1.5;
/** Gap between a zone and a node outside it in the same column. */
const ZONE_OUTSIDE_GAP = 1.1;
/** Fixed-point scale for the network simplex, which works on integers. */
const SCALE = 100;
/**
 * The simplex pivot budget. Each pivot costs about one pass over the variables and constraints, so the
 * budget is a fixed amount of that work, but never fewer than `MIN_PIVOTS` pivots. Real stacks finish
 * well inside it (the 72-resource test config needs about 220 of its 3,000); a dense, cyclic graph
 * stops early with straighter-than-start, still valid positions instead of freezing the page.
 */
const PIVOT_WORK = 3_000_000;
const MIN_PIVOTS = 200;
const SWEEPS = 8;
/** How clearly a node's neighbours must pull it before it moves to the other side of a band. */
const SIDE_DEAD_BAND = 0.05;
/**
 * A column wraps into sub-columns once it holds more nodes than this and than `sqrt(3 × tallest
 * column)`. The renderer fits the whole picture, whose size grows with the sum of its tile width and
 * height, so a tall fan-out is cheaper as a block than as one long diagonal.
 */
const MIN_ROWS_BEFORE_WRAPPING = 6;
const WRAP_FACTOR = 3;
/** Candidate chip positions along a route segment: about every quarter tile, at most 24. */
const CHIP_SAMPLE_SPACING = 0.25;
const CHIP_SAMPLES_PER_SEGMENT = 24;
/** A chip prefers to sit near where its connector starts: this much cost per tile travelled. */
const CHIP_DISTANCE_COST = 0.05;
/** What a chip costs when it sits on a stretch shared with differently labelled connectors. */
const MISLABEL_COST = 1000;
/** Cell size of the spatial indexes used to place chips, in tile and projected units. */
const INDEX_CELL = 2;
/** How a gutter grows, and how often, when a chip next to it has no free spot. */
const CHIP_WIDENING_STEP = 0.5;
const CHIP_WIDENING_ROUNDS = 6;
/** The first shapes of a node are its body; the last is its name tag. */
const BODY_SHAPES = 3;
const EPSILON = 1e-6;

type Item = {
  column: number;
  /** Index into the input nodes, or undefined for a waypoint. */
  node: number | undefined;
  y: number;
};

type ChainEdge = {
  edge: LayoutEdge;
  tail: number;
  head: number;
  reversed: boolean;
  /** Items from tail to head, one per column. */
  chain: number[];
  loop: boolean;
};

type Link = { left: number; right: number; weight: number };

type Group = {
  gutter: number;
  leftYs: number[];
  rightYs: number[];
  min: number;
  max: number;
  straight: boolean;
  x: number;
};

const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * What a node occupies on screen, relative to its center: the extruded body (its hexagonal
 * silhouette as a centre box and two shoulders) and the flat name tag under its front tip.
 */
const nodeShapes = (node: LayoutNode): ProjectedBox[] => {
  const half = (node.width + node.depth) / 2;
  const margin = 0.1;
  return [
    { u0: -half / 2, u1: half / 2, v0: -half, v1: half + node.lift },
    { u0: -half - margin, u1: -half / 2, v0: -half / 2, v1: half / 2 + node.lift },
    { u0: half / 2, u1: half + margin, v0: -half / 2, v1: half / 2 + node.lift },
    { u0: -node.tag.halfWidth, u1: node.tag.halfWidth, v0: -half - node.tag.height, v1: -half - 0.2 }
  ];
};

export const layoutDiagram = (input: DiagramLayoutInput): DiagramLayout => {
  const nodes = input.nodes;
  const nodeIndex = new Map(nodes.map((node, index) => [node.id, index]));
  const edges = input.edges.filter((edge) => nodeIndex.has(edge.from) && nodeIndex.has(edge.to));
  const shapes = nodes.map(nodeShapes);

  // ── Zones ──
  const zoneById = new Map(input.zones.map((zone) => [zone.id, zone]));
  const zoneRank = new Map<string, number>();
  const visitZone = (parent: string | undefined) => {
    for (const zone of input.zones) {
      if (zone.parent !== parent) continue;
      zoneRank.set(zone.id, zoneRank.size + 1);
      visitZone(zone.id);
    }
  };
  visitZone(undefined);
  const ancestorsOf = (zoneId: string) => {
    const result: string[] = [];
    let current = zoneById.get(zoneId);
    while (current) {
      result.push(current.id);
      current = current.parent ? zoneById.get(current.parent) : undefined;
    }
    return result;
  };
  const nodeZone = nodes.map((node) => (node.zone && zoneById.has(node.zone) ? node.zone : undefined));

  // ── 1. Columns and waypoints ──
  const flowColumns = assignFlowColumns({ nodes, edges });
  const columnSizes = new Map<number, number>();
  for (const column of flowColumns.values()) columnSizes.set(column, (columnSizes.get(column) ?? 0) + 1);
  const tallest = Math.max(0, ...columnSizes.values());
  const columnById = wrapTallColumns({
    nodes,
    edges,
    columns: flowColumns,
    maxPerColumn: Math.max(MIN_ROWS_BEFORE_WRAPPING, Math.ceil(Math.sqrt(tallest * WRAP_FACTOR)))
  });
  const nodeColumn = nodes.map((node) => columnById.get(node.id) as number);
  const columnCount = Math.max(0, ...nodeColumn) + 1;

  const items: Item[] = nodes.map((_, index) => ({ column: nodeColumn[index], node: index, y: 0 }));
  const chainEdges: ChainEdge[] = edges.map((edge) => {
    const from = nodeIndex.get(edge.from) as number;
    const to = nodeIndex.get(edge.to) as number;
    const reversed = nodeColumn[from] > nodeColumn[to];
    const tail = reversed ? to : from;
    const head = reversed ? from : to;
    return { edge, tail, head, reversed, chain: [tail], loop: nodeColumn[tail] === nodeColumn[head] };
  });

  const longEdges = chainEdges.filter((chain) => nodeColumn[chain.head] - nodeColumn[chain.tail] > 1);
  const bundleCounts = new Map<string, number>();
  const count = (key: string) => bundleCounts.set(key, (bundleCounts.get(key) ?? 0) + 1);
  for (const chain of longEdges) {
    count(`s|${chain.tail}|${chain.edge.bundle}`);
    count(`t|${chain.head}|${chain.edge.bundle}`);
  }
  const waypointByKey = new Map<string, number>();
  for (const chain of chainEdges) {
    const span = nodeColumn[chain.head] - nodeColumn[chain.tail];
    if (span > 1) {
      const sourceKey = `s|${chain.tail}|${chain.edge.bundle}`;
      const targetKey = `t|${chain.head}|${chain.edge.bundle}`;
      const sources = bundleCounts.get(sourceKey) ?? 0;
      const targets = bundleCounts.get(targetKey) ?? 0;
      const bundleKey =
        targets >= 2 && targets >= sources ? targetKey : sources >= 2 ? sourceKey : `e|${chain.edge.id}`;
      for (let column = nodeColumn[chain.tail] + 1; column < nodeColumn[chain.head]; column++) {
        const key = `${bundleKey}@${column}`;
        let waypoint = waypointByKey.get(key);
        if (waypoint === undefined) {
          waypoint = items.length;
          items.push({ column, node: undefined, y: 0 });
          waypointByKey.set(key, waypoint);
        }
        chain.chain.push(waypoint);
      }
    }
    chain.chain.push(chain.head);
  }

  // Links between consecutive items of every chain, deduplicated where chains share a trunk.
  const linkByKey = new Map<string, Link>();
  const chainLinks = new Map<ChainEdge, Link[]>();
  for (const chain of chainEdges) {
    if (chain.loop) continue;
    const links: Link[] = [];
    for (let index = 0; index + 1 < chain.chain.length; index++) {
      const left = chain.chain[index];
      const right = chain.chain[index + 1];
      const key = `${left}>${right}`;
      let link = linkByKey.get(key);
      if (!link) {
        link = { left, right, weight: 0 };
        linkByKey.set(key, link);
      }
      link.weight += 1;
      links.push(link);
    }
    chainLinks.set(chain, links);
  }
  const links = [...linkByKey.values()];
  const leftNeighbors: Link[][] = items.map(() => []);
  const rightNeighbors: Link[][] = items.map(() => []);
  for (const link of links) {
    rightNeighbors[link.left].push(link);
    leftNeighbors[link.right].push(link);
  }

  // Which columns each zone spans: its own members and those of its descendants.
  const zoneColumns = new Map<string, { min: number; max: number }>();
  nodes.forEach((_, index) => {
    const zone = nodeZone[index];
    if (!zone) return;
    for (const ancestor of ancestorsOf(zone)) {
      const range = zoneColumns.get(ancestor);
      const column = nodeColumn[index];
      zoneColumns.set(ancestor, {
        min: Math.min(range?.min ?? column, column),
        max: Math.max(range?.max ?? column, column)
      });
    }
  });
  const topZones = input.zones.filter((zone) => !zone.parent && zoneColumns.has(zone.id));
  const coveringZones = (column: number) =>
    topZones.filter((zone) => {
      const range = zoneColumns.get(zone.id);
      return range !== undefined && range.min <= column && column <= range.max;
    });

  /** The real ends of every connector that passes through each waypoint. */
  const waypointEnds: [number, number][][] = items.map(() => []);
  for (const chain of chainEdges) {
    for (const item of chain.chain.slice(1, -1)) waypointEnds[item].push([chain.tail, chain.head]);
  }

  // ── 2. Ordering ──
  const order: number[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, index) => order[item.column].push(index));
  /** -1: behind every band in the column, 1: in front of them; zone members use their band. */
  const outsideSide = new Int8Array(items.length).fill(1);

  const positions = () => {
    const position = new Float64Array(items.length);
    for (const column of order) {
      column.forEach((item, index) => {
        position[item] = (index + 0.5) / column.length;
      });
    }
    return position;
  };

  const classOf = (item: number) => {
    const node = items[item].node;
    if (node === undefined) return 0;
    const zone = nodeZone[node];
    if (zone) return zoneRank.get(zone) as number;
    return coveringZones(items[item].column).length > 0 ? (outsideSide[item] < 0 ? 0 : 1000) : 0;
  };

  const reorderColumn = (column: number, fromLeft: boolean) => {
    const position = positions();
    const barycenter = new Map<number, number>();
    for (const item of order[column]) {
      const neighbors = fromLeft ? leftNeighbors[item] : rightNeighbors[item];
      let sum = 0;
      let weight = 0;
      for (const link of neighbors) {
        sum += position[fromLeft ? link.left : link.right] * link.weight;
        weight += link.weight;
      }
      barycenter.set(item, weight > 0 ? sum / weight : position[item]);
    }

    if (coveringZones(column).length > 0) {
      const members = order[column].filter((item) => {
        const node = items[item].node;
        return node !== undefined && nodeZone[node] !== undefined;
      });
      // Where the bands sit in this column: their members here, or else in the reference column.
      const referenceColumn = fromLeft ? column - 1 : column + 1;
      const referenceMembers = (order[referenceColumn] ?? []).filter((item) => {
        const node = items[item].node;
        return node !== undefined && nodeZone[node] !== undefined;
      });
      const center =
        members.length > 0
          ? members.reduce((sum, item) => sum + (barycenter.get(item) as number), 0) / members.length
          : referenceMembers.length > 0
            ? referenceMembers.reduce((sum, item) => sum + position[item], 0) / referenceMembers.length
            : 0.5;
      for (const item of order[column]) {
        const node = items[item].node;
        if (node === undefined || nodeZone[node]) continue;
        // A node changes sides only when its neighbours clearly pull it there, so a small change
        // elsewhere cannot flip the picture. The default is in front: lower right on screen, which
        // reads as further along the flow.
        const pull = (barycenter.get(item) as number) - center;
        if (Math.abs(pull) > SIDE_DEAD_BAND) outsideSide[item] = pull < 0 ? -1 : 1;
      }
    }

    // Where bands cross a column, a waypoint sorts between the bands of the connectors it carries,
    // so a connector between two VPC members stays inside the VPC and one between outside nodes
    // stays outside it.
    const covered = coveringZones(column).length > 0;
    const sortClass = (item: number) => {
      if (items[item].node !== undefined) return classOf(item);
      if (!covered) return 0;
      const ends = waypointEnds[item];
      return ends.reduce((sum, [tail, head]) => sum + (classOf(tail) + classOf(head)) / 2, 0) / ends.length;
    };
    const current = new Map(order[column].map((item, index) => [item, index]));
    order[column] = order[column]
      .slice()
      .sort(
        (a, b) =>
          sortClass(a) - sortClass(b) ||
          (barycenter.get(a) as number) - (barycenter.get(b) as number) ||
          Number(items[a].node === undefined) - Number(items[b].node === undefined) ||
          (current.get(a) as number) - (current.get(b) as number)
      );
  };

  const countCrossings = () => {
    const position = new Map<number, number>();
    for (const column of order) column.forEach((item, index) => position.set(item, index));
    let crossings = 0;
    for (let column = 0; column + 1 < columnCount; column++) {
      const between = links.filter((link) => items[link.left].column === column);
      for (let a = 0; a < between.length; a++) {
        for (let b = a + 1; b < between.length; b++) {
          const first = between[a];
          const second = between[b];
          const leftDelta = (position.get(first.left) as number) - (position.get(second.left) as number);
          const rightDelta = (position.get(first.right) as number) - (position.get(second.right) as number);
          if (leftDelta * rightDelta < 0) crossings += first.weight * second.weight;
        }
      }
    }
    return crossings;
  };

  for (let column = 0; column < columnCount; column++) reorderColumn(column, column > 0);
  let bestOrder = order.map((column) => column.slice());
  let bestSides = outsideSide.slice();
  let bestCrossings = countCrossings();
  for (let sweep = 0; sweep < SWEEPS; sweep++) {
    for (let column = 1; column < columnCount; column++) reorderColumn(column, true);
    for (let column = columnCount - 2; column >= 0; column--) reorderColumn(column, false);
    const crossings = countCrossings();
    if (crossings < bestCrossings) {
      bestCrossings = crossings;
      bestOrder = order.map((column) => column.slice());
      bestSides = outsideSide.slice();
    }
  }
  bestOrder.forEach((column, index) => {
    order[index] = column;
  });
  outsideSide.set(bestSides);

  // Crossing minimisation cannot tell a drawing from its mirror image. Prefer the one that keeps
  // declaration order top to bottom, so adding or hiding a resource does not flip the picture.
  const modelOrderAgreement = () => {
    let agreement = 0;
    for (const column of order) {
      const real = column.filter((item) => items[item].node !== undefined);
      for (let a = 0; a < real.length; a++) {
        for (let b = a + 1; b < real.length; b++) agreement += Math.sign(real[b] - real[a]);
      }
    }
    return agreement;
  };
  const agreement = modelOrderAgreement();
  if (agreement < 0) {
    const kept = order.map((column) => column.slice());
    const keptSides = outsideSide.slice();
    for (let index = 0; index < items.length; index++) outsideSide[index] = -outsideSide[index];
    for (let column = 0; column < columnCount; column++) {
      const reversed = order[column].slice().reverse();
      const rank = new Map(reversed.map((item, index) => [item, index]));
      const real = reversed
        .filter((item) => items[item].node !== undefined)
        .sort((a, b) => classOf(a) - classOf(b) || (rank.get(a) as number) - (rank.get(b) as number));
      let next = 0;
      order[column] = reversed.map((item) => (items[item].node === undefined ? item : real[next++]));
    }
    if (countCrossings() > bestCrossings || modelOrderAgreement() <= agreement) {
      kept.forEach((column, index) => {
        order[index] = column;
      });
      outsideSide.set(keptSides);
    }
  }

  // ── 3. Positions across the flow (tile y) ──
  const zoneIds = input.zones.filter((zone) => zoneColumns.has(zone.id)).map((zone) => zone.id);
  const zoneLow = new Map(zoneIds.map((id, index) => [id, items.length + index * 2]));
  const zoneHigh = new Map(zoneIds.map((id, index) => [id, items.length + index * 2 + 1]));
  const anchor = items.length + zoneIds.length * 2;
  let variableCount = anchor + 1;
  const constraints: { from: number; to: number; minLength: number; weight: number; banding?: boolean }[] = [];
  /** `upper - lower >= gap`; `banding` marks the constraints that keep bands apart from each other and from outsiders. */
  const keepApart = (upper: number, lower: number, gap: number, banding = false) =>
    constraints.push({ from: lower, to: upper, minLength: Math.ceil(gap * SCALE), weight: 0, banding });
  const pullTogether = (a: number, b: number, weight: number) => {
    const auxiliary = variableCount;
    variableCount += 1;
    constraints.push({ from: auxiliary, to: a, minLength: 0, weight });
    constraints.push({ from: auxiliary, to: b, minLength: 0, weight });
  };

  const separation = (upper: number, lower: number) => {
    const upperNode = items[upper].node;
    const lowerNode = items[lower].node;
    if (upperNode === undefined && lowerNode === undefined) return TRACK_GAP;
    if (upperNode === undefined) return nodes[lowerNode as number].depth / 2 + PASSING_CLEARANCE;
    if (lowerNode === undefined) return nodes[upperNode].depth / 2 + PASSING_CLEARANCE;
    let gap = (nodes[upperNode].depth + nodes[lowerNode].depth) / 2 + ROW_GAP;
    for (const p of shapes[upperNode]) {
      for (const q of shapes[lowerNode]) gap = Math.max(gap, clearanceInFront({ p, q }));
    }
    return gap;
  };

  for (const column of order) {
    for (let index = 0; index + 1 < column.length; index++) {
      keepApart(column[index], column[index + 1], separation(column[index], column[index + 1]));
    }
    const real = column.filter((item) => items[item].node !== undefined);
    for (let index = 0; index + 1 < real.length; index++) {
      keepApart(real[index], real[index + 1], separation(real[index], real[index + 1]));
    }
  }

  for (const zoneId of zoneIds) {
    const low = zoneLow.get(zoneId) as number;
    const high = zoneHigh.get(zoneId) as number;
    constraints.push({ from: low, to: high, minLength: 0, weight: 2 });
    const zone = zoneById.get(zoneId) as LayoutZone;
    if (zone.parent && zoneLow.has(zone.parent)) {
      keepApart(low, zoneLow.get(zone.parent) as number, PARENT_ZONE_PAD);
      keepApart(zoneHigh.get(zone.parent) as number, high, PARENT_ZONE_PAD);
    }
  }
  nodes.forEach((node, index) => {
    const zone = nodeZone[index];
    if (!zone) return;
    keepApart(index, zoneLow.get(zone) as number, node.depth / 2 + ZONE_PAD_FRONT);
    keepApart(zoneHigh.get(zone) as number, index, node.depth / 2 + ZONE_PAD_BACK);
  });
  // Siblings that share a column stack back to front in input order.
  for (const zone of zoneIds) {
    for (const other of zoneIds) {
      const a = zoneById.get(zone) as LayoutZone;
      const b = zoneById.get(other) as LayoutZone;
      if (zone === other || a.parent !== b.parent) continue;
      if (zoneIds.indexOf(zone) > zoneIds.indexOf(other)) continue;
      const rangeA = zoneColumns.get(zone) as { min: number; max: number };
      const rangeB = zoneColumns.get(other) as { min: number; max: number };
      if (rangeA.max < rangeB.min || rangeB.max < rangeA.min) continue;
      keepApart(zoneLow.get(zone) as number, zoneHigh.get(other) as number, ZONE_STACK_GAP, true);
    }
  }
  items.forEach((item, index) => {
    if (item.node === undefined || nodeZone[item.node]) return;
    const depth = nodes[item.node].depth;
    for (const zone of coveringZones(item.column)) {
      if (outsideSide[index] < 0) {
        keepApart(index, zoneHigh.get(zone.id) as number, depth / 2 + ZONE_OUTSIDE_GAP, true);
      } else {
        keepApart(zoneLow.get(zone.id) as number, index, depth / 2 + ZONE_OUTSIDE_GAP, true);
      }
    }
  });

  for (const link of links) {
    const realEnds = Number(items[link.left].node !== undefined) + Number(items[link.right].node !== undefined);
    const base = realEnds === 2 ? 8 : realEnds === 1 ? 16 : 64;
    pullTogether(link.left, link.right, base * Math.min(4, link.weight));
  }
  items.forEach((item, index) => {
    if (item.node !== undefined) pullTogether(index, anchor, 1);
  });

  // The banding constraints follow the column order, so they cannot contradict it. Should an
  // unforeseen configuration prove otherwise, draw it with overlapping bands rather than not at all.
  const maxPivots = Math.max(MIN_PIVOTS, Math.floor(PIVOT_WORK / (variableCount + constraints.length)));
  let ranks: number[];
  try {
    ranks = solveDifferenceConstraints({ variableCount, constraints, maxPivots });
  } catch {
    ranks = solveDifferenceConstraints({
      variableCount,
      constraints: constraints.filter((constraint) => !constraint.banding),
      maxPivots
    });
  }
  items.forEach((item, index) => {
    item.y = ranks[index] / SCALE;
  });

  // ── 4. Gutters: one track per bundle, ordered to avoid crossings ──
  const linkGroup = new Map<Link, Group>();
  const loopGroup = new Map<ChainEdge, Group>();
  const groupsByGutter: Group[][] = Array.from({ length: columnCount }, () => []);
  const newGroup = (gutter: number): Group => {
    const group = { gutter, leftYs: [], rightYs: [], min: 0, max: 0, straight: false, x: 0 };
    groupsByGutter[gutter].push(group);
    return group;
  };
  for (let gutter = 0; gutter < columnCount; gutter++) {
    const gutterLinks = links.filter((link) => items[link.left].column === gutter);
    const leftCount = new Map<number, number>();
    const rightCount = new Map<number, number>();
    for (const link of gutterLinks) {
      leftCount.set(link.left, (leftCount.get(link.left) ?? 0) + 1);
      rightCount.set(link.right, (rightCount.get(link.right) ?? 0) + 1);
    }
    const byKey = new Map<string, Group>();
    for (const link of gutterLinks) {
      const fanOut = leftCount.get(link.left) as number;
      const fanIn = rightCount.get(link.right) as number;
      const key =
        fanOut >= 2 && fanOut >= fanIn
          ? `L${link.left}`
          : fanIn >= 2
            ? `R${link.right}`
            : `K${link.left}>${link.right}`;
      let group = byKey.get(key);
      if (!group) {
        group = newGroup(gutter);
        byKey.set(key, group);
      }
      if (!group.leftYs.includes(items[link.left].y)) group.leftYs.push(items[link.left].y);
      if (!group.rightYs.includes(items[link.right].y)) group.rightYs.push(items[link.right].y);
      linkGroup.set(link, group);
    }
  }
  for (const chain of chainEdges) {
    if (!chain.loop || chain.tail === chain.head) continue;
    const group = newGroup(nodeColumn[chain.tail]);
    group.leftYs.push(items[chain.tail].y, items[chain.head].y);
    loopGroup.set(chain, group);
  }
  for (const group of groupsByGutter.flat()) {
    const ys = [...group.leftYs, ...group.rightYs];
    group.min = Math.min(...ys);
    group.max = Math.max(...ys);
    group.straight = group.max - group.min < EPSILON;
  }

  /** Crossings and overlaps caused by drawing `a`'s track left of `b`'s. */
  const pairCost = (a: Group, b: Group) => {
    let cost = 0;
    for (const y of a.rightYs) {
      if (y > b.min + EPSILON && y < b.max - EPSILON) cost += 1;
      if (b.leftYs.some((other) => Math.abs(other - y) < EPSILON)) cost += 50;
    }
    for (const y of b.leftYs) {
      if (y > a.min + EPSILON && y < a.max - EPSILON) cost += 1;
    }
    return cost;
  };
  const trackOrder = groupsByGutter.map((groups) => {
    const tracked = groups.filter((group) => !group.straight);
    const sequence: Group[] = [];
    const remaining = new Set(tracked);
    while (remaining.size > 0) {
      let best: Group | undefined;
      let bestScore = Number.POSITIVE_INFINITY;
      for (const candidate of remaining) {
        let score = 0;
        for (const other of remaining) {
          if (other !== candidate) score += pairCost(other, candidate) - pairCost(candidate, other);
        }
        // Prefer groups that should come first; ties keep a stable, top-to-bottom order.
        if (
          score < bestScore - EPSILON ||
          (Math.abs(score - bestScore) < EPSILON && best && candidate.max > best.max)
        ) {
          best = candidate;
          bestScore = score;
        }
      }
      sequence.push(best as Group);
      remaining.delete(best as Group);
    }
    let improved = true;
    while (improved) {
      improved = false;
      for (let index = 0; index + 1 < sequence.length; index++) {
        const a = sequence[index];
        const b = sequence[index + 1];
        if (pairCost(b, a) < pairCost(a, b)) {
          sequence[index] = b;
          sequence[index + 1] = a;
          improved = true;
        }
      }
    }
    return sequence;
  });

  // ── 5–8. Positions along the flow, routes, zones and chips ──
  // A chip that cannot clear the bodies next to it widens its gutter, and everything along the flow
  // is placed again; widening never moves anything across the flow.
  const columnWidth = Array.from({ length: columnCount }, (_, column) =>
    Math.max(
      0,
      ...order[column].map((item) => (items[item].node === undefined ? 0 : nodes[items[item].node as number].width))
    )
  );
  const columnNodes = Array.from({ length: columnCount }, (_, column) =>
    order[column].filter((item) => items[item].node !== undefined)
  );
  const extraGutter = Array.from({ length: columnCount }, () => 0);
  // A connector between neighbouring columns can only carry its chip between the track and its
  // target, so start each gutter wide enough for that; crowded gutters still widen below.
  const chipShapeOf = (label: string): ProjectedBox => {
    const size = input.measureLabel(label);
    return { u0: -size.halfWidth, u1: size.halfWidth, v0: -size.halfHeight, v1: size.halfHeight };
  };
  for (const chain of chainEdges) {
    if (!chain.edge.label || chain.loop || chain.chain.length !== 2) continue;
    const chip = chipShapeOf(chain.edge.label);
    const target = nodes[chain.reversed ? chain.tail : chain.head];
    const targetShapes = shapes[chain.reversed ? chain.tail : chain.head];
    let clearance = 0;
    for (const shape of targetShapes) {
      clearance = Math.max(
        clearance,
        chain.reversed
          ? clearanceAlongFlow({ p: shape, q: chip, dy: 0 })
          : clearanceAlongFlow({ p: chip, q: shape, dy: 0 })
      );
    }
    const gutter = nodeColumn[chain.tail];
    const needed = 2 * (clearance - target.width / 2) - MIN_GUTTER;
    extraGutter[gutter] = Math.max(extraGutter[gutter], needed);
  }

  /** The narrowest a gutter can be: room for every track it carries, clear of both columns. */
  const gutterWidth = (gutter: number) =>
    Math.max(MIN_GUTTER, 2 * GUTTER_CLEARANCE + Math.max(0, trackOrder[gutter].length - 1) * TRACK_GAP) +
    extraGutter[gutter];

  const placeAlongFlow = () => {
    // Column positions (tile x).
    const columnX = Array.from({ length: columnCount }, () => 0);
    for (let column = 1; column < columnCount; column++) {
      let x = columnX[column - 1] + columnWidth[column - 1] / 2 + gutterWidth(column - 1) + columnWidth[column] / 2;
      // Flat text must clear the bodies around it, including diagonal neighbours that are far apart
      // in tile space but close together on screen.
      for (let earlier = column - 1; earlier >= Math.max(0, column - 2); earlier--) {
        for (const a of columnNodes[earlier]) {
          for (const b of columnNodes[column]) {
            const dy = items[b].y - items[a].y;
            for (const p of shapes[items[a].node as number]) {
              for (const q of shapes[items[b].node as number]) {
                x = Math.max(x, columnX[earlier] + clearanceAlongFlow({ p, q, dy }));
              }
            }
          }
        }
      }
      columnX[column] = x;
    }
    for (let gutter = 0; gutter < columnCount; gutter++) {
      const sequence = trackOrder[gutter];
      const start = columnX[gutter] + columnWidth[gutter] / 2;
      // The gutter after the last column only carries same-column loops, but it needs room for all
      // of them just like any other gutter.
      const end =
        gutter + 1 < columnCount ? columnX[gutter + 1] - columnWidth[gutter + 1] / 2 : start + gutterWidth(gutter);
      const middle = (start + end) / 2;
      sequence.forEach((group, index) => {
        group.x = middle + (index - (sequence.length - 1) / 2) * TRACK_GAP;
      });
    }
    const tileOf = (item: number) => ({ x: columnX[items[item].column], y: items[item].y });

    // Routes.
    const routes = new Map<string, { points: IsoTilePoint[]; reversed: boolean; chain: ChainEdge }>();
    for (const chain of chainEdges) {
      const points: IsoTilePoint[] = [tileOf(chain.tail)];
      if (chain.loop) {
        const group = loopGroup.get(chain);
        if (group) points.push({ x: group.x, y: items[chain.tail].y }, { x: group.x, y: items[chain.head].y });
      } else {
        for (const link of chainLinks.get(chain) ?? []) {
          const group = linkGroup.get(link) as Group;
          if (group.straight) continue;
          points.push({ x: group.x, y: items[link.left].y }, { x: group.x, y: items[link.right].y });
        }
      }
      points.push(tileOf(chain.head));
      const simplified = simplifyRoute(points);
      if (simplified.length === 1) simplified.push({ ...simplified[0] });
      routes.set(chain.edge.id, {
        points: chain.reversed ? simplified.reverse() : simplified,
        reversed: chain.reversed,
        chain
      });
    }

    // Zone rectangles.
    const zoneRects = new Map<string, { from: IsoTilePoint; to: IsoTilePoint }>();
    const placeZone = (zoneId: string): { from: IsoTilePoint; to: IsoTilePoint } => {
      const existing = zoneRects.get(zoneId);
      if (existing) return existing;
      const range = zoneColumns.get(zoneId) as { min: number; max: number };
      const children = zoneIds.filter((id) => zoneById.get(id)?.parent === zoneId).map(placeZone);
      const ownMembers = nodes.some((_, index) => nodeZone[index] === zoneId);
      let minX = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      if (ownMembers || children.length === 0) {
        minX = columnX[range.min] - columnWidth[range.min] / 2 - ZONE_PAD_SIDE;
        maxX = columnX[range.max] + columnWidth[range.max] / 2 + ZONE_PAD_SIDE;
      }
      for (const child of children) {
        minX = Math.min(minX, child.from.x - PARENT_ZONE_PAD);
        maxX = Math.max(maxX, child.to.x + PARENT_ZONE_PAD);
      }
      const rect = {
        from: { x: minX, y: ranks[zoneLow.get(zoneId) as number] / SCALE },
        to: { x: maxX, y: ranks[zoneHigh.get(zoneId) as number] / SCALE }
      };
      zoneRects.set(zoneId, rect);
      return rect;
    };
    for (const zoneId of zoneIds) placeZone(zoneId);

    // Connector chips: clear of node bodies, name tags, zone tags and each other, and as close to
    // where the connector starts as that allows.
    // Spatial indexes keep each candidate's checks local, so placing hundreds of chips stays linear.
    const bodies = createBoxIndex({ cellSize: INDEX_CELL });
    const tags = createBoxIndex({ cellSize: INDEX_CELL });
    const chips = createBoxIndex({ cellSize: INDEX_CELL });
    items.forEach((item, index) => {
      if (item.node === undefined) return;
      const { u, v } = projectTile(tileOf(index));
      shapes[item.node].forEach((shape, shapeIndex) =>
        (shapeIndex < BODY_SHAPES ? bodies : tags).insert(shiftBox({ box: shape, u, v }))
      );
    });
    for (const [zoneId, rect] of zoneRects) {
      const tag = input.zoneTag?.(zoneId);
      if (!tag) continue;
      const { u, v } = projectTile(rect.from);
      tags.insert(shiftBox({ box: tag, u, v }));
    }
    const labelTiles = new Map<string, IsoTilePoint>();
    const crowdedGutters = new Set<number>();
    const score = (box: ProjectedBox) => {
      const blocked = bodies.overlapArea(box) + chips.overlapArea(box);
      const covered = tags.overlapArea(box);
      return { blocked: blocked + covered, cost: blocked * 100 + covered * 20 };
    };
    // A chip on a stretch that other connectors share would label them too, so it may only sit
    // where every connector passing through carries the same label. Route segments are indexed by
    // grid cell so a candidate only looks at the connectors that pass near it.
    const segmentCells = new Map<string, { chain: ChainEdge; start: IsoTilePoint; end: IsoTilePoint }[]>();
    const segmentCellKey = (x: number, y: number) => `${Math.floor(x / INDEX_CELL)},${Math.floor(y / INDEX_CELL)}`;
    for (const chain of chainEdges) {
      const route = routes.get(chain.edge.id)?.points ?? [];
      for (let index = 0; index + 1 < route.length; index++) {
        const start = route[index];
        const end = route[index + 1];
        const x0 = Math.floor((Math.min(start.x, end.x) - EPSILON) / INDEX_CELL);
        const x1 = Math.floor((Math.max(start.x, end.x) + EPSILON) / INDEX_CELL);
        const y0 = Math.floor((Math.min(start.y, end.y) - EPSILON) / INDEX_CELL);
        const y1 = Math.floor((Math.max(start.y, end.y) + EPSILON) / INDEX_CELL);
        for (let cellX = x0; cellX <= x1; cellX++) {
          for (let cellY = y0; cellY <= y1; cellY++) {
            const key = `${cellX},${cellY}`;
            const cell = segmentCells.get(key);
            if (cell) cell.push({ chain, start, end });
            else segmentCells.set(key, [{ chain, start, end }]);
          }
        }
      }
    }
    const mislabels = (chain: ChainEdge, tile: IsoTilePoint) =>
      (segmentCells.get(segmentCellKey(tile.x, tile.y)) ?? []).some(
        ({ chain: other, start, end }) =>
          other !== chain &&
          other.edge.label !== chain.edge.label &&
          [other.edge.from, other.edge.to].some((id) => id === chain.edge.from || id === chain.edge.to) &&
          pointOnRoute({ point: tile, route: [start, end] })
      );
    const commit = ({ tile, box, edgeIds }: { tile: IsoTilePoint; box: ProjectedBox; edgeIds: string[] }) => {
      const rounded = { x: round(tile.x), y: round(tile.y) };
      chips.insert(box);
      for (const id of edgeIds) labelTiles.set(id, rounded);
    };
    const gutterAt = (x: number) => {
      let gutter = 0;
      while (gutter + 1 < columnCount && columnX[gutter + 1] <= x) gutter += 1;
      return gutter;
    };

    const labelled = chainEdges
      .filter((chain) => chain.edge.label)
      .sort(
        (a, b) =>
          nodeColumn[nodeIndex.get(a.edge.from) as number] - nodeColumn[nodeIndex.get(b.edge.from) as number] ||
          a.edge.id.localeCompare(b.edge.id)
      );

    // A fan-out whose connectors share a label gets one chip where its trunk leaves the source.
    const fanOuts = new Map<string, ChainEdge[]>();
    for (const chain of labelled) {
      if (chain.reversed || chain.loop) continue;
      const group = linkGroup.get((chainLinks.get(chain) ?? [])[0]);
      if (!group || group.straight || group.leftYs.length !== 1) continue;
      const key = `${chain.tail}|${chain.edge.label}|${groupsByGutter[group.gutter].indexOf(group)}@${group.gutter}`;
      fanOuts.set(key, [...(fanOuts.get(key) ?? []), chain]);
    }
    for (const fanOut of fanOuts.values()) {
      if (fanOut.length < 2) continue;
      const group = linkGroup.get((chainLinks.get(fanOut[0]) ?? [])[0]) as Group;
      const tile = { x: group.x, y: items[fanOut[0].tail].y };
      const { u, v } = projectTile(tile);
      const box = shiftBox({ box: chipShapeOf(fanOut[0].edge.label as string), u, v });
      const result = score(box);
      if (result.blocked > EPSILON || mislabels(fanOut[0], tile)) continue;
      commit({ tile, box, edgeIds: fanOut.map((chain) => chain.edge.id) });
    }

    for (const chain of labelled) {
      if (labelTiles.has(chain.edge.id)) continue;
      const shape = chipShapeOf(chain.edge.label as string);
      const route = routes.get(chain.edge.id)?.points ?? [];
      let best: { tile: IsoTilePoint; box: ProjectedBox; blocked: number; cost: number } | undefined;
      let travelled = 0;
      // Candidates come in order of distance from the start, and distance is part of the cost, so
      // once the best cost is no more than the distance cost alone nothing later can beat it.
      search: for (let index = 0; index + 1 < route.length; index++) {
        const start = route[index];
        const end = route[index + 1];
        const length = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
        const samples = Math.min(CHIP_SAMPLES_PER_SEGMENT, Math.max(1, Math.round(length / CHIP_SAMPLE_SPACING)));
        for (let sample = 0; sample < samples; sample++) {
          const fraction = (sample + 0.5) / samples;
          const distanceCost = (travelled + length * fraction) * CHIP_DISTANCE_COST;
          if (best && best.cost - EPSILON <= distanceCost) break search;
          const tile = { x: start.x + (end.x - start.x) * fraction, y: start.y + (end.y - start.y) * fraction };
          const mislabelled = mislabels(chain, tile);
          // A spot on someone else's trunk costs at least the mislabel penalty; skip the overlap
          // queries when that alone cannot beat the best spot so far.
          if (mislabelled && best && best.cost - EPSILON <= MISLABEL_COST + distanceCost) continue;
          const { u, v } = projectTile(tile);
          const box = shiftBox({ box: shape, u, v });
          const result = score(box);
          const blocked = result.blocked + (mislabelled ? 1 : 0);
          const cost = result.cost + (mislabelled ? MISLABEL_COST : 0) + result.blocked * 1000 + distanceCost;
          if (!best || cost < best.cost - EPSILON) best = { tile, box, blocked, cost };
        }
        travelled += length;
      }
      if (!best) continue;
      if (best.blocked > EPSILON) crowdedGutters.add(gutterAt(best.tile.x));
      commit({ tile: best.tile, box: best.box, edgeIds: [chain.edge.id] });
    }

    return { tileOf, routes, zoneRects, labelTiles, crowdedGutters };
  };

  let placed = placeAlongFlow();
  for (let attempt = 0; attempt < CHIP_WIDENING_ROUNDS && placed.crowdedGutters.size > 0; attempt++) {
    for (const gutter of placed.crowdedGutters) extraGutter[gutter] += CHIP_WIDENING_STEP;
    placed = placeAlongFlow();
  }

  // ── Output ──
  const { tileOf, routes, zoneRects, labelTiles } = placed;
  const roundPoint = (point: IsoTilePoint) => ({ x: round(point.x), y: round(point.y) });
  const nodeTiles = new Map(nodes.map((node, index) => [node.id, roundPoint(tileOf(index))]));
  const edgeOutput = new Map<string, { points: IsoTilePoint[]; labelTile: IsoTilePoint; reversed: boolean }>();
  for (const [id, route] of routes) {
    const points = route.points.map(roundPoint);
    points[0] = nodeTiles.get(route.chain.edge.from) as IsoTilePoint;
    points[points.length - 1] = nodeTiles.get(route.chain.edge.to) as IsoTilePoint;
    edgeOutput.set(id, {
      points,
      labelTile: labelTiles.get(id) ?? midpointOf(points),
      reversed: route.reversed
    });
  }
  const zoneOutput = new Map(
    [...zoneRects].map(([id, rect]) => [id, { from: roundPoint(rect.from), to: roundPoint(rect.to) }])
  );
  return { nodes: nodeTiles, columns: columnById, zones: zoneOutput, edges: edgeOutput };
};

const simplifyRoute = (points: IsoTilePoint[]) => {
  const deduplicated = points.filter(
    (point, index) =>
      index === 0 ||
      Math.abs(point.x - points[index - 1].x) > EPSILON ||
      Math.abs(point.y - points[index - 1].y) > EPSILON
  );
  return deduplicated.filter((point, index) => {
    if (index === 0 || index === deduplicated.length - 1) return true;
    const previous = deduplicated[index - 1];
    const next = deduplicated[index + 1];
    const sameX = Math.abs(previous.x - point.x) < EPSILON && Math.abs(point.x - next.x) < EPSILON;
    const sameY = Math.abs(previous.y - point.y) < EPSILON && Math.abs(point.y - next.y) < EPSILON;
    return !sameX && !sameY;
  });
};

const pointOnRoute = ({ point, route }: { point: IsoTilePoint; route: IsoTilePoint[] }) =>
  route.slice(0, -1).some((start, index) => {
    const end = route[index + 1];
    const withinX = point.x >= Math.min(start.x, end.x) - EPSILON && point.x <= Math.max(start.x, end.x) + EPSILON;
    const withinY = point.y >= Math.min(start.y, end.y) - EPSILON && point.y <= Math.max(start.y, end.y) + EPSILON;
    return withinX && withinY;
  });

const midpointOf = (points: IsoTilePoint[]) => {
  const first = points[0] ?? { x: 0, y: 0 };
  const last = points[points.length - 1] ?? first;
  return { x: round((first.x + last.x) / 2), y: round((first.y + last.y) / 2) };
};
