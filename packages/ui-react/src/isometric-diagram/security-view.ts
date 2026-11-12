/**
 * The Access layer: who the deployed stage lets connect to each resource, as one tag above it, and each node's security
 * groups in plain words for the side panel.
 *
 * Everything comes from the deployed stage's template (`security-groups.ts`), never from the config. The picture is
 * the one the layout already placed and nothing in it changes: the layer only adds tags. A tag answers one question,
 * "who can connect to this?", in resource terms: the internet, the VPC, named resources, address ranges, nothing.
 * Security groups, ports and protocols are how AWS enforces the answer, so they stay in the side panel. Red is kept for
 * what a reader must not miss: a data store or an admin port the internet can reach.
 *
 * A globe always means the internet can reach the node and a padlock that it cannot, whichever other layer is on: a
 * service behind a public gateway is "Public" when the gateway is drawn as part of it and "Public via web GW" when the
 * gateway is drawn beside it.
 *
 * The work is bounded by groups and rules, not by members: a group of 150 functions drawn as one node gets one tag.
 */
import type { LayoutNode } from './layout/diagram-layout.js';
import type { ProjectedBox } from './layout/projected-box.js';
import type { IsoLabel, IsoNode, IsoNodeAccess, IsoNodeSecurityGroup, IsoScene, IsoTilePoint } from './scene.js';
import type {
  SecurityGroup,
  SecurityGroupMember,
  SecurityGroupModel,
  SecurityGroupRule,
  SecurityModelConditions,
  SecurityRulePeer
} from './security-groups.js';
import type { DiagramTopology } from './topology.js';
import { nodeShapes } from './layout/diagram-layout.js';
import { boxOverlapArea, createBoxIndex, projectTile, shiftBox } from './layout/projected-box.js';
import {
  ACCESS_TAG_HEIGHT_PX,
  ACCESS_TAG_RISE_PX,
  BADGE_HEIGHT_PX,
  BADGE_OFFSET_PX,
  getAccessTagWidthPx,
  getReplicaBadgeText,
  REPLICA_BADGE_SHIFT_PX,
  SHAPE_HEIGHT_PX
} from './node-appearance.js';

/** Projected units are 40 × 20 px. */
const U_PX = 40;
const V_PX = 20;
const EPSILON = 1e-6;

/** A tag longer than this counts its sources ("Only 3 resources") instead of naming them. */
const TAG_MAX_CHARS = 30;
/** Resources a tag names before it counts them. */
const MAX_NAMED_RESOURCES = 2;

/** What holds data: the internet reaching one of these is always worth red. */
const DATA_KINDS: ReadonlySet<SecurityGroupMember['kind']> = new Set([
  'database',
  'redis',
  'opensearch',
  'kafka',
  'efs-mount-target'
]);

/**
 * Members whose group says nothing about who reaches the node they are drawn as: a NAT instance is plumbing, and an HTTP
 * API's VPC Link is the gateway's way into the VPC, not a way in to the gateway.
 */
const PASS_THROUGH_KINDS: ReadonlySet<SecurityGroupMember['kind']> = new Set(['nat-instance', 'vpc-link']);

/**
 * Members that listen for connections, so "nothing can connect" is worth saying. A function, a batch job and an agent
 * runtime are started by AWS and never connected to, so the absence of a rule in says nothing about who can use them.
 */
const LISTENING_KINDS: ReadonlySet<SecurityGroupMember['kind']> = new Set([
  'container-service',
  'ec2-instances',
  'database',
  'redis',
  'opensearch',
  'kafka',
  'load-balancer',
  'efs-mount-target'
]);

const STARTED_BY_AWS_KINDS: ReadonlySet<SecurityGroupMember['kind']> = new Set([
  'function',
  'batch-compute-environment',
  'batch-job',
  'agentcore-runtime'
]);

/** What forwards the internet's requests on: whatever a public one of these may connect to is public through it. */
const FORWARDING_TYPES: Record<string, string> = {
  'http-api-gateway': 'gateway',
  'application-load-balancer': 'load balancer',
  'network-load-balancer': 'load balancer'
};

/**
 * Resources with no security group that are used through AWS's own API, so AWS permissions decide who can. Not the
 * rest: an Upstash database is protected by its own password, and a user pool's sign-in pages are public.
 */
const AWS_PERMISSION_TYPES: ReadonlySet<string> = new Set([
  'function',
  'dynamo-db-table',
  'bucket',
  'sqs-queue',
  'sns-topic',
  'event-bus',
  'kinesis-stream',
  'state-machine',
  'email-sender',
  'deployment-script',
  'custom-resource-definition'
]);

/** What the tooltip and the panel say of a node the layer gives no tag. */
const NO_GROUP_NOTE = 'Security groups do not apply to it. AWS permissions (IAM) decide who can use it.';
const STARTED_BY_AWS_NOTE = 'Nothing connects to it directly. AWS starts it, and AWS permissions (IAM) decide who can.';

