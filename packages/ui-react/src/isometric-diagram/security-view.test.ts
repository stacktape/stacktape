import type { ProjectedBox } from './layout/projected-box.js';
import type { IsoScene, IsoSecurityRule, IsoTilePoint } from './scene.js';
import type { DiagramOverlays } from './views.js';
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { findRoleGroups } from './grouping.js';
import { BODY_SHAPES, nodeShapes } from './layout/diagram-layout.js';
import { boxOverlapArea, projectTile, shiftBox } from './layout/projected-box.js';
import { buildDiagramModel, diagramFrame, measureChip, selectDiagramView } from './scene-builder.js';
import { buildSecurityGroupModel } from './security-groups.js';
import { buildDiagramTopology } from './topology.js';
import { DIAGRAM_VIEWS, VIEW_PRESETS } from './views.js';

/**
 * The Security view drawn from the templates the CLI synthesizes for `security-groups.test.ts`. Each test restates what
 * a reader should see for one template; the last checks legibility rules over all of them.
 */
const TEMPLATES = new URL('./generated/security-group-templates/', import.meta.url);
const templateNames = readdirSync(TEMPLATES)
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.replace(/\.json$/, ''))
  .sort();

const load = (name: string) => JSON.parse(readFileSync(new URL(`${name}.json`, TEMPLATES), 'utf8'));

const securityScene = ({
  name,
  overlays = VIEW_PRESETS.security,
  expand = false
}: {
  name: string;
  overlays?: DiagramOverlays;
  expand?: boolean;
}) => {
  const fixture = load(name);
  const config = parse(fixture.config);
  const topology = buildDiagramTopology({ parsedConfig: config });
  const expandedGroups = new Set(expand && topology ? findRoleGroups({ topology }).map((group) => group.id) : []);
  const model = buildDiagramModel({ parsedConfig: config, expandedGroups });
  if (!model) throw new Error(`No model for ${name}`);
  return { model, scene: selectDiagramView({ model, overlays, security: buildSecurityGroupModel(fixture) }) };
};

const groupOn = (scene: IsoScene, name: string) => {
  const group = scene.securityGroups?.find((candidate) => candidate.name === name);
  if (!group)
    throw new Error(`No group ${name}: ${scene.securityGroups?.map((candidate) => candidate.name).join(', ')}`);
  return group;
};

const rulesInto = (scene: IsoScene, to: string) =>
  (scene.securityRules ?? [])
    .filter((rule) => rule.to === to)
    .map(({ from, source, label }) => ({ from, source, label }))
    .sort((a, b) => `${a.source}${a.label}`.localeCompare(`${b.source}${b.label}`));

const inboundOf = (scene: IsoScene, nodeId: string) =>
  scene.nodes.find((node) => node.id === nodeId)?.securityGroups?.flatMap((group) => group.inbound) ?? [];

type Outline = { from: IsoTilePoint; to: IsoTilePoint };
const inside = (inner: Outline, outer: Outline) =>
  inner.from.x > outer.from.x && inner.from.y > outer.from.y && inner.to.x < outer.to.x && inner.to.y < outer.to.y;

const footprintOf = (tile: IsoTilePoint) => ({
  x0: tile.x - 0.66,
  x1: tile.x + 0.66,
  y0: tile.y - 0.66,
  y1: tile.y + 0.66
});

/** Whether an axis-aligned route segment passes through a footprint. */
const crosses = (start: IsoTilePoint, end: IsoTilePoint, box: ReturnType<typeof footprintOf>) =>
  Math.max(start.x, end.x) > box.x0 + 1e-6 &&
  Math.min(start.x, end.x) < box.x1 - 1e-6 &&
  Math.max(start.y, end.y) > box.y0 + 1e-6 &&
  Math.min(start.y, end.y) < box.y1 - 1e-6;

