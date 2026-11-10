/**
 * Role groups: functions and batch jobs that play the same part in a stack are drawn as one node.
 *
 * Two workloads play the same role when the same things start them — the same API, queue, topic, stream, bucket or
 * schedule, or nothing — and they sit in the same place on the network. Once at least `MIN_GROUP_SIZE` share a role,
 * they collapse into one group node, and their connectors merge into one per neighbour and semantic, carrying a count.
 * Expanded groups keep their members as ordinary nodes. Data stores and everything else stay individual.
 *
 * This is a stage on the topology, between `topology.ts` and the scene builder: it knows resources and relations, not
 * geometry. A group takes its first member's place in the node order, so the layout keeps every other node where it
 * was when a group expands or collapses.
 */
import type { DiagramTopology, EdgeSemantic, TopologyEdge, TopologyNode, TopologyTrigger } from './topology.js';

/** A role needs at least this many members before they are drawn as one group. */
export const MIN_GROUP_SIZE = 3;

const GROUPABLE: Record<string, { one: string; many: string; untriggered: string; scheduled: string }> = {
  function: { one: 'function', many: 'functions', untriggered: 'Functions', scheduled: 'Scheduled jobs' },
  'batch-job': { one: 'batch job', many: 'batch jobs', untriggered: 'Batch jobs', scheduled: 'Scheduled batch jobs' }
};

/** Incoming relations that say what a workload is for. Dependencies and egress do not. */
const ROLE_SEMANTICS = new Set<EdgeSemantic>(['request', 'event', 'security']);

export type TopologyGroup = {
  id: string;
  label: string;
  /** The members' resource type. */
  resourceType: string;
  /** "18 functions". */
  typeLabel: string;
  memberIds: string[];
  expanded: boolean;
};

export type GroupedTopology = DiagramTopology & {
  groups: TopologyGroup[];
  /** The group node each collapsed member is drawn as. Members of expanded groups are absent. */
  collapsedInto: Map<string, string>;
};

export const describeGroupSize = ({ resourceType, count }: { resourceType: string; count: number }) => {
  const noun = GROUPABLE[resourceType] ?? { one: 'resource', many: 'resources' };
  return `${count} ${count === 1 ? noun.one : noun.many}`;
};

const groupNoun = (group: TopologyGroup) => GROUPABLE[group.resourceType]?.many ?? 'resources';

const slug = (value: string) => value.replace(/[^a-zA-Z0-9-]/g, '-');

type RoleSource = { from: string; semantic: EdgeSemantic };

const roleLabel = ({
  sources,
  resourceType,
  nodeById
}: {
  sources: RoleSource[];
  resourceType: string;
  nodeById: Map<string, TopologyNode>;
}) => {
  const words = GROUPABLE[resourceType];
  const names = sources.map((source) => nodeById.get(source.from)?.label ?? source.from);
  if (sources.length === 0) return words.untriggered;
  if (sources.length > 1) {
    return sources.length === 2 ? `${names[0]} + ${names[1]} handlers` : `${names[0]} + ${names.length - 1} more`;
  }
  const [{ from, semantic }] = sources;
  const name = names[0];
  if (semantic === 'security') return `${name} authorizers`;
  switch (nodeById.get(from)?.resourceType) {
    case 'schedule':
      return words.scheduled;
    case 'user':
      return 'Function URLs';
    case 'http-api-gateway':
    case 'websocket-api-gateway':
    case 'cloudfront':
      return `${name} routes`;
    case 'appsync-api':
      return `${name} resolvers`;
    case 'application-load-balancer':
    case 'network-load-balancer':
      return `${name} targets`;
    case 'agentcore-gateway':
      return `${name} tools`;
    case 'sqs-queue':
    case 'kinesis-stream':
    case 'kafka-cluster':
      return `${name} consumers`;
    case 'sns-topic':
    case 'event-bus':
      return `${name} subscribers`;
    case 'dynamo-db-table':
      return `${name} stream consumers`;
    default:
      return `${name} handlers`;
  }
};

