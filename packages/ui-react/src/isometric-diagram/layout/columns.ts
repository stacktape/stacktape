/**
 * Flow columns: a node sits one column after whatever feeds it.
 *
 * Only edges marked `flow` place their target; every other edge is drawn but never moves a node.
 * Nodes ranked `first` (sources such as users and schedules) take column 0 and nodes ranked `last`
 * (sinks such as data stores) share the final column, so an edge leaving a sink is drawn as a back
 * edge instead of pulling the sink forward. Cycles are broken deterministically: a depth-first
 * search that starts at the sources and otherwise follows input order ignores every edge that
 * closes a cycle.
 */

type ColumnNode = { id: string; rank?: 'first' | 'last' | undefined };
type ColumnEdge = { from: string; to: string; flow: boolean };

export const assignFlowColumns = ({ nodes, edges }: { nodes: ColumnNode[]; edges: ColumnEdge[] }) => {
  const count = nodes.length;
  const indexById = new Map(nodes.map((node, index) => [node.id, index]));
  const flowSuccessors: number[][] = Array.from({ length: count }, () => []);
  const successors: number[][] = Array.from({ length: count }, () => []);
  const hasFlowInput = new Uint8Array(count);

  for (const edge of edges) {
    const from = indexById.get(edge.from);
    const to = indexById.get(edge.to);
    if (from === undefined || to === undefined || from === to) continue;
    successors[from].push(to);
    const placesTarget =
      edge.flow && nodes[from].rank !== 'last' && nodes[to].rank !== 'first' && nodes[to].rank !== 'last';
    if (!placesTarget) continue;
    flowSuccessors[from].push(to);
    hasFlowInput[to] = 1;
  }

  // Depth-first search from the sources first, so a cycle is cut where it closes rather than where
  // the input happened to list it.
  const state = new Uint8Array(count);
  const flowPredecessors: number[][] = Array.from({ length: count }, () => []);
  const finished: number[] = [];
  const roots = [
    ...nodes.map((_, index) => index).filter((index) => !hasFlowInput[index]),
    ...nodes.map((_, index) => index).filter((index) => hasFlowInput[index])
  ];
  for (const root of roots) {
    if (state[root]) continue;
    state[root] = 1;
    const stack = [{ node: root, next: 0 }];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const next = flowSuccessors[frame.node][frame.next];
      if (next === undefined) {
        state[frame.node] = 2;
        finished.push(frame.node);
        stack.pop();
        continue;
      }
      frame.next += 1;
      if (state[next] === 1) continue;
      flowPredecessors[next].push(frame.node);
      if (state[next] === 0) {
        state[next] = 1;
        stack.push({ node: next, next: 0 });
      }
    }
  }
  const topological = finished.reverse();

  const firstColumn = nodes.some((node) => node.rank === 'first') ? 1 : 0;
  const column: number[] = Array.from({ length: count }, () => firstColumn);
  for (const index of topological) {
    if (nodes[index].rank === 'first') {
      column[index] = 0;
      continue;
    }
    for (const predecessor of flowPredecessors[index]) {
      column[index] = Math.max(column[index], column[predecessor] + 1);
    }
  }

  const middleColumns = nodes.flatMap((node, index) => (node.rank ? [] : [column[index]]));
  const lastColumn = middleColumns.length > 0 ? Math.max(...middleColumns) + 1 : firstColumn;

  // A node that nothing feeds moves right until it sits just before the nearest node it reaches,
  // instead of waiting next to the sources with long edges into the rest of the picture.
  for (let pass = 0; pass < 2; pass++) {
    for (const index of [...topological].reverse()) {
      if (nodes[index].rank || flowPredecessors[index].length > 0) continue;
      let limit = Number.POSITIVE_INFINITY;
      for (const successor of successors[index]) {
        if (nodes[successor].rank === 'first') continue;
        const successorColumn = nodes[successor].rank === 'last' ? lastColumn : column[successor];
        limit = Math.min(limit, successorColumn - 1);
      }
      if (Number.isFinite(limit) && limit > column[index]) column[index] = limit;
    }
  }
  nodes.forEach((node, index) => {
    if (node.rank === 'last') column[index] = lastColumn;
  });

  const used = [...new Set(column)].sort((a, b) => a - b);
  const compact = new Map(used.map((value, index) => [value, index]));
  return new Map(nodes.map((node, index) => [node.id, compact.get(column[index]) as number]));
};

/**
 * Splits columns that hold more than `maxPerColumn` nodes into consecutive sub-columns, so a wide
 * fan-out (one gateway in front of forty functions) becomes a block instead of a long diagonal.
 * Nodes that feed a later column go into the last sub-column, next to what they feed; the rest keep
 * input order.
 */
export const wrapTallColumns = ({
  nodes,
  edges,
  columns,
  maxPerColumn
}: {
  nodes: ColumnNode[];
  edges: ColumnEdge[];
  columns: Map<string, number>;
  maxPerColumn: number;
}) => {
  const columnCount = Math.max(0, ...columns.values()) + 1;
  const feedsLater = new Set(
    edges
      .filter((edge) => edge.flow && (columns.get(edge.to) ?? 0) > (columns.get(edge.from) ?? 0))
      .map((edge) => edge.from)
  );
  const subColumn = new Map<string, number>();
  const width = Array.from({ length: columnCount }, () => 1);
  for (let column = 0; column < columnCount; column++) {
    const members = nodes.filter((node) => columns.get(node.id) === column);
    if (members.length <= maxPerColumn) continue;
    const parts = Math.ceil(members.length / maxPerColumn);
    const perPart = Math.ceil(members.length / parts);
    const ordered = [
      ...members.filter((node) => !feedsLater.has(node.id)),
      ...members.filter((node) => feedsLater.has(node.id))
    ];
    ordered.forEach((node, index) => subColumn.set(node.id, Math.floor(index / perPart)));
    width[column] = parts;
  }
  const offset = width.map((_, column) => width.slice(0, column).reduce((sum, value) => sum + value, 0));
  return new Map(
    nodes.map((node) => {
      const column = columns.get(node.id) ?? 0;
      return [node.id, offset[column] + (subColumn.get(node.id) ?? 0)];
    })
  );
};