describe('security view of real templates', () => {
  test('database accessibility: the internet, the VPC, a CIDR and a connecting service', () => {
    const { scene } = securityScene({ name: 'database-accessibility' });

    expect(rulesInto(scene, 'publicDb')).toEqual([
      { from: undefined, source: 'internet', label: '0.0.0.0/0 · TCP 5432' }
    ]);
    expect(rulesInto(scene, 'vpcDb')).toEqual([{ from: undefined, source: 'address', label: 'whole VPC · TCP 5432' }]);
    expect(rulesInto(scene, 'scopedDb')).toEqual([
      { from: undefined, source: 'address', label: '203.0.113.10/32 · TCP 5432' },
      { from: 'web', source: 'group', label: 'TCP 5432' }
    ]);
    // The rule follows the service's connectTo connector and takes its place.
    expect(scene.connectors.some((edge) => edge.from === 'web' && edge.to === 'scopedDb')).toBe(false);

    // A VPC Link's rule gets its own arrow: users reach the API endpoint, not the link, so the HTTPS connector stays.
    expect(rulesInto(scene, 'web--gw')).toEqual([
      { from: undefined, source: 'internet', label: '0.0.0.0/0 · TCP 3000' }
    ]);
    expect(scene.connectors.some((edge) => edge.from === 'user' && edge.to === 'web--gw')).toBe(true);
    expect(rulesInto(scene, 'web')).toEqual([{ from: 'web--gw', source: 'group', label: 'TCP 3000' }]);

    expect(inboundOf(scene, 'scopedDb')).toEqual(['Allows TCP 5432 from web', 'Allows TCP 5432 from 203.0.113.10/32']);
    expect(scene.nodes.find((node) => node.id === 'scopedDb')?.securityGroups?.[0]?.outbound).toEqual([
      'Allows all outbound traffic (the AWS default)'
    ]);
    expect(inboundOf(scene, 'publicDb')).toEqual(['Allows TCP 5432 from the internet (0.0.0.0/0)']);
    expect(inboundOf(scene, 'vpcDb')).toEqual(['Allows TCP 5432 from the whole VPC (172.16.0.0/16)']);
    expect(groupOn(scene, 'VPC functions SG').memberNodeIds).toEqual(['reports']);
    expect(groupOn(scene, 'web VPC Link SG').memberNodeIds).toEqual(['web--gw']);
  });

  test('load balancers: the internet reaches them on the user’s connector, and they reach their service', () => {
    const { scene } = securityScene({ name: 'http-api-vpc-link' });
    expect(rulesInto(scene, 'albWeb--alb')).toEqual([
      { from: 'user', source: 'internet', label: '0.0.0.0/0 · TCP 80, 443' }
    ]);
    expect(rulesInto(scene, 'albWeb')).toEqual([{ from: 'albWeb--alb', source: 'group', label: 'TCP 3000' }]);
    expect(rulesInto(scene, 'tcpWeb')).toEqual([{ from: 'tcpWeb--nlb', source: 'group', label: 'TCP 5000' }]);
    expect(rulesInto(scene, 'app')).toEqual([{ from: 'api', source: 'group', label: 'TCP 8080' }]);
    expect(groupOn(scene, 'albWeb LB SG').memberNodeIds).toEqual(['albWeb--alb']);
    expect(inboundOf(scene, 'albWeb')).toEqual(['Allows TCP 3000 from albWeb ALB']);
  });

  test('shared network: a node in two groups gets two outlines, one inside the other', () => {
    const { scene } = securityScene({ name: 'shared-network-stage' });
    const outlinesAround = (nodeId: string) =>
      (scene.securityGroups ?? [])
        .filter((group) => group.memberNodeIds.includes(nodeId))
        .flatMap((group) => group.outlines)
        .filter((outline) => {
          const tile = scene.nodes.find((node) => node.id === nodeId)?.tile as IsoTilePoint;
          return outline.from.x < tile.x && tile.x < outline.to.x && outline.from.y < tile.y && tile.y < outline.to.y;
        });
    const around = outlinesAround('api');
    expect(around).toHaveLength(2);
    const [a, b] = around;
    expect(inside(a, b) || inside(b, a)).toBe(true);

    // The load balancer admits the stage's group: one arrow from that group's outline, routed because no member has a
    // connector to the balancer.
    const intoBalancer = (scene.securityRules ?? []).filter((rule) => rule.toGroup === 'InternalLbLbSecurityGroup');
    expect(intoBalancer.map(({ fromGroup, source, label }) => ({ fromGroup, source, label }))).toEqual([
      { fromGroup: 'StpStageNetworkSecurityGroup', source: 'group', label: 'TCP 80, 443' }
    ]);
    const [arrow] = intoBalancer;
    const stage = groupOn(scene, 'Stage network SG');
    const start = arrow.route.points[0];
    const onBoundary = stage.outlines.some(
      (outline) =>
        start.x >= outline.from.x - 1e-3 &&
        start.x <= outline.to.x + 1e-3 &&
        start.y >= outline.from.y - 1e-3 &&
        start.y <= outline.to.y + 1e-3 &&
        [outline.from.x, outline.to.x].some((x) => Math.abs(start.x - x) < 1e-3) !==
          [outline.from.y, outline.to.y].some((y) => Math.abs(start.y - y) < 1e-3)
    );
    expect(onBoundary).toBe(true);
    expect(rulesInto(scene, 'orders')).toEqual([{ from: 'api', source: 'group', label: 'TCP 5432' }]);
    expect(inboundOf(scene, 'internalLb')).toEqual(['Allows TCP 80, 443 from internalLb, api, cron']);
  });

  test('a group defined outside the stack is marked, and its rules are not guessed', () => {
    const { scene } = securityScene({ name: 'shared-network-no-access' });
    const external = groupOn(scene, 'external sg-0noaccess');
    expect(external.external).toBe(true);
    expect(external.memberNodeIds).toEqual(['cron']);
    expect(scene.nodes.find((node) => node.id === 'cron')?.securityGroups).toEqual([
      expect.objectContaining({ external: true, inbound: [], outbound: [] })
    ]);
  });

  test('private network: an EFS mount and an internal load balancer', () => {
    const { scene } = securityScene({ name: 'private-network' });
    expect(rulesInto(scene, 'files')).toEqual([{ from: 'worker', source: 'group', label: 'TCP 2049' }]);
    expect(rulesInto(scene, 'cache')).toEqual([{ from: 'worker', source: 'group', label: 'TCP 6379' }]);
    expect(rulesInto(scene, 'internalApi--alb')).toEqual([
      { from: undefined, source: 'address', label: 'whole VPC · TCP 3000' }
    ]);
  });

  test('a collapsed role group carries its members’ groups; expanded, members drawn together share an outline', () => {
    const collapsed = securityScene({ name: 'lambda-vpc' }).scene;
    const deck = collapsed.nodes.find((node) => node.memberCount)?.id as string;
    expect(groupOn(collapsed, 'VPC functions SG → cache').memberNodeIds).toEqual([deck]);
    expect(groupOn(collapsed, 'VPC functions SG').memberNodeIds).toEqual([deck]);
    expect(rulesInto(collapsed, 'cache')).toEqual([{ from: deck, source: 'group', label: 'TCP 6379' }]);

    const expanded = securityScene({ name: 'lambda-vpc', expand: true }).scene;
    const shared = groupOn(expanded, 'VPC functions SG → cache');
    expect(shared.memberNodeIds).toEqual(['search', 'indexer']);
    expect(shared.outlines).toHaveLength(1);
    // One arrow for the group, not one per function; it follows the first member's connector.
    expect(rulesInto(expanded, 'cache')).toEqual([{ from: 'search', source: 'group', label: 'TCP 6379' }]);
    expect(expanded.connectors.some((edge) => edge.from === 'indexer' && edge.to === 'cache')).toBe(true);
  });

  test('batch jobs join their compute environment’s group; the NAT instance shows with the network overlay', () => {
    const plain = securityScene({ name: 'batch-bastion-nat-instance' }).scene;
    expect(groupOn(plain, 'Batch instances SG').memberNodeIds).toEqual(['importer']);
    expect(plain.securityGroups?.some((group) => group.name === 'NAT instances SG')).toBe(false);
    expect(rulesInto(plain, 'db')).toEqual([
      { from: 'agent', source: 'group', label: 'TCP 5432' },
      { from: 'importer', source: 'group', label: 'TCP 5432' }
    ]);

    const withNetwork = securityScene({
      name: 'batch-bastion-nat-instance',
      overlays: { ...VIEW_PRESETS.security, network: true }
    }).scene;
    expect(groupOn(withNetwork, 'NAT instances SG').memberNodeIds).toEqual(['nat-gateway']);
    expect(rulesInto(withNetwork, 'nat-gateway')).toEqual([
      { from: undefined, source: 'address', label: 'whole VPC · all traffic' }
    ]);
  });

  test('Convex: the dashboard carries its own group, apart from the backend’s', () => {
    const { scene } = securityScene({ name: 'convex' });
    expect(groupOn(scene, 'app dashboard SG').memberNodeIds).toEqual(['app--dashboard']);
    expect(groupOn(scene, 'app SG').memberNodeIds).toEqual(['app']);
    expect(inboundOf(scene, 'app--dashboard')).toEqual(['Allows TCP 6791 from app ALB']);
    expect(inboundOf(scene, 'app')).toEqual(['Allows TCP 3210, 3211 from app ALB']);
    expect(rulesInto(scene, 'app--dashboard')).toEqual([{ from: 'app--alb', source: 'group', label: 'TCP 6791' }]);
    expect(rulesInto(scene, 'app')).toEqual([{ from: 'app--alb', source: 'group', label: 'TCP 3210, 3211' }]);
    expect(rulesInto(scene, 'app--db')).toEqual([{ from: 'app', source: 'group', label: 'TCP 5432' }]);
    expect(rulesInto(scene, 'app--alb')).toEqual([
      { from: 'user', source: 'internet', label: '0.0.0.0/0 · TCP 3210, 3211, 6791' }
    ]);
  });

  test('each whitelisted address gets its own arrow with its own port', () => {
    const { scene } = securityScene({ name: 'alb-whitelisted-listeners' });
    const into = (scene.securityRules ?? []).filter((rule) => rule.to === 'edge');
    expect(into.map(({ source, label }) => ({ source, label }))).toEqual([
      { source: 'address', label: '198.51.100.20/32 · TCP 8080' },
      { source: 'address', label: '203.0.113.10/32 · TCP 80' }
    ]);
    expect(new Set(into.map(({ id }) => id)).size).toBe(2);
    expect(inboundOf(scene, 'edge')).toEqual([
      'Allows TCP 80 from 203.0.113.10/32',
      'Allows TCP 8080 from 198.51.100.20/32'
    ]);
  });

  test('with Stacktape-created resources hidden, a load balancer’s group moves onto its service', () => {
    const { scene } = securityScene({
      name: 'http-api-vpc-link',
      overlays: { ...VIEW_PRESETS.security, createdResources: false }
    });
    expect(groupOn(scene, 'albWeb LB SG').memberNodeIds).toEqual(['albWeb']);
    // The load balancer's rule into its own service would point at itself, so it is not drawn.
    expect(rulesInto(scene, 'albWeb')).toEqual([
      { from: 'user', source: 'internet', label: '0.0.0.0/0 · TCP 80, 443' }
    ]);
  });
});