/** Finds the role groups of a topology. Pure and deterministic: the same topology always yields the same groups. */
export const findRoleGroups = ({ topology }: { topology: DiagramTopology }) => {
  const nodeById = new Map(topology.nodes.map((node) => [node.id, node]));
  const sourcesOf = new Map<string, RoleSource[]>();
  for (const edge of topology.edges) {
    if (!ROLE_SEMANTICS.has(edge.semantic)) continue;
    const list = sourcesOf.get(edge.to) ?? [];
    if (!list.some((source) => source.from === edge.from && source.semantic === edge.semantic)) {
      list.push({ from: edge.from, semantic: edge.semantic });
    }
    sourcesOf.set(edge.to, list);
  }

  const candidates = new Map<string, { key: string; sources: RoleSource[]; node: TopologyNode; members: string[] }>();
  for (const node of topology.nodes) {
    if (node.implicit || !GROUPABLE[node.resourceType]) continue;
    const sources = (sourcesOf.get(node.id) ?? []).toSorted((a, b) =>
      `${a.from}:${a.semantic}`.localeCompare(`${b.from}:${b.semantic}`)
    );
    const signature = sources.map((source) => `${source.from}:${source.semantic}`).join('+') || 'none';
    const key = `${node.resourceType}--${signature}${node.subnet ? `--${node.subnet}` : ''}`;
    const candidate = candidates.get(key) ?? { key, sources, node, members: [] };
    candidate.members.push(node.id);
    candidates.set(key, candidate);
  }

  const groups = [...candidates.values()]
    .filter((candidate) => candidate.members.length >= MIN_GROUP_SIZE)
    .map((candidate) => ({
      id: `group--${slug(candidate.key)}`,
      label: roleLabel({ sources: candidate.sources, resourceType: candidate.node.resourceType, nodeById }),
      resourceType: candidate.node.resourceType,
      subnet: candidate.node.subnet,
      typeLabel: describeGroupSize({ resourceType: candidate.node.resourceType, count: candidate.members.length }),
      memberIds: candidate.members
    }));

  // The same role inside and outside the VPC gets two groups; say which is which.
  const labelCounts = new Map<string, number>();
  for (const group of groups) labelCounts.set(group.label, (labelCounts.get(group.label) ?? 0) + 1);
  return groups.map(({ id, label, resourceType, subnet, typeLabel, memberIds }) => ({
    id,
    label: (labelCounts.get(label) ?? 0) > 1 && subnet ? `${label} (VPC)` : label,
    resourceType,
    typeLabel,
    memberIds
  }));
};

// ── Merged connectors ──

const ROUTE_SOURCE_TYPES = new Set([
  'http-api-gateway',
  'websocket-api-gateway',
  'application-load-balancer',
  'network-load-balancer',
  'cloudfront'
]);

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

type MergedEdge = { from: string; to: string; semantic: EdgeSemantic; originals: TopologyEdge[] };

/**
 * The visible label of a merged connector. Requests into a group from an API count its routes; an event label such as
 * `poll` or a schedule rate stays when every merged connector carries it, and becomes a count otherwise.
 */
const mergedLabel = ({
  merged,
  routeCount,
  sourceType
}: {
  merged: MergedEdge;
  routeCount: number;
  sourceType: string | undefined;
}) => {
  const labels = [...new Set(merged.originals.map((edge) => edge.label))];
  if (merged.semantic === 'request' && sourceType && ROUTE_SOURCE_TYPES.has(sourceType) && routeCount > 0) {
    return plural(routeCount, 'route');
  }
  if (merged.semantic === 'request' && sourceType === 'appsync-api' && routeCount > 0) {
    return plural(routeCount, 'field');
  }
  if (merged.semantic === 'request' && sourceType === 'agentcore-gateway' && routeCount > 0) {
    return plural(routeCount, 'tool');
  }
  if (labels.length === 1) return labels[0];
  if (merged.semantic === 'event') {
    return sourceType === 'schedule' ? plural(merged.originals.length, 'schedule') : plural(routeCount, 'trigger');
  }
  if (merged.semantic === 'request') return plural(merged.originals.length, 'route');
  return undefined;
};

/** A short count for the panel and the tooltip: "used by 7 of 18", "all 18", "12 connections". */
const mergedSummary = ({
  merged,
  fromGroup,
  toGroup
}: {
  merged: MergedEdge;
  fromGroup: TopologyGroup | undefined;
  toGroup: TopologyGroup | undefined;
}) => {
  if (fromGroup && toGroup) return plural(merged.originals.length, 'connection');
  const group = (fromGroup ?? toGroup) as TopologyGroup;
  const involved = new Set(merged.originals.map((edge) => (fromGroup ? edge.from : edge.to))).size;
  const total = group.memberIds.length;
  const share = involved === total ? `all ${total}` : `${involved} of ${total}`;
  if (toGroup) return merged.semantic === 'dependency' ? `connects to ${share}` : `reaches ${share}`;
  return `used by ${share}`;
};