/** Ports that administer a machine. Open to the internet, they are a finding whatever the machine is. */
const ADMIN_PORTS: ReadonlyArray<{ port: number; name: string }> = [
  { port: 22, name: 'SSH' },
  { port: 3389, name: 'Remote desktop' }
];
/** A port range this wide is "all ports" to a reader. */
const ALL_PORTS_SPAN = 60_000;

export type AccessLayerInput = {
  scene: IsoScene;
  /** The node each node of the full picture is drawn as in this view, or null when the view drops it. */
  resolve: (nodeId: string) => string | null;
  /** The topology before grouping: the node IDs group members map to. */
  base: DiagramTopology;
  /** The group node a collapsed member is drawn as. */
  collapsedInto: ReadonlyMap<string, string>;
  layoutNodes: ReadonlyMap<string, LayoutNode>;
  security: SecurityGroupModel;
  measureChip: (text: string) => { halfWidth: number; halfHeight: number };
};

// ── Members and names ──

/**
 * Implicit parts a member kind is drawn as, tried before its owner: an SSR site's server function, a web service's
 * load balancer or HTTP API gateway (whose VPC Link carries the group), Convex's load balancer and database.
 */
const MEMBER_PARTS: Partial<Record<SecurityGroupMember['kind'], string[]>> = {
  function: ['server'],
  'load-balancer': ['alb', 'nlb'],
  'vpc-link': ['gw'],
  database: ['db']
};

/**
 * Logical-ID stems, after the owner's own, of the resources a Stacktape resource nests, by the implicit part the diagram
 * draws them as. Convex runs its backend and dashboard as two container services of one owner, so the member kind alone
 * cannot tell them apart; `AppDashboardContainerWorkloadService` is the dashboard's.
 */
const NESTED_PART_STEMS: Record<string, string[]> = {
  dashboard: ['Dashboard'],
  db: ['Database'],
  alb: ['LoadBalancer'],
  nlb: ['LoadBalancer'],
  gw: ['VpcLink']
};

/** The CloudFormation logical-ID prefix of a Stacktape resource: its name with a capital first letter. */
const logicalPrefix = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

export const memberNodeId = ({ member, ids }: { member: SecurityGroupMember; ids: ReadonlySet<string> }) => {
  if (member.kind === 'nat-instance') return ids.has('nat-gateway') ? 'nat-gateway' : undefined;
  const owner = member.owner?.name;
  if (!owner) return undefined;
  // A nested resource first, by the logical ID that carries the group.
  for (const [part, stems] of Object.entries(NESTED_PART_STEMS)) {
    const id = `${owner}--${part}`;
    if (ids.has(id) && stems.some((stem) => member.logicalId.startsWith(`${logicalPrefix(owner)}${stem}`))) return id;
  }
  for (const part of MEMBER_PARTS[member.kind] ?? []) {
    if (ids.has(`${owner}--${part}`)) return `${owner}--${part}`;
  }
  return ids.has(owner) ? owner : undefined;
};

const OWNERLESS_GROUP_NAMES: Array<[RegExp, string]> = [
  [/^StpVpcFunctions/, 'VPC functions'],
  [/^StpStageNetwork/, 'Stage network'],
  [/^StpBatchInstance/, 'Batch instances'],
  [/^StpNatInstance/, 'NAT instances'],
  [/^StpKafka.*Endpoints/, 'Kafka endpoints']
];

const MEMBER_KIND_SUFFIX: Partial<Record<SecurityGroupMember['kind'], string>> = {
  'load-balancer': 'LB',
  'vpc-link': 'VPC Link'
};

/** How a group's members are drawn: the label of the one implicit part they all are, such as "app dashboard". */
type PartLabel = (group: SecurityGroup) => string | undefined;

const baseGroupName = (group: SecurityGroup, partLabel: PartLabel) => {
  if (group.kind === 'external') return `external ${group.reference ?? group.id.replace(/^external:/, '')}`;
  return `${ownGroupName(group, partLabel)} SG`;
};

const ownGroupName = (group: SecurityGroup, partLabel: PartLabel) => {
  if (group.owner) {
    const part = partLabel(group);
    if (part) return part;
    const kinds = new Set(
      group.members.filter((member) => member.owner?.name === group.owner?.name).map((m) => m.kind)
    );
    const suffix = kinds.size === 1 ? MEMBER_KIND_SUFFIX[[...kinds][0]] : undefined;
    return suffix ? `${group.owner.name} ${suffix}` : group.owner.name;
  }
  return OWNERLESS_GROUP_NAMES.find(([pattern]) => pattern.test(group.id))?.[1] ?? group.id;
};