describe('legibility over every template', () => {
  for (const name of templateNames) {
    for (const expand of [false, true]) {
      test(`${name}${expand ? ' (expanded)' : ''}: outlines hold their members, arrows avoid other nodes, text avoids bodies`, () => {
        const { model, scene } = securityScene({ name, expand });
        const tiles = new Map(scene.nodes.map((node) => [node.id, node.tile]));

        for (const group of scene.securityGroups ?? []) {
          for (const member of group.memberNodeIds) {
            const box = footprintOf(tiles.get(member) as IsoTilePoint);
            expect(
              group.outlines.some(
                (outline) =>
                  outline.from.x < box.x0 && outline.to.x > box.x1 && outline.from.y < box.y0 && outline.to.y > box.y1
              )
            ).toBe(true);
          }
        }

        const routed = (rule: IsoSecurityRule) =>
          !scene.connectors.some((edge) => edge.route.points === rule.route.points) && rule.from;
        for (const rule of scene.securityRules ?? []) {
          expect(tiles.has(rule.to)).toBe(true);
          if (rule.from) expect(tiles.has(rule.from)).toBe(true);
          if (!routed(rule)) continue;
          const points = rule.route.points;
          for (const node of scene.nodes) {
            if (node.id === rule.from || node.id === rule.to) continue;
            const box = footprintOf(node.tile);
            for (let index = 0; index + 1 < points.length; index++) {
              expect(crosses(points[index], points[index + 1], box)).toBe(false);
            }
          }
        }

        const bodies: ProjectedBox[] = scene.nodes.flatMap((node) => {
          const layoutNode = model.layoutNodes.get(node.id);
          if (!layoutNode) return [];
          const { u, v } = projectTile(node.tile);
          return nodeShapes(layoutNode)
            .slice(0, BODY_SHAPES)
            .map((box) => shiftBox({ box, u, v }));
        });
        const textBoxes = [
          ...(scene.securityRules ?? []).map((rule) => {
            const size = measureChip(rule.label);
            const { u, v } = projectTile(rule.route.labelTile);
            return { u0: u - size.halfWidth * 0.8, u1: u + size.halfWidth * 0.8, v0: v - 0.35, v1: v + 0.35 };
          }),
          ...(scene.securityGroups ?? []).flatMap((group) =>
            group.outlines.flatMap((outline) => {
              if (!outline.tab) return [];
              const { u, v } = projectTile(outline.tab);
              const half = (group.name.length * 6.2 + 14) / 2 / 40;
              return [{ u0: u - half * 0.8, u1: u + half * 0.8, v0: v - 0.3, v1: v + 0.3 }];
            })
          )
        ];
        // A crowded spot may let a chip graze a body's corner, never cover it.
        for (const text of textBoxes) {
          for (const body of bodies) expect(boxOverlapArea({ a: text, b: body })).toBeLessThan(0.1);
        }
      });
    }
  }
});

