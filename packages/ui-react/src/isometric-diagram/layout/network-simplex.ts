/**
 * Network simplex over difference constraints.
 *
 * Finds integer values for `variableCount` variables such that every constraint
 * `value[to] - value[from] >= minLength` holds and the weighted sum of `value[to] - value[from]` is
 * as small as possible. Weighted |a - b| terms are expressed with an auxiliary variable `n` and the
 * constraints `n -> a` and `n -> b` (both `minLength` 0), which is how the layout pulls connected
 * items into line while separation constraints keep them apart.
 *
 * This is the rank-assignment algorithm of Gansner et al., "A Technique for Drawing Directed Graphs"
 * (1993), in the form popularised by Graphviz and dagre. Every loop runs in index order, so equal
 * input always produces equal output.
 *
 * Every pivot rebuilds the spanning tree, so a dense graph can need thousands of expensive pivots.
 * `maxPivots` caps them: the ranks are feasible after every pivot, only less optimal when the cap
 * stops the search early.
 */

export type DifferenceConstraint = {
  from: number;
  to: number;
  minLength: number;
  weight: number;
};

type Edge = DifferenceConstraint;

const mergeParallelConstraints = ({
  variableCount,
  constraints
}: {
  variableCount: number;
  constraints: DifferenceConstraint[];
}) => {
  const byPair = new Map<number, Edge>();
  const edges: Edge[] = [];
  for (const constraint of constraints) {
    if (constraint.from === constraint.to) {
      if (constraint.minLength > 0) throw new Error('A variable cannot be greater than itself');
      continue;
    }
    const key = constraint.from * variableCount + constraint.to;
    const existing = byPair.get(key);
    if (existing) {
      existing.minLength = Math.max(existing.minLength, constraint.minLength);
      existing.weight += constraint.weight;
      continue;
    }
    const edge = { ...constraint };
    byPair.set(key, edge);
    edges.push(edge);
  }
  return edges;
};

/** A feasible start: every variable at the longest constraint path that reaches it. */
const longestPathRanks = ({ variableCount, edges }: { variableCount: number; edges: Edge[] }) => {
  const rank = Array.from({ length: variableCount }, () => 0);
  const inDegree = Array.from({ length: variableCount }, () => 0);
  const outgoing: number[][] = Array.from({ length: variableCount }, () => []);
  edges.forEach((edge, index) => {
    inDegree[edge.to] += 1;
    outgoing[edge.from].push(index);
  });

  const queue: number[] = [];
  for (let variable = 0; variable < variableCount; variable++) {
    if (inDegree[variable] === 0) queue.push(variable);
  }
  let visited = 0;
  for (let head = 0; head < queue.length; head++) {
    const variable = queue[head];
    visited += 1;
    for (const edgeIndex of outgoing[variable]) {
      const edge = edges[edgeIndex];
      rank[edge.to] = Math.max(rank[edge.to], rank[variable] + edge.minLength);
      inDegree[edge.to] -= 1;
      if (inDegree[edge.to] === 0) queue.push(edge.to);
    }
  }
  if (visited !== variableCount) throw new Error('Layout constraints contain a cycle');
  return rank;
};

