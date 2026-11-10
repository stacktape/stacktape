/**
 * The Access layer's drawing: security groups as outlines around their members, the traffic their rules allow as
 * port-labelled arrows, and what each node's groups allow in plain words for the side panel.
 *
 * Everything comes from the deployed stage's template (`security-groups.ts`), never from the config. The picture is
 * the one the layout already placed: outlines hug the members where they are. Arrows go from group to group, one per
 * pair of groups, leaving the source group's outline; one follows a connector between their members when there is one.
 * An address range (the internet, the VPC, a CIDR) gets a short arrow into the group, one per address so a label never
 * lends one address another's ports, red for the internet. Text goes where no node, name tag, chip or other line is.
 *
 * The work is bounded by groups and rules, not by members: a group of 150 functions is one outline cluster or a few,
 * and its rule one arrow.
 */
import type { LayoutNode } from './layout/diagram-layout.js';
import type { ProjectedBox } from './layout/projected-box.js';
import type {
  IsoConnector,
  IsoNodeSecurityGroup,
  IsoScene,
  IsoSecurityGroup,
  IsoSecurityRule,
  IsoTilePoint
} from './scene.js';
import type {
  SecurityGroup,
  SecurityGroupMember,
  SecurityGroupModel,
  SecurityGroupRule,
  SecurityModelConditions,
  SecurityRulePeer
} from './security-groups.js';
import type { DiagramTopology } from './topology.js';
import { BODY_SHAPES, nodeShapes, simplifyRoute } from './layout/diagram-layout.js';
import { createBoxIndex, projectTile, shiftBox } from './layout/projected-box.js';

/** Group colours, in template order. Red and amber are kept for address ranges. */
const PALETTE = ['#5B9CFF', '#B57BFF', '#3CC7A4', '#F072B6', '#7CCB5A', '#4FC4E6', '#9C8CFF', '#C3D65A'];
export const EXTERNAL_GROUP_COLOR = '#8E9AAB';
export const INTERNET_COLOR = '#F0545A';
export const ADDRESS_COLOR = '#E8B03A';

/** Half a node's footprint, in tiles. */
const HALF_FOOTPRINT = 0.66;
/** Gap between a footprint and its innermost outline, and between nested outlines. */
const OUTLINE_PAD = 0.2;
const OUTLINE_STEP = 0.16;
const MAX_OUTLINE_LEVEL = 3;
/** How far a node outside a group must stay from that group's outline. */
const OUTLINE_CLEARANCE = 0.25;
/** Members share an outline only when they are this close: neighbours in a column or across one gutter. */
const MAX_MERGE_GAP = 2.6;
/** An address range's arrow starts this far outside its group's outline. */
const STUB_OUT = 1.5;
/** Address ranges drawn into one group before the rest share one arrow, which the panel and tooltip spell out. */
const MAX_ADDRESS_ARROWS_PER_GROUP = 3;
/** Arrows between groups drawn at most; beyond it the tooltips and the panel still list every rule. */
const MAX_GROUP_ARROWS = 120;
/** A group with many separate outlines names only its largest few. */
const MAX_TABS_PER_GROUP = 3;
/** A new route's tracks in a gutter sit this far apart. */
const TRACK_STEP = 0.3;
/** A tab's text: 10 px semibold, 6.2 px a character, 14 px of padding, 16 px tall. Projected units are 40 × 20 px. */
const TAB_CHAR_PX = 6.2;
const TAB_PADDING_PX = 14;
const TAB_HEIGHT_PX = 16;
const TAB_MAX_CHARS = 32;
const U_PX = 40;
const V_PX = 20;
const EPSILON = 1e-6;