/** A synthetic template: one security group per entry, each listing the functions it carries and its ingress rules. */
const syntheticTemplate = ({
  functions,
  groups
}: {
  functions: number;
  groups: Array<{ id: string; members: (index: number) => boolean; ingress: Array<Record<string, unknown>> }>;
}) => {
  const names = Array.from({ length: functions }, (_, index) => `fn${index}`);
  const resources: Record<string, unknown> = {};
  for (const group of groups) {
    resources[group.id] = {
      Type: 'AWS::EC2::SecurityGroup',
      Properties: { GroupDescription: group.id, VpcId: 'vpc-0synthetic', SecurityGroupIngress: group.ingress }
    };
  }
  names.forEach((_, index) => {
    resources[`Fn${index}Function`] = {
      Type: 'AWS::Lambda::Function',
      Properties: {
        VpcConfig: {
          SubnetIds: ['subnet-0a'],
          SecurityGroupIds: groups.filter(({ members }) => members(index)).map(({ id }) => ({ Ref: id }))
        }
      }
    };
  });
  return {
    config: {
      resources: Object.fromEntries(
        names.map((name) => [
          name,
          {
            type: 'function',
            properties: {
              packaging: { type: 'js-bundle', properties: { entryfilePath: 'a.ts' } },
              joinDefaultVpc: true
            }
          }
        ])
      )
    },
    input: {
      resources,
      stacktapeResources: names.map((name, index) => ({ name, type: 'function', logicalIds: [`Fn${index}Function`] }))
    }
  };
};

