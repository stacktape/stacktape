/**
 * What the side panel says about each node: its connections as drawn, the routes of an API, and the members of a role
 * group with their own triggers and connections. Built from the topology before and after grouping, so a collapsed
 * member keeps its own relations while the group node shows the merged ones.
 */
import type { GroupedTopology } from './grouping.js';
import type { IsoGroup, IsoNodeConnection, IsoRoute } from './scene.js';
import type { DiagramTopology, TopologyEdge, TopologyTrigger } from './topology.js';

type Endpoint = { id: string; name: string };

const triggerText = ({ trigger, sourceName }: { trigger: TopologyTrigger; sourceName: string }) => {
  if (trigger.route) return `${trigger.route.method} ${trigger.route.path}`;
  if (trigger.from === 'schedule--implicit' || trigger.from === 'user') return trigger.summary;
  return `${sourceName} · ${trigger.summary}`;
};

export const buildSceneDetails = ({ base, grouped }: { base: DiagramTopology; grouped: GroupedTopology }) => {
  const baseLabels = new Map(base.nodes.map((node) => [node.id, node.label]));
  const firewalls = new Set(
    base.nodes.filter((node) => node.resourceType === 'web-app-firewall').map((node) => node.id)
  );
  /** A firewall protects what it fronts; every other security edge is a sign-in or authorizer check. */
  const kindOf = (edge: TopologyEdge) =>
    edge.semantic === 'security' && !firewalls.has(edge.from) ? 'auth' : edge.semantic;
  const drawnLabels = new Map(grouped.nodes.map((node) => [node.id, node.label]));
  const drawnId = (id: string) => grouped.collapsedInto.get(id) ?? id;

  /** The routes or event summaries one connector stands for, e.g. "GET /orders, POST /orders". */
  const triggerSummary = (edge: TopologyEdge) => {
    const matching = base.triggers.filter(
      (trigger) => trigger.from === edge.from && trigger.to === edge.to && trigger.semantic === edge.semantic
    );
    if (matching.length === 0) return edge.label;
    return matching
      .map((trigger) => (trigger.route ? `${trigger.route.method} ${trigger.route.path}` : trigger.summary))
      .join(', ');
  };

  const connectionsOf = ({
    nodeId,
    edges,
    endpoint,
    merged
  }: {
    nodeId: string;
    edges: TopologyEdge[];
    endpoint: (id: string) => Endpoint;
    merged: boolean;
  }): IsoNodeConnection[] =>
    edges.flatMap((edge) => {
      if (edge.from !== nodeId && edge.to !== nodeId) return [];
      const direction = edge.from === nodeId ? 'out' : 'in';
      const other = endpoint(direction === 'out' ? edge.to : edge.from);
      const text = merged && edge.count ? (edge.label ?? edge.summary) : triggerSummary(edge);
      return [{ direction, semantic: kindOf(edge), nodeId: other.id, name: other.name, text }];
    });

  const drawnEndpoint = (id: string): Endpoint => ({ id, name: drawnLabels.get(id) ?? id });
  const baseEndpoint = (id: string): Endpoint => ({ id: drawnId(id), name: baseLabels.get(id) ?? id });

  const connections = new Map(
    grouped.nodes.map((node) => [
      node.id,
      connectionsOf({ nodeId: node.id, edges: grouped.edges, endpoint: drawnEndpoint, merged: true })
    ])
  );

  const routes = new Map<string, IsoRoute[]>();
  for (const trigger of base.triggers) {
    if (!trigger.route || !drawnLabels.has(trigger.from)) continue;
    const list = routes.get(trigger.from) ?? [];
    list.push({
      method: trigger.route.method,
      path: trigger.route.path,
      target: baseLabels.get(trigger.to) ?? trigger.to,
      targetNodeId: drawnId(trigger.to),
      authorizer: trigger.route.authorizer
    });
    routes.set(trigger.from, list);
  }

  const groups: IsoGroup[] = grouped.groups.map((group) => ({
    id: group.id,
    label: group.label,
    typeLabel: group.typeLabel,
    expanded: group.expanded,
    members: group.memberIds.map((memberId) => {
      const member = base.nodes.find((node) => node.id === memberId);
      return {
        id: memberId,
        label: member?.label ?? memberId,
        typeLabel: member?.typeLabel,
        triggers: [
          ...base.triggers
            .filter((trigger) => trigger.to === memberId)
            .map((trigger) => triggerText({ trigger, sourceName: baseLabels.get(trigger.from) ?? trigger.from })),
          ...(member?.undrawnTriggers ?? []).map((trigger) => trigger.text)
        ],
        connections: connectionsOf({ nodeId: memberId, edges: base.edges, endpoint: baseEndpoint, merged: false })
      };
    })
  }));

  return { connections, routes, groups };
};