export type SecurityLayerInput = {
  scene: IsoScene;
  /** The node each node of the full picture is drawn as in this view, or null when the view drops it. */
  resolve: (nodeId: string) => string | null;
  /** The topology before grouping: the node IDs group members map to. */
  base: DiagramTopology;
  /** The group node a collapsed member is drawn as. */
  collapsedInto: ReadonlyMap<string, string>;
  layoutNodes: ReadonlyMap<string, LayoutNode>;
  columnXs: readonly number[];
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

const UNDRAWN_MEMBER_NAMES: Partial<Record<SecurityGroupMember['kind'], string>> = {
  'vpc-endpoint': 'VPC endpoint',
  'batch-compute-environment': 'Batch compute environment',
  'network-interface': 'network interface',
  'efs-mount-target': 'EFS mount target'
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

/** An arrow's label: the traffic, with what only some conditions allow said apart ("TCP 443 · TCP 80 if Prod"). */
const trafficLabel = (rules: readonly SecurityGroupRule[]) => {
  const byConditions = new Map<string, SecurityGroupRule[]>();
  for (const rule of rules) {
    const key = rule.conditions.join(' and ');
    byConditions.set(key, [...(byConditions.get(key) ?? []), rule]);
  }
  return [...byConditions]
    .sort(([a], [b]) => Number(a !== '') - Number(b !== '') || a.localeCompare(b))
    .map(
      ([conditions, group]) =>
        `${describeTraffic(group)}${conditions ? ` if ${conditions.replaceAll('!', 'not ')}` : ''}`
    )
    .join(' · ');
};

const listNames = (names: readonly string[]) =>
  names.length <= 4 ? names.join(', ') : `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;

/** The short form of an address range for an arrow's label: "0.0.0.0/0", "VPC", "203.0.113.10/32". */
const addressText = (peer: SecurityRulePeer) => {
  switch (peer.kind) {
    case 'internet':
    case 'cidr':
      return peer.cidr;
    case 'vpc':
      return 'whole VPC';
    case 'prefix-list':
      return peer.prefixListId;
    case 'unresolved':
      return 'deploy-time range';
    default:
      return '';
  }
};

// ── Geometry helpers ──

type Rect = { x0: number; x1: number; y0: number; y1: number };

const footprint = (tile: IsoTilePoint, extra = 0): Rect => ({
  x0: tile.x - HALF_FOOTPRINT - extra,
  x1: tile.x + HALF_FOOTPRINT + extra,
  y0: tile.y - HALF_FOOTPRINT - extra,
  y1: tile.y + HALF_FOOTPRINT + extra
});

const unionRect = (a: Rect, b: Rect): Rect => ({
  x0: Math.min(a.x0, b.x0),
  x1: Math.max(a.x1, b.x1),
  y0: Math.min(a.y0, b.y0),
  y1: Math.max(a.y1, b.y1)
});

const intersects = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

const rectGap = (a: Rect, b: Rect) =>
  Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1)) + Math.max(0, Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1));

const round = (value: number) => Math.round(value * 1000) / 1000;

const peerKey = (peer: SecurityRulePeer) => JSON.stringify(peer);

/**
 * A rule source as part of an arrow's ID. Every arrow's ID names its source and target, so two arrows never share one
 * (IPv4 and IPv6 internet rules into one load balancer) and an arrow whose rule disappears leaves with it.
 */
const peerIdOf = (peer: SecurityRulePeer) => {
  switch (peer.kind) {
    case 'group':
      return `group:${peer.groupId}`;
    case 'internet':
    case 'cidr':
      return `${peer.kind}:${peer.cidr}`;
    case 'vpc':
      return `vpc:${peer.cidr ?? ''}`;
    case 'prefix-list':
      return `prefix-list:${peer.prefixListId}`;
    default:
      return `unresolved:${peer.reference}`;
  }
};

const boxAround = ({ u, v }: { u: number; v: number }, size: { halfWidth: number; halfHeight: number }) => ({
  u0: u - size.halfWidth,
  u1: u + size.halfWidth,
  v0: v - size.halfHeight,
  v1: v + size.halfHeight
});

/** Projected position back to tile space. */
const toTile = ({ u, v }: { u: number; v: number }): IsoTilePoint => ({ x: (u + v) / 2, y: (v - u) / 2 });

const projectedAt = (x: number, y: number) => projectTile({ x, y });

type Cluster = { groupIndex: number; groupId: string; nodes: string[]; rect: Rect; level: number; outline: Rect };

/** Whether one cluster of an outline holds every member of another. */
const contains = (outer: Cluster, inner: Cluster) => inner.nodes.every((node) => outer.nodes.includes(node));

const inside = (point: IsoTilePoint, rect: Rect) =>
  point.x > rect.x0 + EPSILON &&
  point.x < rect.x1 - EPSILON &&
  point.y > rect.y0 + EPSILON &&
  point.y < rect.y1 - EPSILON;

/** A route from inside a rectangle, starting where it leaves it: an arrow from a group starts at its outline. */
const leaveRect = (points: IsoTilePoint[], rect: Rect): IsoTilePoint[] => {
  if (points.length < 2 || !inside(points[0], rect) || inside(points[points.length - 1], rect)) return points;
  for (let index = 0; index + 1 < points.length; index++) {
    const start = points[index];
    const end = points[index + 1];
    if (inside(end, rect)) continue;
    const exits = [
      end.x > rect.x1 ? (rect.x1 - start.x) / (end.x - start.x) : Number.POSITIVE_INFINITY,
      end.x < rect.x0 ? (rect.x0 - start.x) / (end.x - start.x) : Number.POSITIVE_INFINITY,
      end.y > rect.y1 ? (rect.y1 - start.y) / (end.y - start.y) : Number.POSITIVE_INFINITY,
      end.y < rect.y0 ? (rect.y0 - start.y) / (end.y - start.y) : Number.POSITIVE_INFINITY
    ];
    const t = Math.max(0, Math.min(1, ...exits));
    return [{ x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t }, ...points.slice(index + 1)];
  }
  return points;
};

/** A uniform grid of points, to find the nodes near a rectangle without scanning them all. */
const createPointGrid = <Item extends { tile: IsoTilePoint }>(items: readonly Item[], cellSize = 2) => {
  const cells = new Map<string, Item[]>();
  for (const item of items) {
    const key = `${Math.floor(item.tile.x / cellSize)},${Math.floor(item.tile.y / cellSize)}`;
    const cell = cells.get(key) ?? [];
    cell.push(item);
    cells.set(key, cell);
  }
  /** Items whose footprint may meet the rectangle. */
  return (rect: Rect): Item[] => {
    const found: Item[] = [];
    for (
      let x = Math.floor((rect.x0 - HALF_FOOTPRINT) / cellSize);
      x <= Math.floor((rect.x1 + HALF_FOOTPRINT) / cellSize);
      x++
    ) {
      for (
        let y = Math.floor((rect.y0 - HALF_FOOTPRINT) / cellSize);
        y <= Math.floor((rect.y1 + HALF_FOOTPRINT) / cellSize);
        y++
      ) {
        found.push(...(cells.get(`${x},${y}`) ?? []));
      }
    }
    return found;
  };
};
const roundPoint = (point: IsoTilePoint) => ({ x: round(point.x), y: round(point.y) });

// ── The layer ──

/** Traffic from one group's members into another's: one arrow, however many members either has. */
type GroupArrow = { sourceGroupId: string; targetGroupId: string; rules: SecurityGroupRule[] };

/** Traffic from one address range, or from a group with nothing drawn, into a group. */
type AddressArrow = {
  targetGroupId: string;
  /** The source, stable across template updates, for the arrow's ID: "internet:::/0", "cidr:203.0.113.10/32". */
  peerId: string;
  source: 'internet' | 'address';
  /** How the label names the source: "0.0.0.0/0", "whole VPC", "Kafka endpoints SG". */
  peerText: string;
  rules: SecurityGroupRule[];
};

type PendingRule = Omit<IsoSecurityRule, 'route'> & { points: IsoTilePoint[]; preferred: IsoTilePoint | undefined };

export const addSecurityLayer = ({
  scene,
  resolve,
  base,
  collapsedInto,
  layoutNodes,
  columnXs,
  security,
  measureChip
}: SecurityLayerInput): IsoScene => {
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
  const undrawn = new Map<string, string[]>();
  for (const group of security.groups) {
    const nodes = new Set<string>();
    const resources = new Set<string>();
    const missing = new Set<string>();
    for (const member of group.members) {
      const baseId = memberBase.get(member);
      const drawn = baseId ? drawnOf(baseId) : null;
      if (baseId) resources.add(baseLabels.get(baseId) ?? baseId);
      if (drawn && visible.has(drawn)) {
        nodes.add(drawn);
        const kinds = memberKinds.get(`${group.id}|${drawn}`) ?? new Set();
        kinds.add(member.kind);
        memberKinds.set(`${group.id}|${drawn}`, kinds);
      } else if (!baseId) {
        const name = UNDRAWN_MEMBER_NAMES[member.kind] ?? member.kind;
        missing.add(member.owner ? `${member.owner.name} ${name}` : name);
      }
    }
    groupNodes.set(group.id, [...nodes]);
    groupResources.set(group.id, [...resources]);
    undrawn.set(group.id, [...missing]);
  }
  const colorOf = new Map<string, string>();
  let paletteIndex = 0;
  for (const group of security.groups) {
    if (group.kind === 'external' || (groupNodes.get(group.id) ?? []).length === 0) {
      colorOf.set(group.id, EXTERNAL_GROUP_COLOR);
    } else colorOf.set(group.id, PALETTE[paletteIndex++ % PALETTE.length]);
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

  const nodeGroups = new Map<string, IsoNodeSecurityGroup[]>();
  const inboundOf = new Map<string, string[]>();
  const outboundOf = new Map<string, string[]>();
  for (const group of security.groups) {
    inboundOf.set(group.id, describeRules(group.id, 'ingress'));
    outboundOf.set(group.id, describeRules(group.id, 'egress'));
    const entry: IsoNodeSecurityGroup = {
      id: group.id,
      name: names.get(group.id) ?? group.id,
      color: colorOf.get(group.id) as string,
      external: group.kind === 'external',
      inbound: inboundOf.get(group.id) as string[],
      outbound: outboundOf.get(group.id) as string[]
    };
    for (const nodeId of groupNodes.get(group.id) ?? []) {
      nodeGroups.set(nodeId, [...(nodeGroups.get(nodeId) ?? []), entry]);
    }
  }

  // ── Outlines ──
  const nodesNear = createPointGrid(scene.nodes);
  const clusters: Cluster[] = [];
  const clearance = OUTLINE_PAD + OUTLINE_STEP * MAX_OUTLINE_LEVEL + OUTLINE_CLEARANCE;
  security.groups.forEach((group, groupIndex) => {
    const members = groupNodes.get(group.id) ?? [];
    if (members.length === 0) return;
    const memberSet = new Set(members);
    const tiles = members.map((nodeId) => visible.get(nodeId)?.tile as IsoTilePoint);
    // Members drawn next to each other, with no other node between them, share one outline. Neighbours are found on a
    // grid and merged closest first, so a group of hundreds stays cheap.
    const parent = members.map((_, index) => index);
    const find = (index: number): number => {
      let root = index;
      while (parent[root] !== root) root = parent[root];
      parent[index] = root;
      return root;
    };
    const rects = tiles.map((tile) => footprint(tile));
    const membersNear = createPointGrid(
      tiles.map((tile, index) => ({ index, tile })),
      MAX_MERGE_GAP + 2 * HALF_FOOTPRINT
    );
    const pairs: Array<{ a: number; b: number; gap: number }> = [];
    members.forEach((_, a) => {
      for (const { index: b } of membersNear(footprint(tiles[a], MAX_MERGE_GAP))) {
        if (b <= a) continue;
        const gap = rectGap(rects[a], rects[b]);
        if (gap <= MAX_MERGE_GAP) pairs.push({ a, b, gap });
      }
    });
    pairs.sort((p, q) => p.gap - q.gap || p.a - q.a || p.b - q.b);
    for (const { a, b } of pairs) {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA === rootB) continue;
      const rect = unionRect(rects[rootA], rects[rootB]);
      const padded = {
        x0: rect.x0 - clearance,
        x1: rect.x1 + clearance,
        y0: rect.y0 - clearance,
        y1: rect.y1 + clearance
      };
      if (nodesNear(padded).some((node) => !memberSet.has(node.id) && intersects(padded, footprint(node.tile))))
        continue;
      parent[rootB] = rootA;
      rects[rootA] = rect;
    }
    const byRoot = new Map<number, string[]>();
    members.forEach((nodeId, index) => {
      const root = find(index);
      byRoot.set(root, [...(byRoot.get(root) ?? []), nodeId]);
    });
    for (const [root, nodes] of byRoot) {
      clusters.push({ groupIndex, groupId: group.id, nodes, rect: rects[root], level: 0, outline: rects[root] });
    }
  });
  // Nested outlines: an outline inside another is drawn closer to its members; outlines that only share some members
  // are drawn at different distances so their lines never coincide.
  const ordered = [...clusters].sort((a, b) => a.nodes.length - b.nodes.length || b.groupIndex - a.groupIndex);
  const clustersOn = new Map<string, Cluster[]>();
  for (const cluster of ordered) {
    const sharing = new Set(cluster.nodes.flatMap((node) => clustersOn.get(node) ?? []));
    let level = 0;
    while (
      level < MAX_OUTLINE_LEVEL &&
      [...sharing].some((other) => (contains(cluster, other) ? other.level >= level : other.level === level))
    ) {
      level += 1;
    }
    cluster.level = level;
    const pad = OUTLINE_PAD + OUTLINE_STEP * level;
    cluster.outline = {
      x0: cluster.rect.x0 - pad,
      x1: cluster.rect.x1 + pad,
      y0: cluster.rect.y0 - pad,
      y1: cluster.rect.y1 + pad
    };
    for (const node of cluster.nodes) clustersOn.set(node, [...(clustersOn.get(node) ?? []), cluster]);
  }
  const clusterOf = (groupId: string, nodeId: string) =>
    (clustersOn.get(nodeId) ?? []).find((cluster) => cluster.groupId === groupId);
  /** A group's largest outline, where its address arrows arrive. */
  const mainCluster = (groupId: string) =>
    clusters.filter((cluster) => cluster.groupId === groupId).sort((a, b) => b.nodes.length - a.nodes.length)[0];

  // ── Which arrows ──
  const groupArrows = new Map<string, GroupArrow>();
  const addressArrows = new Map<string, AddressArrow>();
  for (const rule of security.rules) {
    if (rule.direction !== 'ingress' || (groupNodes.get(rule.groupId) ?? []).length === 0) continue;
    const { peer } = rule;
    if (peer.kind === 'group' && peer.groupId === rule.groupId) continue;
    if (peer.kind === 'group' && (groupNodes.get(peer.groupId) ?? []).length > 0) {
      const key = `${peer.groupId}->${rule.groupId}`;
      const arrow = groupArrows.get(key) ?? { sourceGroupId: peer.groupId, targetGroupId: rule.groupId, rules: [] };
      arrow.rules.push(rule);
      groupArrows.set(key, arrow);
      continue;
    }
    // One arrow per address: merging addresses would lend each the other's ports.
    const key = `${rule.groupId}|${peerKey(peer)}`;
    const arrow = addressArrows.get(key) ?? {
      targetGroupId: rule.groupId,
      peerId: peerIdOf(peer),
      source: peer.kind === 'internet' ? 'internet' : 'address',
      peerText: peer.kind === 'group' ? (names.get(peer.groupId) ?? peer.groupId) : addressText(peer),
      rules: []
    };
    arrow.rules.push(rule);
    addressArrows.set(key, arrow);
  }

  const connectorFrom = new Map<string, IsoConnector>();
  for (const connector of scene.connectors) {
    const key = `${connector.from}->${connector.to}`;
    if (!connectorFrom.has(key)) connectorFrom.set(key, connector);
  }
  const connectorBetween = (a: string, b: string): { connector: IsoConnector; reversed: boolean } | undefined => {
    const forward = connectorFrom.get(`${a}->${b}`);
    if (forward) return { connector: forward, reversed: false };
    const backward = connectorFrom.get(`${b}->${a}`);
    return backward ? { connector: backward, reversed: true } : undefined;
  };

  /**
   * The two members a group arrow joins: the first pair with a connector of its own, whose route it follows, or else the
   * closest pair.
   */
  const endpointsOf = (arrow: GroupArrow) => {
    const sources = new Set(groupNodes.get(arrow.sourceGroupId));
    const targets = new Set(groupNodes.get(arrow.targetGroupId));
    for (const connector of scene.connectors) {
      if (connector.from === connector.to) continue;
      if (sources.has(connector.from) && targets.has(connector.to)) return { from: connector.from, to: connector.to };
      if (sources.has(connector.to) && targets.has(connector.from)) return { from: connector.to, to: connector.from };
    }
    let best: { from: string; to: string; distance: number } | undefined;
    for (const from of sources) {
      const a = visible.get(from)?.tile as IsoTilePoint;
      for (const to of targets) {
        if (from === to) continue;
        const b = visible.get(to)?.tile as IsoTilePoint;
        const distance = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        if (!best || distance < best.distance - EPSILON) best = { from, to, distance };
      }
    }
    return best;
  };

  const sortedGroupArrows = [...groupArrows.values()]
    .sort((p, q) => `${p.sourceGroupId}->${p.targetGroupId}`.localeCompare(`${q.sourceGroupId}->${q.targetGroupId}`))
    .flatMap((arrow) => {
      const ends = endpointsOf(arrow);
      return ends ? [{ ...arrow, ...ends }] : [];
    });
  const drawnGroupArrows = sortedGroupArrows.slice(0, MAX_GROUP_ARROWS);
  const omittedTargets = new Set(sortedGroupArrows.slice(MAX_GROUP_ARROWS).map((arrow) => arrow.targetGroupId));

  /** The load balancer of a group that the user's connector reaches: the internet's rules follow that connector. */
  const userEntry = (groupId: string) =>
    visible.has('user')
      ? (groupNodes.get(groupId) ?? []).find(
          (nodeId) => memberKinds.get(`${groupId}|${nodeId}`)?.has('load-balancer') && connectorBetween('user', nodeId)
        )
      : undefined;

  // Address arrows per group: the internet first, then the rest; past the budget, one arrow says how many more.
  const addressByGroup = new Map<string, AddressArrow[]>();
  for (const arrow of addressArrows.values()) {
    addressByGroup.set(arrow.targetGroupId, [...(addressByGroup.get(arrow.targetGroupId) ?? []), arrow]);
  }

  // An arrow between two nodes that already have a connector follows it and takes its place.
  const replaced = new Set<string>();
  for (const arrow of drawnGroupArrows) {
    const existing = connectorBetween(arrow.from, arrow.to);
    if (existing) replaced.add(existing.connector.id);
  }
  for (const groupId of addressByGroup.keys()) {
    const entry = userEntry(groupId);
    if (entry && [...(addressByGroup.get(groupId) ?? [])].some((arrow) => arrow.source === 'internet')) {
      replaced.add((connectorBetween('user', entry) as { connector: IsoConnector }).connector.id);
    }
  }

  // ── Occupancy: what text must stay clear of ──
  const bodies = createBoxIndex({ cellSize: 2 });
  const texts = createBoxIndex({ cellSize: 2 });
  for (const node of scene.nodes) {
    const layoutNode = layoutNodes.get(node.id);
    if (!layoutNode) continue;
    const { u, v } = projectTile(node.tile);
    nodeShapes(layoutNode).forEach((shape, index) =>
      (index < BODY_SHAPES ? bodies : texts).insert(shiftBox({ box: shape, u, v }))
    );
  }
  const chipBox = (text: string, tile: IsoTilePoint): ProjectedBox => boxAround(projectTile(tile), measureChip(text));
  for (const connector of scene.connectors) {
    if (connector.label && !replaced.has(connector.id))
      texts.insert(chipBox(connector.label, connector.route.labelTile));
  }
  const occupied = (box: ProjectedBox) => bodies.overlapArea(box) * 100 + texts.overlapArea(box) * 100;

  // Where every line runs, so a chip never sits on someone else's line and seems to label it.
  const lineCells = new Map<string, Array<{ u: number; v: number; owner: string }>>();
  const addLine = (owner: string, points: IsoTilePoint[]) => {
    for (let index = 0; index + 1 < points.length; index++) {
      const start = points[index];
      const end = points[index + 1];
      const steps = Math.max(1, Math.ceil((Math.abs(end.x - start.x) + Math.abs(end.y - start.y)) / 0.2));
      for (let step = 0; step <= steps; step++) {
        const { u, v } = projectTile({
          x: start.x + ((end.x - start.x) * step) / steps,
          y: start.y + ((end.y - start.y) * step) / steps
        });
        const key = `${Math.floor(u)},${Math.floor(v)}`;
        const cell = lineCells.get(key) ?? [];
        cell.push({ u, v, owner });
        lineCells.set(key, cell);
      }
    }
  };
  /** How many samples of other lines a box covers. */
  const otherLines = (box: ProjectedBox, owner: string) => {
    let count = 0;
    for (let u = Math.floor(box.u0); u <= Math.floor(box.u1); u++) {
      for (let v = Math.floor(box.v0); v <= Math.floor(box.v1); v++) {
        for (const point of lineCells.get(`${u},${v}`) ?? []) {
          if (
            point.owner !== owner &&
            point.u >= box.u0 &&
            point.u <= box.u1 &&
            point.v >= box.v0 &&
            point.v <= box.v1
          ) {
            count += 1;
          }
        }
      }
    }
    return count;
  };
  for (const connector of scene.connectors) {
    if (!replaced.has(connector.id)) addLine(connector.id, connector.route.points);
  }

  /**
   * Where a chip on this route is clearest: on the line, nearest its start (or the spot the connector's own chip had),
   * or, where the line has no room, just beside it. Never on another line, which it would seem to label, and never on
   * the ends inside the nodes' outlines.
   */
  const placeChip = (owner: string, points: IsoTilePoint[], text: string, preferred?: IsoTilePoint): IsoTilePoint => {
    const size = measureChip(text);
    const crowding = (box: ProjectedBox) => occupied(box) * 1000 + otherLines(box, owner) * 40;
    let best: { tile: IsoTilePoint; cost: number } | undefined =
      preferred && crowding(chipBox(text, preferred)) < EPSILON ? { tile: preferred, cost: 0 } : undefined;
    // On the line first; where it has no room, as close beside it as a free spot allows.
    const step = 2.1 * size.halfHeight;
    const shifts: Array<{ u: number; v: number }> = [];
    for (let row = -2; row <= 2; row++) {
      for (let column = -2; column <= 2; column++) shifts.push({ u: column * size.halfWidth * 0.4, v: row * step });
    }
    shifts.sort((a, b) => Math.hypot(a.u * 2, a.v) - Math.hypot(b.u * 2, b.v));
    let travelled = 0;
    const total = points.slice(1).reduce((sum, point, index) => {
      const previous = points[index];
      return sum + Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y);
    }, 0);
    // A short route still gets candidates: its middle, at least.
    const margin = Math.min(1, total / 3);
    search: for (let index = 0; index + 1 < points.length; index++) {
      const start = points[index];
      const end = points[index + 1];
      const length = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
      const samples = Math.min(24, Math.max(1, Math.round(length / 0.25)));
      for (let sample = 0; sample < samples; sample++) {
        const fraction = (sample + 0.5) / samples;
        const distance = travelled + length * fraction;
        if (distance < margin || distance > total - margin) continue;
        // Candidates come in order of distance, which is part of the cost: nothing later beats a free spot found now.
        if (best && best.cost <= distance * 0.05 + EPSILON) break search;
        const onLine = projectTile({
          x: start.x + (end.x - start.x) * fraction,
          y: start.y + (end.y - start.y) * fraction
        });
        for (const shift of shifts) {
          const center = { u: onLine.u + shift.u, v: onLine.v + shift.v };
          const cost = crowding(boxAround(center, size)) + distance * 0.05 + Math.hypot(shift.u * 2, shift.v) * 0.6;
          if (!best || cost < best.cost - EPSILON) best = { tile: toTile(center), cost };
          if (cost <= distance * 0.05 + EPSILON) break;
        }
      }
      travelled += length;
    }
    const tile = best?.tile ?? points[Math.floor(points.length / 2)] ?? points[0];
    texts.insert(chipBox(text, tile));
    return roundPoint(tile);
  };

  // A route between two nodes with no connector of their own: along the gutters next to them and, across the columns
  // between, along a lane no node sits on.
  const gutterUse = new Map<number, number>();
  const gutterX = (x: number) => {
    const used = gutterUse.get(round(x)) ?? 0;
    gutterUse.set(round(x), used + 1);
    return x + (used % 2 === 0 ? 1 : -1) * Math.ceil(used / 2) * TRACK_STEP + TRACK_STEP / 2;
  };
  const columnOf = (x: number) => {
    let best = 0;
    columnXs.forEach((columnX, index) => {
      if (Math.abs(columnX - x) < Math.abs(columnXs[best] - x)) best = index;
    });
    return best;
  };
  const gutterAfter = (column: number) =>
    column + 1 < columnXs.length ? (columnXs[column] + columnXs[column + 1]) / 2 : columnXs[column] + 1.8;
  const gutterBefore = (column: number) =>
    column > 0 ? (columnXs[column - 1] + columnXs[column]) / 2 : columnXs[column] - 1.8;
  const routeBetween = (a: IsoTilePoint, b: IsoTilePoint): IsoTilePoint[] => {
    const ia = columnOf(a.x);
    const ib = columnOf(b.x);
    if (ia === ib) {
      const g = gutterX(gutterAfter(ia));
      return simplifyRoute([a, { x: g, y: a.y }, { x: g, y: b.y }, b]);
    }
    const forward = ib > ia;
    const g1 = gutterX(forward ? gutterAfter(ia) : gutterBefore(ia));
    if (Math.abs(ib - ia) === 1) return simplifyRoute([a, { x: g1, y: a.y }, { x: g1, y: b.y }, b]);
    const g2 = gutterX(forward ? gutterBefore(ib) : gutterAfter(ib));
    const [low, high] = forward ? [ia, ib] : [ib, ia];
    const blocked = scene.nodes
      .filter((node) => {
        const column = columnOf(node.tile.x);
        return column > low && column < high;
      })
      .map((node) => [node.tile.y - HALF_FOOTPRINT - 0.8, node.tile.y + HALF_FOOTPRINT + 0.8] as const);
    const free = (y: number) => blocked.every(([y0, y1]) => y <= y0 || y >= y1);
    const candidates = [a.y, b.y, (a.y + b.y) / 2, ...blocked.flatMap(([y0, y1]) => [y0 - 0.05, y1 + 0.05])];
    // The shortest lane, and among equally short ones the row of either end, which saves a bend.
    const bends = (y: number) => (Math.abs(y - a.y) < EPSILON || Math.abs(y - b.y) < EPSILON ? 0 : 1);
    const lane = candidates
      .filter(free)
      .sort(
        (p, q) =>
          Math.abs(a.y - p) + Math.abs(p - b.y) - (Math.abs(a.y - q) + Math.abs(q - b.y)) ||
          bends(p) - bends(q) ||
          Math.abs(p - (a.y + b.y) / 2) - Math.abs(q - (a.y + b.y) / 2)
      )[0];
    return simplifyRoute([a, { x: g1, y: a.y }, { x: g1, y: lane }, { x: g2, y: lane }, { x: g2, y: b.y }, b]);
  };

  const rules: IsoSecurityRule[] = [];
  const labelOf = (nodeId: string) => visible.get(nodeId)?.label ?? nodeId;
  /** "The orders group allows TCP 5432 from api, cron." for each group and peer the arrow stands for. */
  const describe = (ruleList: SecurityGroupRule[], context?: IsoConnector) => {
    const lines = new Map<string, SecurityGroupRule[]>();
    for (const rule of ruleList) {
      const key = `${rule.groupId}|${peerKey(rule.peer)}|${rule.conditions.join(',')}`;
      lines.set(key, [...(lines.get(key) ?? []), rule]);
    }
    return [
      ...[...lines.values()].map(
        (group) =>
          `The ${names.get(group[0].groupId) ?? group[0].groupId} group allows ${describeTraffic(group)} from ${peerWords(
            group[0].peer,
            group[0].groupId
          )}${describeConditions(group[0].conditions)}.`
      ),
      ...(context?.description ? [`The same path carries: ${context.description}`] : [])
    ].join(' ');
  };
  const pathBetween = (from: string, to: string) => {
    const existing = connectorBetween(from, to);
    if (existing) {
      const points = existing.reversed
        ? [...existing.connector.route.points].reverse()
        : existing.connector.route.points;
      const preferred = existing.connector.label ? existing.connector.route.labelTile : undefined;
      return { points, preferred, context: existing.connector };
    }
    const a = visible.get(from)?.tile as IsoTilePoint;
    const b = visible.get(to)?.tile as IsoTilePoint;
    return { points: routeBetween(a, b).map(roundPoint), preferred: undefined, context: undefined };
  };

  // Group arrows: routes first, so every chip can keep clear of every line.
  const pending: PendingRule[] = [];
  for (const arrow of drawnGroupArrows) {
    const { points, preferred, context } = pathBetween(arrow.from, arrow.to);
    const sourceCluster = clusterOf(arrow.sourceGroupId, arrow.from);
    const sourceName = names.get(arrow.sourceGroupId) ?? arrow.sourceGroupId;
    const targetName = names.get(arrow.targetGroupId) ?? arrow.targetGroupId;
    pending.push({
      id: `sg-rule-${arrow.sourceGroupId}->${arrow.targetGroupId}`,
      from: arrow.from,
      to: arrow.to,
      fromGroup: arrow.sourceGroupId,
      toGroup: arrow.targetGroupId,
      source: 'group',
      label: trafficLabel(arrow.rules),
      color: colorOf.get(arrow.sourceGroupId) ?? EXTERNAL_GROUP_COLOR,
      // The arrow leaves the source group's outline: it stands for the group, not the member it starts beside.
      points: (sourceCluster ? leaveRect(points, sourceCluster.outline) : points).map(roundPoint),
      preferred,
      title: `${sourceName} → ${targetName}`,
      description: describe(arrow.rules, context)
    });
  }

  // Address arrows: the internet's into a load balancer follows the user's connector; the rest come in from the side
  // of the group's outline where they are clearest.
  const stubs: Array<{
    id: string;
    groupId: string;
    source: AddressArrow['source'];
    label: string;
    rules: SecurityGroupRule[];
    title: string;
  }> = [];
  for (const [groupId, arrows] of [...addressByGroup].sort(([a], [b]) => a.localeCompare(b))) {
    // The internet first, IPv4 before IPv6, so the familiar `0.0.0.0/0` is the one on the user's connector.
    const sorted = [...arrows].sort(
      (p, q) =>
        Number(q.source === 'internet') - Number(p.source === 'internet') ||
        Number(p.peerText.includes(':')) - Number(q.peerText.includes(':')) ||
        p.peerText.localeCompare(q.peerText)
    );
    const drawn =
      sorted.length > MAX_ADDRESS_ARROWS_PER_GROUP + 1 ? sorted.slice(0, MAX_ADDRESS_ARROWS_PER_GROUP) : sorted;
    const rest = sorted.slice(drawn.length);
    const entry = userEntry(groupId);
    const targetName = names.get(groupId) ?? groupId;
    // Only the first internet rule follows the user's connector; another (IPv6 beside IPv4) gets its own arrow rather
    // than a second line on the same path.
    let followsUser = false;
    for (const arrow of drawn) {
      const label = `${arrow.peerText} · ${trafficLabel(arrow.rules)}`;
      const id = `sg-rule-${groupId}<-${arrow.peerId}`;
      if (arrow.source === 'internet' && entry && !followsUser) {
        followsUser = true;
        const { points, preferred, context } = pathBetween('user', entry);
        pending.push({
          id,
          from: 'user',
          to: entry,
          toGroup: groupId,
          source: 'internet',
          label,
          color: INTERNET_COLOR,
          points,
          preferred,
          title: `${labelOf('user')} → ${targetName}`,
          description: describe(arrow.rules, context)
        });
        continue;
      }
      stubs.push({
        id,
        groupId,
        source: arrow.source,
        label,
        rules: arrow.rules,
        title: `${arrow.peerText} → ${targetName}`
      });
    }
    if (rest.length > 0) {
      stubs.push({
        id: `sg-rule-${groupId}<-more`,
        groupId,
        source: rest.some((arrow) => arrow.source === 'internet') ? 'internet' : 'address',
        // No ports: each of these addresses has its own, which the tooltip and the panel list.
        label: `${rest.length} more address ranges`,
        rules: rest.flatMap((arrow) => arrow.rules),
        title: `${rest.length} more address ranges → ${targetName}`
      });
    }
  }
  for (const rule of pending) addLine(rule.id, rule.points);

  const usedSides = new Map<string, Set<string>>();
  const SIDES: Array<{ key: string; dx: number; dy: number }> = [
    { key: '-x', dx: -1, dy: 0 },
    { key: '+y', dx: 0, dy: 1 },
    { key: '-y', dx: 0, dy: -1 },
    { key: '+x', dx: 1, dy: 0 }
  ];
  for (const stub of stubs) {
    const cluster = mainCluster(stub.groupId);
    if (!cluster) continue;
    const chipSize = measureChip(stub.label);
    const used = usedSides.get(stub.groupId) ?? new Set<string>();
    let best:
      | {
          side: (typeof SIDES)[number];
          cost: number;
          start: IsoTilePoint;
          end: IsoTilePoint;
          endId: string;
          chip: { u: number; v: number };
        }
      | undefined;
    SIDES.forEach((side, order) => {
      // The member nearest that side of the outline, and a start a little outside it.
      const [{ id: endId, tile: end }] = cluster.nodes
        .map((id) => ({ id, tile: visible.get(id)?.tile as IsoTilePoint }))
        .sort(
          (a, b) =>
            (b.tile.x - a.tile.x) * side.dx + (b.tile.y - a.tile.y) * side.dy ||
            a.tile.x - b.tile.x ||
            a.tile.y - b.tile.y
        );
      const edge =
        side.dx < 0
          ? end.x - cluster.outline.x0
          : side.dx > 0
            ? cluster.outline.x1 - end.x
            : side.dy < 0
              ? end.y - cluster.outline.y0
              : cluster.outline.y1 - end.y;
      const start = { x: end.x + side.dx * (edge + STUB_OUT), y: end.y + side.dy * (edge + STUB_OUT) };
      // The chip sits beside the arrow's start, on the side away from the group, so it never covers it.
      const { u, v } = projectTile(start);
      const chip = { u: u + Math.sign(side.dx - side.dy) * (chipSize.halfWidth + 0.05), v };
      let cost = used.has(side.key) ? 1e6 : order * 0.5;
      cost += occupied(boxAround(chip, chipSize)) * 10 + otherLines(boxAround(chip, chipSize), '') * 2;
      for (let travelled = 0.2; travelled < STUB_OUT; travelled += 0.3) {
        const point = projectTile({ x: start.x - side.dx * travelled, y: start.y - side.dy * travelled });
        cost += occupied({ u0: point.u - 0.08, u1: point.u + 0.08, v0: point.v - 0.08, v1: point.v + 0.08 }) * 50;
      }
      if (!best || cost < best.cost - EPSILON) best = { side, cost, start, end, endId, chip };
    });
    const chosen = best as NonNullable<typeof best>;
    used.add(chosen.side.key);
    usedSides.set(stub.groupId, used);
    texts.insert(boxAround(chosen.chip, chipSize));
    const { id } = stub;
    addLine(id, [chosen.start, chosen.end]);
    rules.push({
      id,
      to: chosen.endId,
      toGroup: stub.groupId,
      source: stub.source,
      label: stub.label,
      color: stub.source === 'internet' ? INTERNET_COLOR : ADDRESS_COLOR,
      route: { points: [roundPoint(chosen.start), roundPoint(chosen.end)], labelTile: roundPoint(toTile(chosen.chip)) },
      title: stub.title,
      description: describe(stub.rules)
    });
  }

  for (const { points, preferred, ...rule } of pending) {
    rules.push({ ...rule, route: { points, labelTile: placeChip(rule.id, points, rule.label, preferred) } });
  }

  // ── Tabs ──
  const tabSize = (text: string) => ({
    halfWidth: (Math.min(text.length, TAB_MAX_CHARS) * TAB_CHAR_PX + TAB_PADDING_PX) / 2 / U_PX,
    halfHeight: TAB_HEIGHT_PX / 2 / V_PX
  });
  const groups: IsoSecurityGroup[] = [];
  for (const group of security.groups) {
    const own = clusters.filter((cluster) => cluster.groupId === group.id);
    if (own.length === 0) continue;
    const name = names.get(group.id) ?? group.id;
    const size = tabSize(name);
    // The largest outlines carry the name; a group spread over many keeps the rest unlabelled, in its colour.
    const labelled = new Set([...own].sort((a, b) => b.nodes.length - a.nodes.length).slice(0, MAX_TABS_PER_GROUP));
    const outlines = own.map((cluster) => {
      const rect = cluster.outline;
      const corners = {
        from: roundPoint({ x: rect.x0, y: rect.y0 }),
        to: roundPoint({ x: rect.x1, y: rect.y1 })
      };
      if (!labelled.has(cluster)) return corners;
      // The tab hangs off the outline from outside, where nothing else is: its left corner first, then along its back
      // edges, then its right corner, and only then in front, where name tags hang.
      const gap = 0.06;
      const candidates: Array<{ u: number; v: number }> = [];
      const left = projectedAt(rect.x0, rect.y1);
      candidates.push({ u: left.u - size.halfWidth - gap, v: left.v });
      for (const fraction of [0.15, 0.35, 0.55, 0.75]) {
        const p = projectedAt(rect.x0 + (rect.x1 - rect.x0) * fraction, rect.y1);
        candidates.push({ u: p.u - size.halfWidth * 0.6, v: p.v + size.halfHeight + gap });
      }
      const back = projectedAt(rect.x1, rect.y1);
      candidates.push({ u: back.u, v: back.v + size.halfHeight + gap });
      for (const fraction of [0.75, 0.5, 0.25]) {
        const p = projectedAt(rect.x1, rect.y0 + (rect.y1 - rect.y0) * fraction);
        candidates.push({ u: p.u + size.halfWidth * 0.6, v: p.v + size.halfHeight + gap });
      }
      const right = projectedAt(rect.x1, rect.y0);
      candidates.push({ u: right.u + size.halfWidth + gap, v: right.v });
      for (const fraction of [0.3, 0.7]) {
        const p = projectedAt(rect.x0 + (rect.x1 - rect.x0) * fraction, rect.y0);
        candidates.push({ u: p.u + size.halfWidth * 0.6, v: p.v - size.halfHeight - gap });
        const q = projectedAt(rect.x0, rect.y0 + (rect.y1 - rect.y0) * fraction);
        candidates.push({ u: q.u - size.halfWidth * 0.6, v: q.v - size.halfHeight - gap });
      }
      // A second ring, a little farther out, for crowded spots.
      const centre = projectedAt((rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2);
      const farther = candidates.map(({ u, v }) => {
        const du = u - centre.u;
        const dv = v - centre.v;
        const length = Math.hypot(du, dv) || 1;
        return { u: u + (du / length) * 0.6, v: v + (dv / length) * 0.6 };
      });
      let best: { u: number; v: number; cost: number } | undefined;
      [...candidates, ...farther].forEach((candidate, order) => {
        const cost = occupied(boxAround(candidate, size)) * 1000 + order * 0.01;
        if (!best || cost < best.cost - EPSILON) best = { ...candidate, cost };
      });
      // Crowded all round: the nearest free spot beside the best candidate.
      if (best && best.cost >= 1) {
        const from = best;
        for (let row = -3; row <= 3; row++) {
          for (let column = -3; column <= 3; column++) {
            const candidate = { u: from.u + column * size.halfWidth * 0.4, v: from.v + row * 2.1 * size.halfHeight };
            const cost = occupied(boxAround(candidate, size)) * 1000 + Math.hypot(column, row) * 0.2;
            if (cost < best.cost - EPSILON) best = { ...candidate, cost };
          }
        }
      }
      const tab = best as NonNullable<typeof best>;
      texts.insert(boxAround(tab, size));
      return Object.assign(corners, { tab: roundPoint(toTile(tab)) });
    });
    const inbound = inboundOf.get(group.id) ?? [];
    const outbound = outboundOf.get(group.id) ?? [];
    const members = groupResources.get(group.id) ?? [];
    const missing = undrawn.get(group.id) ?? [];
    groups.push({
      id: group.id,
      name,
      color: colorOf.get(group.id) as string,
      external: group.kind === 'external',
      memberNodeIds: groupNodes.get(group.id) ?? [],
      outlines,
      summary:
        group.kind === 'external'
          ? 'Defined outside this stack, so its rules are not in this template.'
          : inbound.length > 0
            ? `${inbound.join('. ')}.`
            : 'Allows no inbound traffic.',
      details: [
        outbound.length > 0 ? `Outbound: ${outbound.map((line) => line.replace(/^Allows /, '')).join('; ')}.` : null,
        `Members: ${listNames([...members, ...missing]) || 'none drawn'}.`,
        omittedTargets.has(group.id)
          ? 'Some rules into it are not drawn as arrows; the side panel lists them all.'
          : null
      ]
        .filter(Boolean)
        .join(' ')
    });
  }

  return {
    ...scene,
    nodes: scene.nodes.map((node) =>
      nodeGroups.has(node.id) ? Object.assign({}, node, { securityGroups: nodeGroups.get(node.id) }) : node
    ),
    connectors: scene.connectors.filter((connector) => !replaced.has(connector.id)),
    securityGroups: groups,
    securityRules: rules
  };
};