describe('bounded work', () => {
  test('a group admitting many addresses draws a few arrows and one more that names no ports', () => {
    const cidrs = ['198.51.100.1/32', '198.51.100.2/32', '198.51.100.3/32', '198.51.100.4/32', '198.51.100.5/32'];
    const { config, input } = syntheticTemplate({
      functions: 1,
      groups: [
        {
          id: 'Target',
          members: () => true,
          ingress: cidrs.map((cidr, index) => ({
            IpProtocol: 'tcp',
            FromPort: 8000 + index,
            ToPort: 8000 + index,
            CidrIp: cidr
          }))
        }
      ]
    });
    const model = buildDiagramModel({ parsedConfig: config as never });
    const scene = selectDiagramView({
      model: model!,
      overlays: VIEW_PRESETS.security,
      security: buildSecurityGroupModel(input)
    });
    expect((scene.securityRules ?? []).map(({ label }) => label)).toEqual([
      '198.51.100.1/32 · TCP 8000',
      '198.51.100.2/32 · TCP 8001',
      '198.51.100.3/32 · TCP 8002',
      '2 more address ranges'
    ]);
    expect(scene.securityRules?.at(-1)?.description).toContain('allows TCP 8003 from 198.51.100.4/32');
    expect(scene.securityRules?.at(-1)?.description).toContain('allows TCP 8004 from 198.51.100.5/32');
  });

  test('300 functions in two groups, one rule between them: one arrow, and every view in well under two seconds', () => {
    const { config, input } = syntheticTemplate({
      functions: 300,
      groups: [
        { id: 'Callers', members: (index) => index < 150, ingress: [] },
        {
          id: 'Callees',
          members: (index) => index >= 150,
          ingress: [{ IpProtocol: 'tcp', FromPort: 443, ToPort: 443, SourceSecurityGroupId: { Ref: 'Callers' } }]
        }
      ]
    });
    const topology = buildDiagramTopology({ parsedConfig: config as never });
    const expandedGroups = new Set(findRoleGroups({ topology: topology! }).map((group) => group.id));
    expect(expandedGroups.size).toBeGreaterThan(0);

    const started = performance.now();
    const model = buildDiagramModel({ parsedConfig: config as never, expandedGroups })!;
    const security = buildSecurityGroupModel(input);
    const frame = diagramFrame({ model, security });
    const scenes = DIAGRAM_VIEWS.map((view) => selectDiagramView({ model, overlays: VIEW_PRESETS[view], security }));
    const elapsed = performance.now() - started;

    expect(frame?.nodeTiles).toHaveLength(300);
    const securityScene300 = scenes[2];
    expect(securityScene300.nodes).toHaveLength(300);
    expect(
      securityScene300.securityRules?.map(({ fromGroup, toGroup, label }) => ({ fromGroup, toGroup, label }))
    ).toEqual([{ fromGroup: 'Callers', toGroup: 'Callees', label: 'TCP 443' }]);
    for (const group of securityScene300.securityGroups ?? []) {
      expect(group.memberNodeIds).toHaveLength(150);
      expect(group.outlines.filter((outline) => outline.tab).length).toBeLessThanOrEqual(3);
    }
    expect(elapsed).toBeLessThan(2000);
  });
});

