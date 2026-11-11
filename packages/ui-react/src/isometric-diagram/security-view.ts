/**
 * The Access layer: who the deployed stage lets connect to each resource, as one tag above it, and each node's security
 * groups in plain words for the side panel.
 *
 * Everything comes from the deployed stage's template (`security-groups.ts`), never from the config. The picture is
 * the one the layout already placed and nothing in it changes: the layer only adds tags. A tag answers one question,
 * "who can connect to this?", in resource terms: the internet, the VPC, named resources, address ranges. Security
 * groups, ports and protocols are how AWS enforces the answer, so they stay in the side panel. Red is kept for what a
 * reader must not miss: a data store or an admin port the internet can reach.
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

const describeInternet = ({ internet, holdsData }: { internet: SecurityGroupRule[]; holdsData: boolean }) => {
  if (holdsData) return { reach: 'exposed' as const, text: 'Open to the internet' };
  if (internet.some(coversAllPorts)) return { reach: 'exposed' as const, text: 'All ports open to the internet' };
  const admin = ADMIN_PORTS.find(({ port }) => internet.some((rule) => coversPort(rule, port)));
  if (admin) return { reach: 'exposed' as const, text: `${admin.name} open to the internet` };
  return { reach: 'public' as const, text: 'Public' };
};

const countRanges = (ranges: readonly string[]) =>
  ranges.every(singleAddress)
    ? `${ranges.length} IP address${ranges.length === 1 ? '' : 'es'}`
    : plural(ranges.length, 'IP range');

const joinSources = (parts: Array<string | undefined>) => parts.filter(Boolean).join(' + ');

const describeLimited = ({ wholeVpc, ranges, resources }: Inbound) => {
  const countedRanges = ranges.length === 0 ? undefined : countRanges(ranges);
  const rangeText = ranges.length === 1 ? (singleAddress(ranges[0]) ?? countedRanges) : countedRanges;
  // Whatever else is allowed in, the VPC already holds it; only addresses outside it are worth adding.
  if (wholeVpc) return joinSources(['Anything in the VPC', rangeText]);
  const countedResources = resources.length === 0 ? undefined : plural(resources.length, 'resource');
  const named = resources.length <= MAX_NAMED_RESOURCES ? resources.join(', ') || undefined : countedResources;
  const text = `Only ${joinSources([named, rangeText])}`;
  return text.length <= TAG_MAX_CHARS ? text : `Only ${joinSources([countedResources, countedRanges])}`;
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
    const entry: IsoNodeSecurityGroup = {
      id: group.id,
      name: names.get(group.id) ?? group.id,
      external: group.kind === 'external',
      inbound: describeRules(group.id, 'ingress'),
      outbound: describeRules(group.id, 'egress')
    };
    for (const nodeId of groupNodes.get(group.id) ?? []) {
      nodeGroups.set(nodeId, [...(nodeGroups.get(nodeId) ?? []), entry]);
      const kinds = memberKinds.get(`${group.id}|${nodeId}`) ?? new Set();
      if ([...kinds].some((kind) => !PASS_THROUGH_KINDS.has(kind))) {
        tagGroups.set(nodeId, [...(tagGroups.get(nodeId) ?? []), group.id]);
      }
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
      throughOwnPart: false
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
            ranges.add(`unresolved:${peer.reference}`);
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
              if (source === nodeId) continue;
              const carries = (attachments.get(`${peer.groupId}|${source}`) ?? []).some((conditions) =>
                applies.some((own) => canHoldTogether(own, conditions, peerConditions))
              );
              if (!carries) continue;
              sources.add(source);
              resources.add(labelOf(source));
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
  for (const [nodeId, groupIds] of tagGroups) {
    const inbound = inboundOf(nodeId, groupIds);
    if (!inbound.throughOwnPart) closed.add(nodeId);
    // A group defined outside the stack may admit anyone: with one, "only" would be a guess.
    const outside = groupIds.some((groupId) => groupById.get(groupId)?.kind === 'external');
    if (inbound.internet.length > 0) {
      // The group the internet's rule is on decides: a service drawn with its database (Convex without the
      // Infrastructure layer) is public through its load balancer, and its database is still closed.
      const holdsData = inbound.internet.some((rule) =>
        [...(memberKinds.get(`${rule.groupId}|${nodeId}`) ?? [])].some((kind) => DATA_KINDS.has(kind))
      );
      words.set(nodeId, { ...describeInternet({ internet: inbound.internet, holdsData }), sources: inbound.sources });
    } else if (outside) {
      words.set(nodeId, { reach: 'unknown', text: 'Rules outside this stack', sources: inbound.sources });
    } else if (inbound.wholeVpc || inbound.ranges.length > 0 || inbound.resources.length > 0) {
      words.set(nodeId, { reach: 'limited', text: describeLimited(inbound), sources: inbound.sources });
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
    words.set(connector.to, { reach: 'public', text: 'Public', sources: known?.sources ?? [] });
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

  return {
    ...scene,
    nodes: scene.nodes.map((node) =>
      nodeGroups.has(node.id) || access.has(node.id)
        ? Object.assign({}, node, { securityGroups: nodeGroups.get(node.id), access: access.get(node.id) })
        : node
    )
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