/** Short names: the owner, or what a stack-wide group is for. Groups that would share a name say what they reach. */
const nameGroups = (security: SecurityGroupModel, partLabel: PartLabel) => {
  const names = new Map(security.groups.map((group) => [group.id, baseGroupName(group, partLabel)]));
  const counts = new Map<string, number>();
  for (const name of names.values()) counts.set(name, (counts.get(name) ?? 0) + 1);
  for (const group of security.groups) {
    const name = names.get(group.id) as string;
    if ((counts.get(name) ?? 0) < 2) continue;
    const reaches = [
      ...new Set(
        security.rules
          .filter(
            (rule) =>
              rule.direction === 'ingress' &&
              rule.peer.kind === 'group' &&
              rule.peer.groupId === group.id &&
              rule.groupId !== group.id
          )
          .map((rule) => {
            const target = security.groups.find((other) => other.id === rule.groupId) as SecurityGroup;
            return target.kind === 'external' ? baseGroupName(target, partLabel) : ownGroupName(target, partLabel);
          })
      )
    ];
    if (reaches.length > 0) names.set(group.id, `${name} → ${reaches.join(', ')}`);
  }
  const final = new Map<string, number>();
  for (const group of security.groups) {
    const name = names.get(group.id) as string;
    const seen = (final.get(name) ?? 0) + 1;
    final.set(name, seen);
    if (seen > 1) names.set(group.id, `${name} ${seen}`);
  }
  return names;
};

// ── Rules in words ──

const PROTOCOL_NAMES: Record<string, string> = { tcp: 'TCP', udp: 'UDP', icmp: 'ICMP', icmpv6: 'ICMPv6' };

/** "TCP 5432", "TCP 32768–65535", "all TCP ports", "all traffic". */
const describeTraffic = (rules: readonly Pick<SecurityGroupRule, 'protocol' | 'ports'>[]) => {
  if (rules.some((rule) => rule.protocol === 'all')) return 'all traffic';
  const byProtocol = new Map<string, string[]>();
  for (const { protocol, ports } of rules) {
    const name = PROTOCOL_NAMES[protocol] ?? (protocol === 'unknown' ? 'unknown protocol' : `protocol ${protocol}`);
    const text =
      protocol === 'icmp' || protocol === 'icmpv6' || protocol === 'unknown' || /^\d+$/.test(protocol)
        ? ''
        : ports === 'all'
          ? 'all ports'
          : ports === 'unknown'
            ? 'unknown ports'
            : ports.from === ports.to
              ? String(ports.from)
              : `${ports.from}–${ports.to}`;
    const list = byProtocol.get(name) ?? [];
    if (text && !list.includes(text)) list.push(text);
    byProtocol.set(name, list);
  }
  return [...byProtocol]
    .map(([name, ports]) =>
      ports.includes('all ports') ? `all ${name} ports` : ports.length > 0 ? `${name} ${ports.join(', ')}` : name
    )
    .join(' · ');
};

const describeConditions = (conditions: SecurityModelConditions) =>
  conditions.length === 0
    ? ''
    : ` (only when ${conditions
        .map((condition) => (condition.startsWith('!') ? `${condition.slice(1)} is false` : condition))
        .join(' and ')})`;