const mergedDescription = ({
  merged,
  summary,
  label,
  fromGroup,
  toGroup
}: {
  merged: MergedEdge;
  summary: string;
  label: string | undefined;
  fromGroup: TopologyGroup | undefined;
  toGroup: TopologyGroup | undefined;
}) => {
  const capitalized = `${summary.charAt(0).toUpperCase()}${summary.slice(1)}`;
  let lead: string;
  if (fromGroup && toGroup) {
    lead = `${capitalized} between members of ${fromGroup.label} and ${toGroup.label}.`;
  } else if (fromGroup) {
    lead = `${capitalized} ${groupNoun(fromGroup)} in ${fromGroup.label}.`;
  } else {
    const group = toGroup as TopologyGroup;
    const counted = label && /^\d/.test(label) ? `${label} ${summary.replace(/^reaches/, 'reach')}` : capitalized;
    lead = `${counted} ${groupNoun(group)} in ${group.label}.`;
  }
  const descriptions = [...new Set(merged.originals.map((edge) => edge.description).filter(Boolean))];
  return descriptions.length === 1 ? `${lead} ${descriptions[0]}` : lead;
};

/**
 * Collapses every role group not listed in `expandedGroupIds` into one node and merges the connectors that touch it.
 * Connectors between two ungrouped nodes are returned unchanged.
 */
export const groupTopology = ({
  topology,
  expandedGroupIds = new Set()
}: {
  topology: DiagramTopology;
  expandedGroupIds?: ReadonlySet<string> | undefined;
}): GroupedTopology => {
  const groups: TopologyGroup[] = findRoleGroups({ topology }).map(
    ({ id, label, resourceType, typeLabel, memberIds }) => ({
      id,
      label,
      resourceType,
      typeLabel,
      memberIds,
      expanded: expandedGroupIds.has(id)
    })
  );
  const collapsedInto = new Map<string, string>();
  for (const group of groups) {
    if (group.expanded) continue;
    for (const memberId of group.memberIds) collapsedInto.set(memberId, group.id);
  }
  if (collapsedInto.size === 0) return { ...topology, groups, collapsedInto };

  const groupById = new Map(groups.map((group) => [group.id, group]));
  const nodeById = new Map(topology.nodes.map((node) => [node.id, node]));

  // A group takes the place of its first member, so the layout's model order stays stable.
  const nodes: TopologyNode[] = [];
  for (const node of topology.nodes) {
    const groupId = collapsedInto.get(node.id);
    if (!groupId) {
      nodes.push(node);
      continue;
    }
    const group = groupById.get(groupId) as TopologyGroup;
    if (group.memberIds[0] !== node.id) continue;
    nodes.push({
      id: group.id,
      label: group.label,
      resourceType: group.resourceType,
      layer: node.layer,
      subnet: node.subnet,
      typeLabel: group.typeLabel,
      memberIds: group.memberIds
    });
  }

  // Merged connectors keep the place of the first connector they absorb.
  const slots: Array<{ edge: TopologyEdge } | { merged: MergedEdge }> = [];
  const mergedByKey = new Map<string, MergedEdge>();
  for (const edge of topology.edges) {
    const from = collapsedInto.get(edge.from) ?? edge.from;
    const to = collapsedInto.get(edge.to) ?? edge.to;
    if (from === edge.from && to === edge.to) {
      slots.push({ edge });
      continue;
    }
    // Relations between members of one group stay in the panel's member list.
    if (from === to) continue;
    const key = `${from}->${to}::${edge.semantic}`;
    const existing = mergedByKey.get(key);
    if (existing) {
      existing.originals.push(edge);
      continue;
    }
    const merged: MergedEdge = { from, to, semantic: edge.semantic, originals: [edge] };
    mergedByKey.set(key, merged);
    slots.push({ merged });
  }

  const countTriggers = (merged: MergedEdge) =>
    topology.triggers.filter((trigger: TopologyTrigger) =>
      merged.originals.some(
        (edge) => edge.from === trigger.from && edge.to === trigger.to && edge.semantic === trigger.semantic
      )
    ).length;

  const resolved = slots.map((slot): TopologyEdge => {
    if ('edge' in slot) return slot.edge;
    const { merged } = slot;
    const fromGroup = groupById.get(merged.from);
    const toGroup = groupById.get(merged.to);
    const sourceType = fromGroup ? undefined : nodeById.get(merged.from)?.resourceType;
    const label = mergedLabel({ merged, routeCount: countTriggers(merged), sourceType });
    const summary = mergedSummary({ merged, fromGroup, toGroup });
    return {
      id: `edge-${slug(`${merged.from}->${merged.to}::${merged.semantic}::group`)}`,
      from: merged.from,
      to: merged.to,
      semantic: merged.semantic,
      label,
      summary,
      count: merged.originals.length,
      description: mergedDescription({ merged, summary, label, fromGroup, toGroup })
    };
  });

  return { ...topology, nodes, edges: resolved, groups, collapsedInto };
};