/** The http-api-vpc-link template with an IPv6 rule beside the IPv4 ones on the ALB's group, or with neither. */
const loadBalancerTemplate = ({ ipv6, internet }: { ipv6: boolean; internet: boolean }) => {
  const fixture = structuredClone(load('http-api-vpc-link'));
  const group = fixture.resources.AlbWebLbSecurityGroup.Properties;
  const ingress = [
    ...group.SecurityGroupIngress,
    ...(ipv6 ? [{ IpProtocol: 'tcp', FromPort: 22, ToPort: 22, CidrIpv6: '::/0' }] : [])
  ];
  group.SecurityGroupIngress = internet
    ? ingress
    : ingress.filter((rule: Record<string, unknown>) => !rule.CidrIp && !rule.CidrIpv6);
  return fixture;
};

const ids = (scene: IsoScene) => (scene.securityRules ?? []).map(({ id }) => id);

const intoBalancer = (scene: IsoScene) =>
  (scene.securityRules ?? []).filter((rule) => rule.toGroup === 'AlbWebLbSecurityGroup');

describe('arrow identity', () => {
  for (const name of templateNames) {
    test(`${name}: every arrow, chip and outline has its own ID in every view`, () => {
      for (const expand of [false, true]) {
        for (const overlays of [
          ...DIAGRAM_VIEWS.map((view) => VIEW_PRESETS[view]),
          { ...VIEW_PRESETS.security, network: true }
        ]) {
          const { scene } = securityScene({ name, expand, overlays });
          expect(new Set(ids(scene)).size).toBe(ids(scene).length);
          expect(new Set(scene.connectors.map(({ id }) => id)).size).toBe(scene.connectors.length);
          const groups = (scene.securityGroups ?? []).map(({ id }) => id);
          expect(new Set(groups).size).toBe(groups.length);
        }
      }
    });
  }

  test('IPv4 and IPv6 internet rules into one load balancer are two arrows with their own IDs and ports', () => {
    const fixture = loadBalancerTemplate({ ipv6: true, internet: true });
    const model = buildDiagramModel({ parsedConfig: parse(fixture.config) })!;
    const scene = selectDiagramView({
      model,
      overlays: VIEW_PRESETS.security,
      security: buildSecurityGroupModel(fixture)
    });
    const internet = (scene.securityRules ?? []).filter(
      (rule) => rule.source === 'internet' && rule.toGroup === 'AlbWebLbSecurityGroup'
    );
    expect(internet.map(({ id, from, label }) => ({ id, from, label }))).toEqual([
      // The first follows the user's connector; the second gets its own arrow instead of a second line on that path.
      { id: 'sg-rule-AlbWebLbSecurityGroup<-internet:::/0', from: undefined, label: '::/0 · TCP 22' },
      { id: 'sg-rule-AlbWebLbSecurityGroup<-internet:0.0.0.0/0', from: 'user', label: '0.0.0.0/0 · TCP 80, 443' }
    ]);
  });

  test('a template that drops its internet rules drops their arrows and gives the user’s connector back', () => {
    const before = loadBalancerTemplate({ ipv6: true, internet: true });
    const after = loadBalancerTemplate({ ipv6: true, internet: false });
    const model = buildDiagramModel({ parsedConfig: parse(before.config) })!;
    const sceneOf = (fixture: typeof before) =>
      selectDiagramView({ model, overlays: VIEW_PRESETS.security, security: buildSecurityGroupModel(fixture) });
    const first = sceneOf(before);
    const second = sceneOf(after);
    expect(intoBalancer(first)).toHaveLength(2);
    expect(intoBalancer(second)).toEqual([]);
    expect(ids(second).every((id) => ids(first).includes(id))).toBe(true);
    expect(second.connectors.some((edge) => edge.from === 'user' && edge.to === 'albWeb--alb')).toBe(true);
    expect(inboundOf(second, 'albWeb--alb')).toEqual([]);
  });
});