const listNames = (names: readonly string[]) =>
  names.length <= 4 ? names.join(', ') : `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;

const peerKey = (peer: SecurityRulePeer) => JSON.stringify(peer);

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

// ── Tags in words ──

/** What a node's inbound rules add up to. */
type Inbound = {
  /** Rules that let the internet open a connection. */
  internet: SecurityGroupRule[];
  wholeVpc: boolean;
  /** Address ranges other than the internet and the VPC, as the template writes them. */
  ranges: string[];
  /** Resources named by their drawn node, or by their group when nothing of it is drawn. */
  resources: string[];
  /** The drawn nodes among `resources`. */
  sources: string[];
  /**
   * A rule admits a part of the resource that is drawn as this same node, such as a service's HTTP API gateway without
   * the Infrastructure layer: whatever reaches that part reaches the node.
   */
  throughOwnPart: boolean;
  /** A rule admits the node's own group: its tasks or nodes can connect to each other. */
  self: boolean;
  /** A rule's address range is a value set at deploy time, which the template does not hold. It may be anything. */
  unresolved: boolean;
  /** The conditions under which the internet is let in, one entry per way. */
  internetWhen: SecurityModelConditions[];
  /** The conditions under which each drawn source is let in. */
  sourceWhen: Map<string, SecurityModelConditions[]>;
};

/** Every pair of condition sets, one from each list, that can hold together, as one set each. */
const holdingTogether = (first: SecurityModelConditions[], second: SecurityModelConditions[]) => {
  const joint = new Map<string, SecurityModelConditions>();
  for (const a of first) {
    for (const b of second) {
      if (!canHoldTogether(a, b)) continue;
      const merged = [...new Set([...a, ...b])].sort();
      joint.set(merged.join(','), merged);
    }
  }
  return [...joint.values()];
};

/** ICMP lets the internet ping a resource, not connect to it. */
const opensConnections = (rule: SecurityGroupRule) => rule.protocol !== 'icmp' && rule.protocol !== 'icmpv6';

const coversPort = (rule: SecurityGroupRule, port: number) =>
  (rule.protocol === 'tcp' || rule.protocol === 'all') &&
  (rule.ports === 'all' || (rule.ports !== 'unknown' && rule.ports.from <= port && port <= rule.ports.to));

/** Only TCP and UDP have ports: a rule for another protocol (GRE, ESP) opens none, whatever its port fields say. */
const coversAllPorts = (rule: SecurityGroupRule) =>
  rule.protocol === 'all' ||
  ((rule.protocol === 'tcp' || rule.protocol === 'udp') &&
    (rule.ports === 'all' || (rule.ports !== 'unknown' && rule.ports.to - rule.ports.from >= ALL_PORTS_SPAN)));

/**
 * Whether these CloudFormation conditions can hold together. Their values are not in the template, so a conditional
 * rule counts as present; but a rule in one branch of a condition never applies to a member in the other.
 */
const canHoldTogether = (...conditions: SecurityModelConditions[]) => {
  const all = new Set(conditions.flat());
  return ![...all].some((condition) => !condition.startsWith('!') && all.has(`!${condition}`));
};

/** One address rather than a range: "203.0.113.10" reads better than "1 IP range". */
const singleAddress = (range: string) => /^(.+)\/(32|128)$/.exec(range)?.[1];

const PUBLIC = { reach: 'public' as const, text: 'Public', detail: 'Anyone on the internet can reach it.' };

const describeInternet = ({ internet, holdsData }: { internet: SecurityGroupRule[]; holdsData: boolean }) => {
  if (holdsData) {
    return {
      reach: 'exposed' as const,
      text: 'Open to the internet',
      detail: 'Anyone on the internet can connect to it. Only its credentials protect the data.'
    };
  }
  if (internet.some(coversAllPorts)) {
    return {
      reach: 'exposed' as const,
      text: 'All ports open to the internet',
      detail: 'Anyone on the internet can connect to it on any port.'
    };
  }
  const admin = ADMIN_PORTS.find(({ port }) => internet.some((rule) => coversPort(rule, port)));
  if (admin) {
    return {
      reach: 'exposed' as const,
      text: `${admin.name} open to the internet`,
      detail: `Anyone on the internet can try to sign in over ${admin.name}.`
    };
  }
  return PUBLIC;
};

const countRanges = (ranges: readonly string[]) =>
  ranges.every(singleAddress)
    ? `${ranges.length} IP address${ranges.length === 1 ? '' : 'es'}`
    : plural(ranges.length, 'IP range');

const joinSources = (parts: Array<string | undefined>) => parts.filter(Boolean).join(' + ');

/** "web", "web and worker", "web, worker and 203.0.113.10". */
const listInWords = (parts: Array<string | undefined>) => {
  const items = parts.filter((part): part is string => Boolean(part));
  return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
};

const describeLimited = ({ wholeVpc, ranges, resources }: Inbound) => {
  const countedRanges = ranges.length === 0 ? undefined : countRanges(ranges);
  const rangeText = ranges.length === 1 ? (singleAddress(ranges[0]) ?? countedRanges) : countedRanges;
  // Whatever else is allowed in, the VPC already holds it; only addresses outside it are worth adding.
  if (wholeVpc) {
    return {
      text: joinSources(['Anything in the VPC', rangeText]),
      detail: rangeText
        ? `Anything inside the VPC can connect to it, and so can ${rangeText}.`
        : 'Anything inside the VPC can connect to it. The internet cannot.'
    };
  }
  const countedResources = resources.length === 0 ? undefined : plural(resources.length, 'resource');
  const namesResources = resources.length <= MAX_NAMED_RESOURCES;
  const text = `Only ${joinSources([namesResources ? resources.join(', ') : countedResources, rangeText])}`;
  if (text.length <= TAG_MAX_CHARS) {
    const who = listInWords([...(namesResources ? resources : [countedResources]), rangeText]);
    return { text, detail: `Only ${who} can connect to it.` };
  }
  return {
    text: `Only ${joinSources([countedResources, countedRanges])}`,
    detail: `Only ${listInWords([countedResources, countedRanges])} can connect to it.`
  };
};

/** A node a public gateway or load balancer forwards to: as public as what forwards to it. */
const describeForwarded = (forwarders: ReadonlyArray<{ label: string; type: string }>) => {
  const labels = forwarders.map(({ label }) => label);
  const named = `Public via ${labels.join(', ')}`;
  const [only] = forwarders;
  const counted =
    forwarders.length === 1 ? `Public via its ${only.type}` : `Public via ${forwarders.length} entry points`;
  return {
    reach: 'public' as const,
    text: named.length <= TAG_MAX_CHARS ? named : counted,
    detail: `Anyone on the internet can reach it through ${listInWords(labels)}.`
  };
};

// ── Placement ──

const boxAround = ({ u, v }: { u: number; v: number }, size: { halfWidth: number; halfHeight: number }) => ({
  u0: u - size.halfWidth,
  u1: u + size.halfWidth,
  v0: v - size.halfHeight,
  v1: v + size.halfHeight
});

/** Projected position back to tile space. */
const toTile = ({ u, v }: { u: number; v: number }): IsoTilePoint => ({ x: (u + v) / 2, y: (v - u) / 2 });

const round = (value: number) => Math.round(value * 1000) / 1000;

/** Half the width of a node's body where a tag sits: a tag wider than this hangs over the node's sides. */
const BODY_HALF_WIDTH = 0.66;

// ── The layer ──

export const addAccessLayer = ({
  scene,
  resolve,
  base,
  collapsedInto,
  layoutNodes,
  security,
  measureChip
}: AccessLayerInput): IsoScene => {
  const baseIds = new Set(base.nodes.map((node) => node.id));
  const baseLabels = new Map(base.nodes.map((node) => [node.id, node.label]));
  const visible = new Map(scene.nodes.map((node) => [node.id, node]));
  const drawnOf = (baseId: string) => resolve(collapsedInto.get(baseId) ?? baseId);
  const groupById = new Map(security.groups.map((group) => [group.id, group]));
  /** The base node each group member is drawn as, computed once. */
  const memberBase = new Map(
    security.groups.flatMap((group) => group.members.map((member) => [member, memberNodeId({ member, ids: baseIds })]))
  );
  const partLabel: PartLabel = (group) => {
    const parts = new Set(group.members.map((member) => memberBase.get(member)));
    const [only] = parts;
    const kinds = new Set(group.members.map((member) => member.kind));
    // Load balancers and VPC Links keep the owner's name and their kind ("web LB SG").
    if (parts.size !== 1 || !only?.includes('--') || kinds.has('load-balancer') || kinds.has('vpc-link'))
      return undefined;
    return baseLabels.get(only);
  };
  const names = nameGroups(security, partLabel);

  // Members: the drawn node of each, and the resources behind them for the words.
  const groupNodes = new Map<string, string[]>();
  /** What carries the group on each drawn node, e.g. its load balancer. */
  const memberKinds = new Map<string, Set<SecurityGroupMember['kind']>>();
  const groupResources = new Map<string, string[]>();
  /** The conditions under which each drawn node carries each group, one entry per member. */
  const attachments = new Map<string, SecurityModelConditions[]>();
  for (const group of security.groups) {
    const nodes = new Set<string>();
    const resources = new Set<string>();
    for (const member of group.members) {
      const baseId = memberBase.get(member);
      if (!baseId) continue;
      resources.add(baseLabels.get(baseId) ?? baseId);
      const drawn = drawnOf(baseId);
      if (!drawn || !visible.has(drawn)) continue;
      nodes.add(drawn);
      const kinds = memberKinds.get(`${group.id}|${drawn}`) ?? new Set();
      kinds.add(member.kind);
      memberKinds.set(`${group.id}|${drawn}`, kinds);
      attachments.set(`${group.id}|${drawn}`, [...(attachments.get(`${group.id}|${drawn}`) ?? []), member.conditions]);
    }
    groupNodes.set(group.id, [...nodes]);
    groupResources.set(group.id, [...resources]);
  }

  const peerWords = (peer: SecurityRulePeer, ownGroupId: string) => {
    switch (peer.kind) {
      case 'group': {
        if (peer.groupId === ownGroupId) return 'its own members';
        const resources = groupResources.get(peer.groupId) ?? [];
        const name = names.get(peer.groupId) ?? peer.groupId;
        if (groupById.get(peer.groupId)?.kind === 'external') return `the ${name} group (rules not in this template)`;
        return resources.length > 0 ? listNames(resources) : `the ${name} group`;
      }
      case 'internet':
        return `the internet (${peer.cidr})`;
      case 'vpc':
        return peer.cidr ? `the whole VPC (${peer.cidr})` : 'the whole VPC';
      case 'cidr':
        return peer.cidr;
      case 'prefix-list':
        return `prefix list ${peer.prefixListId}`;
      default:
        return 'an address range set at deploy time';
    }
  };

  const rulesByGroup = new Map<string, SecurityGroupRule[]>();
  for (const rule of security.rules) rulesByGroup.set(rule.groupId, [...(rulesByGroup.get(rule.groupId) ?? []), rule]);

  /** Each rule set in plain words, one line per peer: "Allows TCP 80, 443 from the internet (0.0.0.0/0)". */
  const describeRules = (groupId: string, direction: 'ingress' | 'egress') => {
    const lines = new Map<string, SecurityGroupRule[]>();
    for (const rule of rulesByGroup.get(groupId) ?? []) {
      if (rule.direction !== direction) continue;
      const key = `${peerKey(rule.peer)}|${rule.conditions.join(',')}|${rule.origin.kind === 'default'}`;
      lines.set(key, [...(lines.get(key) ?? []), rule]);
    }
    return [...lines.values()].map((group) => {
      const [first] = group;
      if (first.origin.kind === 'default') return 'Allows all outbound traffic (the AWS default)';
      const traffic = describeTraffic(group);
      const preposition = direction === 'ingress' ? 'from' : 'to';
      return `Allows ${traffic} ${preposition} ${peerWords(first.peer, groupId)}${describeConditions(first.conditions)}`;
    });
  };

  // ── The panel's groups, and the groups whose rules decide each node's tag ──
  const nodeGroups = new Map<string, IsoNodeSecurityGroup[]>();
  const tagGroups = new Map<string, string[]>();
  for (const group of security.groups) {
    const entry = {
      id: group.id,
      name: names.get(group.id) ?? group.id,
      external: group.kind === 'external',
      inbound: describeRules(group.id, 'ingress'),
      outbound: describeRules(group.id, 'egress')
    };
    for (const nodeId of groupNodes.get(group.id) ?? []) {
      const kinds = memberKinds.get(`${group.id}|${nodeId}`) ?? new Set();
      const decides = [...kinds].some((kind) => !PASS_THROUGH_KINDS.has(kind));
      nodeGroups.set(nodeId, [...(nodeGroups.get(nodeId) ?? []), { ...entry, decides }]);
      if (decides) tagGroups.set(nodeId, [...(tagGroups.get(nodeId) ?? []), group.id]);
    }
  }

  const labelOf = (nodeId: string) => visible.get(nodeId)?.label ?? nodeId;
  const inboundOf = (nodeId: string, groupIds: readonly string[]): Inbound => {
    const inbound: Inbound = {
      internet: [],
      wholeVpc: false,
      ranges: [],
      resources: [],
      sources: [],
      throughOwnPart: false,
      self: false,
      unresolved: false,
      internetWhen: [],
      sourceWhen: new Map()
    };
    const ranges = new Set<string>();
    const resources = new Set<string>();
    const sources = new Set<string>();
    for (const groupId of groupIds) {
      const groupConditions = groupById.get(groupId)?.conditions ?? [];
      const carried = attachments.get(`${groupId}|${nodeId}`) ?? [];
      for (const rule of rulesByGroup.get(groupId) ?? []) {
        if (rule.direction !== 'ingress' || !opensConnections(rule)) continue;
        // The ways this node can carry the group while the rule exists.
        const applies = carried
          .map((conditions) => conditions.concat(groupConditions, rule.conditions))
          .filter((conditions) => canHoldTogether(conditions));
        if (applies.length === 0) continue;
        const { peer } = rule;
        switch (peer.kind) {
          case 'internet':
            inbound.internet.push(rule);
            inbound.internetWhen.push(...applies);
            break;
          case 'vpc':
            inbound.wholeVpc = true;
            break;
          case 'cidr':
            ranges.add(peer.cidr);
            break;
          case 'prefix-list':
            ranges.add(peer.prefixListId);
            break;
          case 'unresolved':
            inbound.unresolved = true;
            break;
          default: {
            const drawn = groupNodes.get(peer.groupId) ?? [];
            // A group with nothing drawn is named as a group; one drawn only as this node is the node itself.
            if (drawn.length === 0) {
              const name = names.get(peer.groupId) ?? peer.groupId;
              resources.add(groupById.get(peer.groupId)?.kind === 'external' ? name : name.replace(/ SG$/, ''));
            }
            if (drawn.includes(nodeId) && !groupIds.includes(peer.groupId)) inbound.throughOwnPart = true;
            const peerConditions = groupById.get(peer.groupId)?.conditions ?? [];
            for (const source of drawn) {
              if (source === nodeId) {
                if (groupIds.includes(peer.groupId)) inbound.self = true;
                continue;
              }
              const sourceCarries = (attachments.get(`${peer.groupId}|${source}`) ?? []).map((conditions) =>
                conditions.concat(peerConditions)
              );
              const when = holdingTogether(applies, sourceCarries);
              if (when.length === 0) continue;
              sources.add(source);
              resources.add(labelOf(source));
              inbound.sourceWhen.set(source, [...(inbound.sourceWhen.get(source) ?? []), ...when]);
            }
          }
        }
      }
    }
    inbound.ranges = [...ranges];
    inbound.resources = [...resources];
    inbound.sources = [...sources];
    return inbound;
  };

  const words = new Map<string, Omit<IsoNodeAccess, 'tile'>>();
  /** Nodes whose own groups decide who connects: with no rule in, nothing does, whatever the picture's connectors say. */
  const closed = new Set<string>();
  /** Among them, the nodes that listen for connections and that no rule lets anything reach. */
  const unreachable = new Set<string>();
  const inbounds = new Map<string, Inbound>();
  /** The conditions under which the internet reaches each public node. One empty entry: always. */
  const publicWhen = new Map<string, SecurityModelConditions[]>();
  for (const [nodeId, groupIds] of tagGroups) {
    const inbound = inboundOf(nodeId, groupIds);
    inbounds.set(nodeId, inbound);
    if (!inbound.throughOwnPart) closed.add(nodeId);
    const listens = groupIds.some((groupId) =>
      [...(memberKinds.get(`${groupId}|${nodeId}`) ?? [])].some((kind) => LISTENING_KINDS.has(kind))
    );
    // A group defined outside the stack may admit anyone: with one, "only" would be a guess.
    const outside = groupIds.some((groupId) => groupById.get(groupId)?.kind === 'external');
    if (inbound.internet.length > 0) {
      // The group the internet's rule is on decides: a service drawn with its database (Convex without the
      // Infrastructure layer) is public through its load balancer, and its database is still closed.
      const holdsData = inbound.internet.some((rule) =>
        [...(memberKinds.get(`${rule.groupId}|${nodeId}`) ?? [])].some((kind) => DATA_KINDS.has(kind))
      );
      words.set(nodeId, { ...describeInternet({ internet: inbound.internet, holdsData }), sources: inbound.sources });
      publicWhen.set(nodeId, inbound.internetWhen);
    } else if (outside || inbound.unresolved) {
      // Either may admit anyone, the internet included: "only" would be a guess, and so would a verdict that nothing
      // is open.
      words.set(nodeId, {
        reach: 'unknown',
        text: 'Access unknown',
        detail: outside
          ? 'It uses a security group defined outside this stack. Those rules are not in the deployed template, so this picture cannot tell who can connect.'
          : 'One of its rules takes its address range from a value set at deploy time. The deployed template does not hold that value, so this picture cannot tell who can connect.',
        sources: inbound.sources
      });
    } else if (inbound.wholeVpc || inbound.ranges.length > 0 || inbound.resources.length > 0) {
      words.set(nodeId, { reach: 'limited', ...describeLimited(inbound), sources: inbound.sources });
    } else if (listens && inbound.self) {
      words.set(nodeId, {
        reach: 'limited',
        text: 'Only itself',
        detail: 'Only its own tasks or nodes can connect to each other. Nothing else can connect to it.',
        sources: []
      });
    } else if (listens && !inbound.throughOwnPart) {
      unreachable.add(nodeId);
    }
  }
  // What the picture already shows the internet reaching where no security group decides it: an HTTP API, a CDN, a
  // function URL, or a service drawn with its gateway.
  for (const connector of scene.connectors) {
    if (connector.from !== 'user' || connector.semantic !== 'request') continue;
    if (closed.has(connector.to) || !visible.has(connector.to)) continue;
    // A service drawn with its gateway is as public as the gateway, whatever else its own group admits.
    const known = words.get(connector.to);
    if (known?.reach === 'exposed' || known?.reach === 'public') continue;
    words.set(connector.to, { ...PUBLIC, sources: known?.sources ?? [] });
    publicWhen.set(connector.to, [[]]);
  }
  // What a public gateway or load balancer forwards to is public too, through it. Three things must hold: the picture
  // draws the forwarder sending requests to the node (a rule that merely lets a gateway's group in forwards nothing),
  // the node's rules let the forwarder in, and that happens under conditions the forwarder is public under. Repeated,
  // because a gateway can forward to a load balancer that forwards to a service.
  const forwards = new Set(
    scene.connectors
      .filter((connector) => connector.semantic === 'request')
      .map((connector) => `${connector.from}|${connector.to}`)
  );
  for (let changed = true; changed;) {
    changed = false;
    for (const [nodeId, tag] of words) {
      if (tag.reach !== 'limited' && tag.reach !== 'unknown') continue;
      const when: SecurityModelConditions[] = [];
      const forwarders = tag.sources.flatMap((source) => {
        const type = FORWARDING_TYPES[visible.get(source)?.resourceType ?? ''];
        if (!type || !forwards.has(`${source}|${nodeId}`)) return [];
        const through = holdingTogether(
          publicWhen.get(source) ?? [],
          inbounds.get(nodeId)?.sourceWhen.get(source) ?? []
        );
        if (through.length === 0) return [];
        when.push(...through);
        return [{ label: labelOf(source), type }];
      });
      if (forwarders.length === 0) continue;
      words.set(nodeId, { ...describeForwarded(forwarders), sources: tag.sources });
      publicWhen.set(nodeId, when);
      changed = true;
    }
  }
  for (const nodeId of unreachable) {
    if (words.has(nodeId)) continue;
    words.set(nodeId, {
      reach: 'closed',
      text: 'No inbound access',
      detail: 'Nothing can connect to it. No security group rule lets a connection in.',
      sources: []
    });
  }

  // ── Where each tag sits: above its node, clear of other nodes, their names, badges and connector chips ──
  const others = createBoxIndex({ cellSize: 2 });
  const ownShapes = new Map<string, ProjectedBox[]>();
  for (const node of scene.nodes) {
    const { u, v } = projectTile(node.tile);
    const layoutNode = layoutNodes.get(node.id);
    const shapes = layoutNode ? nodeShapes(layoutNode).map((box) => shiftBox({ box, u, v })) : [];
    ownShapes.set(node.id, shapes);
    for (const shape of shapes) others.insert(shape);
    const badge = replicaBadgeBox(node);
    if (badge) others.insert(shiftBox({ box: badge, u, v }));
  }
  for (const connector of scene.connectors) {
    if (connector.label) others.insert(boxAround(projectTile(connector.route.labelTile), measureChip(connector.label)));
  }
  for (const label of scene.labels) others.insert(zoneLabelBox(label));

  const access = new Map<string, IsoNodeAccess>();
  for (const node of scene.nodes) {
    const tag = words.get(node.id);
    if (!tag) continue;
    const size = {
      halfWidth: getAccessTagWidthPx(tag.text) / 2 / U_PX,
      halfHeight: ACCESS_TAG_HEIGHT_PX / 2 / V_PX
    };
    const { u, v } = projectTile(node.tile);
    const home = { u, v: v + (SHAPE_HEIGHT_PX[node.shape] + ACCESS_TAG_RISE_PX) / V_PX };
    const own = ownShapes.get(node.id) ?? [];
    // Straight above the node first; where a neighbour is in the way, slid along the node's top or lifted a row; and
    // where nothing above is free, under the node's name. Never farther, so a tag is never read as a neighbour's.
    const slide = Math.max(0, size.halfWidth - BODY_HALF_WIDTH);
    const layoutNode = layoutNodes.get(node.id);
    const rows = [
      { v: home.v, cost: 0 },
      { v: home.v + 2 * size.halfHeight + 0.1, cost: 0.5 },
      ...(layoutNode
        ? [
            {
              v: v - (layoutNode.width + layoutNode.depth) / 2 - layoutNode.tag.height - size.halfHeight - 0.1,
              cost: 0.8
            }
          ]
        : [])
    ];
    let best: { u: number; v: number; cost: number } | undefined;
    for (const row of rows) {
      for (const shift of [0, -0.5, 0.5, -1, 1]) {
        const candidate = { u: home.u + shift * slide, v: row.v };
        const box = boxAround(candidate, size);
        const crowding =
          others.overlapArea(box) - own.reduce((sum, shape) => sum + boxOverlapArea({ a: box, b: shape }), 0);
        const cost = Math.max(0, crowding) * 1000 + Math.abs(shift) * 0.2 + row.cost;
        if (!best || cost < best.cost - EPSILON) best = { ...candidate, cost };
      }
    }
    const spot = best as NonNullable<typeof best>;
    others.insert(boxAround(spot, size));
    const tile = toTile(spot);
    access.set(node.id, { ...tag, tile: { x: round(tile.x), y: round(tile.y) } });
  }

  // A node without a tag still gets an answer in its tooltip and panel: why the layer has nothing to say about it.
  const untaggedNote = (node: IsoNode) => {
    if (access.has(node.id) || node.accessNote || node.resourceType === 'user') return undefined;
    if (!nodeGroups.has(node.id)) return AWS_PERMISSION_TYPES.has(node.resourceType ?? '') ? NO_GROUP_NOTE : undefined;
    const startedByAws = (tagGroups.get(node.id) ?? []).some((groupId) =>
      [...(memberKinds.get(`${groupId}|${node.id}`) ?? [])].some((kind) => STARTED_BY_AWS_KINDS.has(kind))
    );
    return startedByAws ? STARTED_BY_AWS_NOTE : undefined;
  };

  return {
    ...scene,
    nodes: scene.nodes.map((node) => {
      const note = untaggedNote(node);
      return nodeGroups.has(node.id) || access.has(node.id) || note
        ? Object.assign({}, node, {
            securityGroups: nodeGroups.get(node.id),
            access: access.get(node.id),
            untaggedNote: note
          })
        : node;
    })
  };
};

/**
 * A zone's name, which runs along one of its edges: from its start `axis` tiles towards -y or +x, about 0.62 of its
 * font size a character.
 */
const zoneLabelBox = (label: IsoLabel): ProjectedBox => {
  const tiles = (label.text.length * (label.fontSize ?? 12) * 0.62) / Math.hypot(U_PX, V_PX);
  const start = projectTile(label.tile);
  const end = { u: start.u + tiles, v: start.v + (label.axis === 'y' ? -tiles : tiles) };
  return {
    u0: Math.min(start.u, end.u),
    u1: Math.max(start.u, end.u),
    v0: Math.min(start.v, end.v) - 0.4,
    v1: Math.max(start.v, end.v) + 0.4
  };
};

/** The replica or count badge beside a node's top, relative to the node, which a tag must not cover. */
const replicaBadgeBox = (node: IsoNode): ProjectedBox | undefined => {
  const text = getReplicaBadgeText(node);
  if (!text) return undefined;
  return boxAround(
    { u: REPLICA_BADGE_SHIFT_PX / U_PX, v: (SHAPE_HEIGHT_PX[node.shape] + BADGE_OFFSET_PX) / V_PX },
    { halfWidth: (text.length * 6 + 10) / 2 / U_PX, halfHeight: BADGE_HEIGHT_PX / 2 / V_PX }
  );
};