export const solveDifferenceConstraints = ({
  variableCount,
  constraints,
  maxPivots = 20_000
}: {
  variableCount: number;
  constraints: DifferenceConstraint[];
  maxPivots?: number;
}): number[] => {
  if (variableCount === 0) return [];

  const edges = mergeParallelConstraints({ variableCount, constraints });
  const incident: number[][] = Array.from({ length: variableCount }, () => []);
  edges.forEach((edge, index) => {
    incident[edge.from].push(index);
    incident[edge.to].push(index);
  });

  const rank = longestPathRanks({ variableCount, edges });
  const slack = (edge: Edge) => rank[edge.to] - rank[edge.from] - edge.minLength;

  // ── Feasible tight spanning tree ──
  const isTreeEdge = new Uint8Array(edges.length);
  const inTree = new Uint8Array(variableCount);
  const treeNodes = [0];
  inTree[0] = 1;

  const growTightTree = () => {
    const stack = treeNodes.slice();
    while (stack.length > 0) {
      const variable = stack.pop() as number;
      for (const edgeIndex of incident[variable]) {
        const edge = edges[edgeIndex];
        const other = edge.from === variable ? edge.to : edge.from;
        if (inTree[other] || slack(edge) !== 0) continue;
        inTree[other] = 1;
        isTreeEdge[edgeIndex] = 1;
        treeNodes.push(other);
        stack.push(other);
      }
    }
  };

  growTightTree();
  while (treeNodes.length < variableCount) {
    let bestEdge = -1;
    let bestSlack = Number.POSITIVE_INFINITY;
    for (let index = 0; index < edges.length; index++) {
      const edge = edges[index];
      if (inTree[edge.from] === inTree[edge.to]) continue;
      const edgeSlack = slack(edge);
      if (edgeSlack < bestSlack) {
        bestSlack = edgeSlack;
        bestEdge = index;
      }
    }
    if (bestEdge < 0) throw new Error('Layout constraints must connect every variable');
    const delta = inTree[edges[bestEdge].from] ? bestSlack : -bestSlack;
    for (const variable of treeNodes) rank[variable] += delta;
    growTightTree();
  }

  // ── Tree bookkeeping: parent edge, postorder limits and cut values ──
  const treeAdjacency: number[][] = Array.from({ length: variableCount }, () => []);
  edges.forEach((edge, index) => {
    if (!isTreeEdge[index]) return;
    treeAdjacency[edge.from].push(index);
    treeAdjacency[edge.to].push(index);
  });
  const parentEdge = new Int32Array(variableCount);
  const low = new Int32Array(variableCount);
  const lim = new Int32Array(variableCount);
  const cutValue = new Float64Array(edges.length);
  let postorder: number[] = [];
  let preorder: number[] = [];

  const initLowLim = () => {
    parentEdge.fill(-1);
    const visited = new Uint8Array(variableCount);
    postorder = [];
    preorder = [];
    let nextLim = 1;
    const stack: { variable: number; next: number; low: number }[] = [{ variable: 0, next: 0, low: nextLim }];
    visited[0] = 1;
    preorder.push(0);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const adjacency = treeAdjacency[frame.variable];
      if (frame.next < adjacency.length) {
        const edgeIndex = adjacency[frame.next];
        frame.next += 1;
        const edge = edges[edgeIndex];
        const child = edge.from === frame.variable ? edge.to : edge.from;
        if (visited[child]) continue;
        visited[child] = 1;
        parentEdge[child] = edgeIndex;
        preorder.push(child);
        stack.push({ variable: child, next: 0, low: nextLim });
        continue;
      }
      low[frame.variable] = frame.low;
      lim[frame.variable] = nextLim;
      nextLim += 1;
      postorder.push(frame.variable);
      stack.pop();
    }
  };

  const initCutValues = () => {
    for (const child of postorder) {
      const ownEdgeIndex = parentEdge[child];
      if (ownEdgeIndex < 0) continue;
      const ownEdge = edges[ownEdgeIndex];
      const childIsTail = ownEdge.from === child;
      let value = ownEdge.weight;
      for (const edgeIndex of incident[child]) {
        if (edgeIndex === ownEdgeIndex) continue;
        const edge = edges[edgeIndex];
        const pointsToHead = (edge.from === child) === childIsTail;
        value += pointsToHead ? edge.weight : -edge.weight;
        if (isTreeEdge[edgeIndex]) value += pointsToHead ? -cutValue[edgeIndex] : cutValue[edgeIndex];
      }
      cutValue[ownEdgeIndex] = value;
    }
  };

  const updateRanks = () => {
    for (const variable of preorder) {
      const edgeIndex = parentEdge[variable];
      if (edgeIndex < 0) continue;
      const edge = edges[edgeIndex];
      rank[variable] = edge.from === variable ? rank[edge.to] - edge.minLength : rank[edge.from] + edge.minLength;
    }
  };

  const isDescendant = (variable: number, root: number) => low[root] <= lim[variable] && lim[variable] <= lim[root];

  initLowLim();
  initCutValues();

  for (let pivot = 0; pivot < maxPivots; pivot++) {
    let leaving = -1;
    for (let index = 0; index < edges.length; index++) {
      if (isTreeEdge[index] && cutValue[index] < 0) {
        leaving = index;
        break;
      }
    }
    if (leaving < 0) break;

    const leavingEdge = edges[leaving];
    const tailSubtree = lim[leavingEdge.from] > lim[leavingEdge.to] ? leavingEdge.to : leavingEdge.from;
    const flip = tailSubtree === leavingEdge.to;
    let entering = -1;
    let enteringSlack = Number.POSITIVE_INFINITY;
    for (let index = 0; index < edges.length; index++) {
      const edge = edges[index];
      if (flip !== isDescendant(edge.from, tailSubtree) || flip === isDescendant(edge.to, tailSubtree)) continue;
      const edgeSlack = slack(edge);
      if (edgeSlack < enteringSlack) {
        enteringSlack = edgeSlack;
        entering = index;
      }
    }
    if (entering < 0) break;

    isTreeEdge[leaving] = 0;
    isTreeEdge[entering] = 1;
    for (const endpoint of [leavingEdge.from, leavingEdge.to]) {
      treeAdjacency[endpoint] = treeAdjacency[endpoint].filter((edgeIndex) => edgeIndex !== leaving);
    }
    treeAdjacency[edges[entering].from].push(entering);
    treeAdjacency[edges[entering].to].push(entering);
    initLowLim();
    initCutValues();
    updateRanks();
  }

  const minimum = Math.min(...rank);
  return rank.map((value) => value - minimum);
};
