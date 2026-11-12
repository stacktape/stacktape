import type { ProjectedBox } from './layout/projected-box.js';
import type { IsoNode, IsoScene } from './scene.js';
import type { DiagramLayers } from './views.js';
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { findRoleGroups } from './grouping.js';
import { nodeShapes } from './layout/diagram-layout.js';
import { boxOverlapArea, projectTile, shiftBox } from './layout/projected-box.js';
import { ACCESS_TAG_HEIGHT_PX, getAccessTagWidthPx } from './node-appearance.js';
import { buildDiagramModel, diagramFrame, measureChip, selectDiagramView } from './scene-builder.js';
import { buildSecurityGroupModel } from './security-groups.js';
import { buildDiagramTopology } from './topology.js';
import { ALL_LAYERS, NO_LAYERS } from './views.js';

/**
 * The Access layer drawn from the templates the CLI synthesizes for `security-groups.test.ts`. Each test restates what
 * a reader should see for one template; the last checks legibility rules over all of them.
 */
const TEMPLATES = new URL('./generated/security-group-templates/', import.meta.url);
const templateNames = readdirSync(TEMPLATES)
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.replace(/\.json$/, ''))
  .sort();

const INFRASTRUCTURE: DiagramLayers = { infrastructure: true, access: false };
const ACCESS: DiagramLayers = { infrastructure: false, access: true };
const COMBINATIONS = [NO_LAYERS, INFRASTRUCTURE, ACCESS, ALL_LAYERS];

const load = (name: string) => JSON.parse(readFileSync(new URL(`${name}.json`, TEMPLATES), 'utf8'));

const accessScene = ({
  name,
  layers = ALL_LAYERS,
  expand = false
}: {
  name: string;
  layers?: DiagramLayers;
  expand?: boolean;
}) => {
  const fixture = load(name);
  const config = parse(fixture.config);
  const topology = buildDiagramTopology({ parsedConfig: config });
  const expandedGroups = new Set(expand && topology ? findRoleGroups({ topology }).map((group) => group.id) : []);
  const model = buildDiagramModel({ parsedConfig: config, expandedGroups });
  if (!model) throw new Error(`No model for ${name}`);
  return { model, scene: selectDiagramView({ model, layers, security: buildSecurityGroupModel(fixture) }) };
};

/** Every tag in the scene as "reach: text", by node. */
const tagsOf = (scene: IsoScene) =>
  Object.fromEntries(
    scene.nodes.flatMap((node) => (node.access ? [[node.id, `${node.access.reach}: ${node.access.text}`]] : []))
  );

const nodeOf = (scene: IsoScene, nodeId: string) => {
  const node = scene.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) throw new Error(`No node ${nodeId}: ${scene.nodes.map((candidate) => candidate.id).join(', ')}`);
  return node;
};

const inboundOf = (scene: IsoScene, nodeId: string) =>
  nodeOf(scene, nodeId).securityGroups?.flatMap((group) => group.inbound) ?? [];

const groupNamesOf = (scene: IsoScene, nodeId: string) =>
  nodeOf(scene, nodeId).securityGroups?.map((group) => group.name) ?? [];

describe('tags of real templates', () => {
  test('database accessibility: the internet, the VPC, an address and a connecting service', () => {
    const { scene } = accessScene({ name: 'database-accessibility' });
    expect(tagsOf(scene)).toEqual({
      publicDb: 'exposed: Open to the internet',
      vpcDb: 'limited: Anything in the VPC',
      scopedDb: 'limited: Only web + 203.0.113.10',
      // Only the gateway connects to the service, and the gateway is public, so the service is public through it.
      web: 'public: Public via web GW',
      // The gateway's VPC Link group says who the link lets in, not who reaches the gateway: the user's connector does.
      'web--gw': 'public: Public'
    });
    // A function in the VPC carries a group that lets nothing in. AWS starts a function, so that says nothing about
    // who can use it: no tag, and the tooltip says why.
    expect(groupNamesOf(scene, 'reports')).toEqual(['VPC functions SG']);
    expect(nodeOf(scene, 'reports').access).toBeUndefined();
    expect(nodeOf(scene, 'reports').untaggedNote).toBe(
      'Nothing connects to it directly. AWS starts it, and AWS permissions (IAM) decide who can.'
    );
    expect(nodeOf(scene, 'web').access?.detail).toBe('Anyone on the internet can reach it through web GW.');
    expect(nodeOf(scene, 'publicDb').access?.detail).toBe(
      'Anyone on the internet can connect to it. Only its credentials protect the data.'
    );
    expect(nodeOf(scene, 'vpcDb').access?.detail).toBe(
      'Anything inside the VPC can connect to it. The internet cannot.'
    );
    expect(nodeOf(scene, 'scopedDb').access?.detail).toBe('Only web and 203.0.113.10 can connect to it.');
    expect(nodeOf(scene, 'scopedDb').access?.sources).toEqual(['web']);

    expect(inboundOf(scene, 'scopedDb')).toEqual(['Allows TCP 5432 from web', 'Allows TCP 5432 from 203.0.113.10/32']);
    expect(nodeOf(scene, 'scopedDb').securityGroups?.[0]?.outbound).toEqual([
      'Allows all outbound traffic (the AWS default)'
    ]);
    expect(inboundOf(scene, 'publicDb')).toEqual(['Allows TCP 5432 from the internet (0.0.0.0/0)']);
    expect(inboundOf(scene, 'vpcDb')).toEqual(['Allows TCP 5432 from the whole VPC (172.16.0.0/16)']);
    expect(groupNamesOf(scene, 'web--gw')).toEqual(['web VPC Link SG']);
  });

  test('load balancers are public, and so are the services they forward to', () => {
    const { scene } = accessScene({ name: 'http-api-vpc-link' });
    expect(tagsOf(scene)).toEqual({
      api: 'public: Public',
      app: 'public: Public via api',
      'albWeb--alb': 'public: Public',
      albWeb: 'public: Public via albWeb ALB',
      'tcpWeb--nlb': 'public: Public',
      tcpWeb: 'public: Public via tcpWeb NLB'
    });
    // Focusing the service still lights what connects to it.
    expect(nodeOf(scene, 'albWeb').access?.sources).toEqual(['albWeb--alb']);
    expect(inboundOf(scene, 'albWeb')).toEqual(['Allows TCP 3000 from albWeb ALB']);
  });

  test('without the Infrastructure layer, a service drawn with its load balancer is public itself', () => {
    const { scene } = accessScene({ name: 'http-api-vpc-link', layers: ACCESS });
    // Every service is public in both pictures; only the words for how change with what is drawn.
    expect(tagsOf(scene)).toEqual({
      api: 'public: Public',
      app: 'public: Public via api',
      albWeb: 'public: Public',
      tcpWeb: 'public: Public'
    });
    expect(groupNamesOf(scene, 'albWeb')).toEqual(['albWeb SG', 'albWeb LB SG']);
  });

  test('shared network: a group several resources carry lets the others in, not the node itself', () => {
    const { scene } = accessScene({ name: 'shared-network-stage' });
    expect(tagsOf(scene)).toEqual({ orders: 'limited: Only api', internalLb: 'limited: Only api, cron' });
    expect(nodeOf(scene, 'internalLb').access?.sources).toEqual(['api', 'cron']);
    expect(inboundOf(scene, 'internalLb')).toEqual(['Allows TCP 80, 443 from internalLb, api, cron']);
    expect(groupNamesOf(scene, 'api')).toHaveLength(2);
  });

  test('a group defined outside the stack is listed, and its rules are not guessed', () => {
    const { scene } = accessScene({ name: 'shared-network-no-access' });
    expect(nodeOf(scene, 'cron').securityGroups).toEqual([
      {
        id: 'external:sg-0noaccess',
        name: 'external sg-0noaccess',
        external: true,
        decides: true,
        inbound: [],
        outbound: []
      }
    ]);
    // What the group admits is unknown, so the tag says that rather than nothing.
    expect(tagsOf(scene).cron).toBe('unknown: Access unknown');
  });

  test('private network: a file system, a cache and an internal load balancer', () => {
    const { scene } = accessScene({ name: 'private-network' });
    expect(tagsOf(scene)).toEqual({
      files: 'limited: Only worker',
      cache: 'limited: Only worker',
      'internalApi--alb': 'limited: Anything in the VPC',
      // The load balancer is internal, so what it forwards to is not public.
      internalApi: 'limited: Only internalApi ALB',
      // A worker listens for nothing, and the tag says so.
      worker: 'closed: No inbound access'
    });
    expect(nodeOf(scene, 'worker').access?.detail).toBe(
      'Nothing can connect to it. No security group rule lets a connection in.'
    );
  });

  test('a collapsed role group is named as one source; expanded, its members are', () => {
    const collapsed = accessScene({ name: 'lambda-vpc' }).scene;
    const deck = collapsed.nodes.find((node) => node.memberCount)?.id as string;
    expect(tagsOf(collapsed)).toEqual({
      searchDomain: 'limited: Anything in the VPC',
      cache: 'limited: Only Functions'
    });
    expect(nodeOf(collapsed, 'cache').access?.sources).toEqual([deck]);
    expect(groupNamesOf(collapsed, deck)).toEqual(['VPC functions SG → cache', 'VPC functions SG']);

    const expanded = accessScene({ name: 'lambda-vpc', expand: true }).scene;
    expect(tagsOf(expanded).cache).toBe('limited: Only search, indexer');
  });

  test('batch jobs join their compute environment’s group; a NAT instance gets no tag', () => {
    const plain = accessScene({ name: 'batch-bastion-nat-instance', layers: ACCESS }).scene;
    expect(groupNamesOf(plain, 'importer')).toContain('Batch instances SG');
    // The bastion and the worker listen for connections and admit none. A batch job and an agent runtime are started
    // by AWS, so they get no tag.
    const tags = {
      db: 'limited: Only importer, agent',
      jumpHost: 'closed: No inbound access',
      privateWorker: 'closed: No inbound access'
    };
    expect(tagsOf(plain)).toEqual(tags);
    expect(nodeOf(plain, 'importer').untaggedNote).toContain('AWS starts it');
    expect(nodeOf(plain, 'agent').untaggedNote).toContain('AWS starts it');

    const withNetwork = accessScene({ name: 'batch-bastion-nat-instance' }).scene;
    expect(groupNamesOf(withNetwork, 'nat-gateway')).toEqual(['NAT instances SG']);
    expect(tagsOf(withNetwork)).toEqual(tags);
    // Its group is plumbing: it decides nothing about who reaches the node, and the layer says nothing about it.
    expect(nodeOf(withNetwork, 'nat-gateway').securityGroups?.[0]?.decides).toBe(false);
    expect(nodeOf(withNetwork, 'nat-gateway').untaggedNote).toBeUndefined();
  });

  test('Convex: each part has its own tag; drawn as one node, the service is public and not an open database', () => {
    const { scene } = accessScene({ name: 'convex' });
    expect(tagsOf(scene)).toEqual({
      'app--alb': 'public: Public',
      app: 'public: Public via app ALB',
      'app--dashboard': 'public: Public via app ALB',
      'app--db': 'limited: Only app'
    });
    expect(inboundOf(scene, 'app--dashboard')).toEqual(['Allows TCP 6791 from app ALB']);
    expect(inboundOf(scene, 'app')).toEqual(['Allows TCP 3210, 3211 from app ALB']);

    expect(tagsOf(accessScene({ name: 'convex', layers: ACCESS }).scene)).toEqual({ app: 'public: Public' });
  });

  test('whitelisted addresses are counted on the tag and listed with their ports in the panel', () => {
    const { scene } = accessScene({ name: 'alb-whitelisted-listeners' });
    // The user's connector reaches the load balancer, but its rules admit two addresses only.
    expect(tagsOf(scene)).toEqual({ edge: 'limited: Only 2 IP addresses' });
    expect(nodeOf(scene, 'edge').access?.detail).toBe('Only 2 IP addresses can connect to it.');
    expect(inboundOf(scene, 'edge')).toEqual([
      'Allows TCP 80 from 203.0.113.10/32',
      'Allows TCP 8080 from 198.51.100.20/32'
    ]);
  });
});

/** A node as it is without the Access layer. */
const withoutLayerFields = ({ access: _access, securityGroups: _groups, untaggedNote: _note, ...node }: IsoNode) =>
  node;

describe('the layer only adds tags', () => {
  for (const name of templateNames) {
    test(`${name}: nodes, connectors and zones are the picture without the layer`, () => {
      for (const expand of [false, true]) {
        for (const infrastructure of [false, true]) {
          const withLayer = accessScene({ name, expand, layers: { infrastructure, access: true } }).scene;
          const without = accessScene({ name, expand, layers: { infrastructure, access: false } }).scene;
          expect(withLayer.connectors).toEqual(without.connectors);
          expect(withLayer.rectangles).toEqual(without.rectangles);
          expect(withLayer.labels).toEqual(without.labels);
          expect(withLayer.nodes.map(withoutLayerFields)).toEqual(without.nodes);
          expect(without.nodes.some((node) => node.access || node.securityGroups)).toBe(false);
        }
      }
    });
  }
});

const tagBox = (text: string, tile: { x: number; y: number }): ProjectedBox => {
  const { u, v } = projectTile(tile);
  // A little inside the pill: touching edges are fine, covering is not.
  const halfWidth = (getAccessTagWidthPx(text) / 2 / 40) * 0.9;
  const halfHeight = (ACCESS_TAG_HEIGHT_PX / 2 / 20) * 0.9;
  return { u0: u - halfWidth, u1: u + halfWidth, v0: v - halfHeight, v1: v + halfHeight };
};

describe('legibility over every template', () => {
  for (const name of templateNames) {
    for (const [expand, layers] of [
      [false, ALL_LAYERS],
      [true, ALL_LAYERS],
      [false, ACCESS],
      [true, ACCESS]
    ] as const) {
      const variant = `${expand ? ' (expanded)' : ''}${layers.infrastructure ? '' : ' (without infrastructure)'}`;
      test(`${name}${variant}: a tag covers no other node, name, chip or tag, and stays by its node`, () => {
        const { model, scene } = accessScene({ name, expand, layers });
        const tagged = scene.nodes.filter((node) => node.access);
        const tags = tagged.map((node) => ({
          nodeId: node.id,
          box: tagBox(node.access?.text ?? '', node.access?.tile ?? node.tile)
        }));

        for (const tag of tags) {
          for (const node of scene.nodes) {
            if (node.id === tag.nodeId) continue;
            const layoutNode = model.layoutNodes.get(node.id);
            if (!layoutNode) continue;
            const { u, v } = projectTile(node.tile);
            for (const shape of nodeShapes(layoutNode)) {
              expect(boxOverlapArea({ a: tag.box, b: shiftBox({ box: shape, u, v }) })).toBeLessThan(0.05);
            }
          }
          for (const connector of scene.connectors) {
            if (!connector.label) continue;
            const size = measureChip(connector.label);
            const { u, v } = projectTile(connector.route.labelTile);
            const chip = {
              u0: u - size.halfWidth,
              u1: u + size.halfWidth,
              v0: v - size.halfHeight,
              v1: v + size.halfHeight
            };
            expect(boxOverlapArea({ a: tag.box, b: chip })).toBeLessThan(0.05);
          }
          for (const other of tags) {
            if (other !== tag) expect(boxOverlapArea({ a: tag.box, b: other.box })).toBe(0);
          }
        }

        // A tag stays by its node: just above it, or under its name, and never a body's width to the side.
        for (const node of tagged) {
          const home = projectTile(node.tile);
          const tag = projectTile(node.access?.tile ?? node.tile);
          expect(Math.abs(tag.v - home.v)).toBeLessThan(5);
          expect(Math.abs(tag.u - home.u)).toBeLessThan(3);
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

/** The tag of the one function a synthetic template gives these ingress rules. */
const tagFor = (ingress: Array<Record<string, unknown>>) => {
  const { config, input } = syntheticTemplate({
    functions: 1,
    groups: [{ id: 'Target', members: () => true, ingress }]
  });
  const model = buildDiagramModel({ parsedConfig: config as never });
  const scene = selectDiagramView({ model: model!, layers: ALL_LAYERS, security: buildSecurityGroupModel(input) });
  const { access } = nodeOf(scene, 'fn0');
  return access ? `${access.reach}: ${access.text}` : undefined;
};

const tcp = (port: number, source: Record<string, unknown>) => ({
  IpProtocol: 'tcp',
  FromPort: port,
  ToPort: port,
  ...source
});

describe('what the internet can reach', () => {
  test('an application port is public; an admin port, or every port, is a finding', () => {
    expect(tagFor([tcp(443, { CidrIp: '0.0.0.0/0' })])).toBe('public: Public');
    expect(tagFor([tcp(443, { CidrIp: '0.0.0.0/0' }), tcp(22, { CidrIpv6: '::/0' })])).toBe(
      'exposed: SSH open to the internet'
    );
    expect(tagFor([tcp(3389, { CidrIp: '0.0.0.0/0' })])).toBe('exposed: Remote desktop open to the internet');
    expect(tagFor([{ IpProtocol: '-1', CidrIp: '0.0.0.0/0' }])).toBe('exposed: All ports open to the internet');
    expect(tagFor([{ IpProtocol: 'tcp', FromPort: 0, ToPort: 65535, CidrIp: '0.0.0.0/0' }])).toBe(
      'exposed: All ports open to the internet'
    );
    // A range that happens to hold an admin port.
    expect(tagFor([{ IpProtocol: 'tcp', FromPort: 20, ToPort: 25, CidrIp: '0.0.0.0/0' }])).toBe(
      'exposed: SSH open to the internet'
    );
    // UDP 22 is not SSH.
    expect(tagFor([{ IpProtocol: 'udp', FromPort: 22, ToPort: 22, CidrIp: '0.0.0.0/0' }])).toBe('public: Public');
  });

  test('an admin port open to one address is not a finding', () => {
    expect(tagFor([tcp(22, { CidrIp: '203.0.113.10/32' })])).toBe('limited: Only 203.0.113.10');
  });

  test('ping from the internet is not a way in', () => {
    expect(tagFor([{ IpProtocol: 'icmp', FromPort: -1, ToPort: -1, CidrIp: '0.0.0.0/0' }])).toBeUndefined();
    expect(
      tagFor([
        { IpProtocol: 'icmp', FromPort: -1, ToPort: -1, CidrIp: '0.0.0.0/0' },
        tcp(443, { CidrIp: '10.9.0.0/16' })
      ])
    ).toBe('limited: Only 1 IP range');
  });

  test('a load balancer with an admin port open is a finding, and losing the rule clears it', () => {
    const withRule = (rules: Array<Record<string, unknown>>) => {
      const fixture = structuredClone(load('http-api-vpc-link'));
      const group = fixture.resources.AlbWebLbSecurityGroup.Properties;
      group.SecurityGroupIngress = rules.length > 0 ? [...group.SecurityGroupIngress, ...rules] : [];
      const model = buildDiagramModel({ parsedConfig: parse(fixture.config) })!;
      return selectDiagramView({ model, layers: ALL_LAYERS, security: buildSecurityGroupModel(fixture) });
    };
    expect(tagsOf(withRule([tcp(22, { CidrIpv6: '::/0' })]))['albWeb--alb']).toBe('exposed: SSH open to the internet');
    // With no rule left nothing reaches the balancer, though the picture still draws the user's connector to it.
    const closed = withRule([]);
    expect(inboundOf(closed, 'albWeb--alb')).toEqual([]);
    expect(tagsOf(closed)['albWeb--alb']).toBe('closed: No inbound access');
    // And what it forwards to is no longer public.
    expect(tagsOf(closed).albWeb).toBe('limited: Only albWeb ALB');
    // The HTTP API has no group of its own, so the connector is what says it is public.
    expect(tagsOf(closed).api).toBe('public: Public');
  });
});

/** The database-accessibility template after `change`, drawn with these layers. */
const changedDatabases = (change: (resources: Record<string, any>) => void, layers: DiagramLayers = ALL_LAYERS) => {
  const fixture = structuredClone(load('database-accessibility'));
  change(fixture.resources);
  const model = buildDiagramModel({ parsedConfig: parse(fixture.config) })!;
  return selectDiagramView({ model, layers, security: buildSecurityGroupModel(fixture) });
};

/** What the config of one resource of this type is told to change to close it. */
const fixes = (type: string, properties: Record<string, unknown> = {}) =>
  buildDiagramTopology({ parsedConfig: { resources: { store: { type, properties } } } as never })?.nodes.find(
    (node) => node.id === 'store'
  )?.accessFix;

describe('tags never claim more than the template says', () => {
  test('a service drawn with its public gateway is public, whatever else its own group admits', () => {
    const admitOffice = (resources: Record<string, any>) =>
      resources.WebSecurityGroup.Properties.SecurityGroupIngress.push(tcp(3000, { CidrIp: '203.0.113.10/32' }));
    // An "Only web GW + 203.0.113.10" here would hide that the gateway lets the whole internet in.
    expect(tagsOf(changedDatabases(admitOffice)).web).toBe('public: Public via web GW');
    // Without the Infrastructure layer the gateway is part of the node, and the internet reaches the gateway.
    expect(tagsOf(changedDatabases(admitOffice, ACCESS)).web).toBe('public: Public');
  });

  test('a service is public through a load balancer only while the internet reaches that load balancer', () => {
    const whitelisted = accessScene({ name: 'alb-whitelisted-listeners' }).scene;
    expect(tagsOf(whitelisted).edge).toBe('limited: Only 2 IP addresses');
    for (const node of whitelisted.nodes) expect(node.access?.reach).not.toBe('public');
    // An internal load balancer is not a way in from the internet either.
    expect(tagsOf(accessScene({ name: 'private-network' }).scene).internalApi).toBe('limited: Only internalApi ALB');
  });

  test('"no inbound access" is said only of what listens for connections', () => {
    for (const name of templateNames) {
      const fixture = load(name);
      const { scene } = accessScene({ name, expand: true });
      for (const node of scene.nodes) {
        if (node.access?.reach !== 'closed') continue;
        const type = parse(fixture.config).resources[node.id.split('--')[0]]?.type;
        expect(['function', 'batch-job', 'agentcore-runtime', 'nextjs-web']).not.toContain(type);
        expect(node.securityGroups?.some((group) => group.decides)).toBe(true);
      }
    }
  });

  test('a group defined outside the stack beside a known one rules out "only"', () => {
    const scene = changedDatabases((resources) =>
      resources.ScopedDbDbInstance.Properties.VPCSecurityGroups.push('sg-0outside')
    );
    expect(tagsOf(scene).scopedDb).toBe('unknown: Access unknown');
    expect(groupNamesOf(scene, 'scopedDb')).toEqual(['scopedDb SG', 'external sg-0outside']);
    // What the template does show still counts: a database it opens to the internet is open.
    const open = changedDatabases((resources) =>
      resources.PublicDbDbInstance.Properties.VPCSecurityGroups.push('sg-0outside')
    );
    expect(tagsOf(open).publicDb).toBe('exposed: Open to the internet');
  });

  test('a gateway is a way in only to what the picture draws it forwarding to', () => {
    // The database's group lets the gateway's VPC Link in, but no route of the gateway targets the database.
    const scene = changedDatabases((resources) => {
      resources.ScopedDbSecurityGroup.Properties.SecurityGroupIngress = [
        tcp(5432, { SourceSecurityGroupId: { Ref: 'WebVpcLinkSecurityGroup' } })
      ];
    });
    expect(tagsOf(scene).scopedDb).toBe('limited: Only web GW');
    expect(tagsOf(scene).web).toBe('public: Public via web GW');
  });

  test('a service is not public through a load balancer that is public only when the service does not admit it', () => {
    const withBranches = (targetBranch: 'same' | 'other') => {
      const fixture = structuredClone(load('http-api-vpc-link'));
      const balancer = fixture.resources.AlbWebLbSecurityGroup.Properties;
      balancer.SecurityGroupIngress = { 'Fn::If': ['Public', balancer.SecurityGroupIngress, []] };
      const service = fixture.resources.AlbWebSecurityGroup.Properties;
      service.SecurityGroupIngress = {
        'Fn::If':
          targetBranch === 'same'
            ? ['Public', service.SecurityGroupIngress, []]
            : ['Public', [], service.SecurityGroupIngress]
      };
      const model = buildDiagramModel({ parsedConfig: parse(fixture.config) })!;
      return tagsOf(selectDiagramView({ model, layers: ALL_LAYERS, security: buildSecurityGroupModel(fixture) }));
    };
    expect(withBranches('same').albWeb).toBe('public: Public via albWeb ALB');
    // The balancer admits the internet only when Public holds, and the service admits the balancer only when it
    // does not: no value of the condition lets the internet through to the service.
    expect(withBranches('other')['albWeb--alb']).toBe('public: Public');
    expect(withBranches('other').albWeb).toBe('limited: Only albWeb ALB');
  });

  test('a service whose group admits only itself is not called closed', () => {
    const fixture = structuredClone(load('private-network'));
    fixture.resources.WorkerSelfIngress = {
      Type: 'AWS::EC2::SecurityGroupIngress',
      Properties: {
        GroupId: { Ref: 'WorkerSecurityGroup' },
        SourceSecurityGroupId: { Ref: 'WorkerSecurityGroup' },
        ...tcp(3000, {})
      }
    };
    const model = buildDiagramModel({ parsedConfig: parse(fixture.config) })!;
    const scene = selectDiagramView({ model, layers: ALL_LAYERS, security: buildSecurityGroupModel(fixture) });
    expect(tagsOf(scene).worker).toBe('limited: Only itself');
    expect(nodeOf(scene, 'worker').access?.detail).toBe(
      'Only its own tasks or nodes can connect to each other. Nothing else can connect to it.'
    );
  });

  test('an address range set at deploy time may be the internet, so access is unknown', () => {
    const scene = changedDatabases((resources) => {
      resources.ScopedDbSecurityGroup.Properties.SecurityGroupIngress = [tcp(5432, { CidrIp: { Ref: 'AllowedCidr' } })];
      resources.PublicDbSecurityGroup.Properties.SecurityGroupIngress = [];
    });
    expect(tagsOf(scene).scopedDb).toBe('unknown: Access unknown');
    expect(nodeOf(scene, 'scopedDb').access?.detail).toContain('a value set at deploy time');
    // Nothing is known to be open, and the picture must not say that nothing is.
    expect(scene.nodes.some((node) => node.access?.reach === 'exposed')).toBe(false);
    expect(tagsOf(scene).publicDb).toBe('closed: No inbound access');
  });

  test('only what AWS permissions protect is said to be protected by them', () => {
    const fixture = load('database-accessibility');
    const parsedConfig = parse(fixture.config);
    parsedConfig.resources.files = { type: 'bucket' };
    parsedConfig.resources.kv = { type: 'upstash-redis', properties: {} };
    parsedConfig.resources.users = { type: 'user-auth-pool' };
    const model = buildDiagramModel({ parsedConfig })!;
    const scene = selectDiagramView({ model, layers: ALL_LAYERS, security: buildSecurityGroupModel(fixture) });
    expect(nodeOf(scene, 'files').untaggedNote).toContain('AWS permissions (IAM) decide who can use it');
    // Upstash is protected by its own password, and a user pool's sign-in is public: neither is IAM's.
    expect(nodeOf(scene, 'kv').untaggedNote).toBeUndefined();
    expect(nodeOf(scene, 'kv').accessNote).toBe(
      'Reached over the internet. Its password or token protects it, not a security group.'
    );
    expect(nodeOf(scene, 'users').untaggedNote).toBeUndefined();
  });

  test('the config fix is offered only where the setting can be changed in place', () => {
    expect(fixes('relational-database')).toContain('accessibility.accessibilityMode');
    expect(fixes('relational-database', { accessibility: { accessibilityMode: 'vpc' } })).toBeUndefined();
    // An OpenSearch domain cannot move between the internet and the VPC after it is created.
    expect(fixes('open-search-domain')).toBeUndefined();
  });

  test('a rule in one branch of a condition does not apply to a member in the other', () => {
    const branches = (ruleBranch: 'same' | 'other') => {
      const open = tcp(443, { CidrIp: '0.0.0.0/0' });
      const { config, input } = syntheticTemplate({
        functions: 1,
        groups: [
          { id: 'Closed', members: () => false, ingress: [tcp(443, { CidrIp: '10.9.0.0/16' })] },
          { id: 'Open', members: () => false, ingress: [] }
        ]
      });
      const resources = input.resources as Record<string, any>;
      resources.Open.Properties.SecurityGroupIngress = {
        'Fn::If': ['UseOpen', ruleBranch === 'same' ? [open] : [], ruleBranch === 'same' ? [] : [open]]
      };
      resources.Fn0Function.Properties.VpcConfig.SecurityGroupIds = {
        'Fn::If': ['UseOpen', [{ Ref: 'Open' }], [{ Ref: 'Closed' }]]
      };
      const model = buildDiagramModel({ parsedConfig: config as never })!;
      const scene = selectDiagramView({ model, layers: ALL_LAYERS, security: buildSecurityGroupModel(input) });
      return tagsOf(scene).fn0;
    };
    // The function carries Open only when UseOpen holds, and Open admits the internet only when it does not.
    expect(branches('other')).toBe('limited: Only 1 IP range');
    // In the same branch the rule can apply. The condition's value is not in the template, so it counts.
    expect(branches('same')).toBe('public: Public');
  });

  test('a protocol without ports open to the internet is not "all ports"', () => {
    expect(tagFor([{ IpProtocol: '47', CidrIp: '0.0.0.0/0' }])).toBe('public: Public');
    expect(tagFor([{ IpProtocol: 'udp', FromPort: 0, ToPort: 65535, CidrIp: '0.0.0.0/0' }])).toBe(
      'exposed: All ports open to the internet'
    );
  });
});

describe('words that fit a tag', () => {
  test('a tag is at least as wide as its text is in the browser', () => {
    // The 10.5 px bold text of each tag, measured in Chromium with Montserrat loaded.
    const measured: Record<string, number> = {
      'Public via web GW': 109,
      'Anything in the VPC': 119,
      'Only web + 203.0.113.10': 130,
      'Open to the internet': 121,
      'No inbound access': 112,
      'Access unknown': 100,
      'Only 2 IP addresses': 114,
      'Public via tcpWeb NLB': 134,
      'Remote desktop open to the internet': 219,
      'Only mmmmmm, WWWWWW': 186
    };
    // 31 px of every tag are its icon and padding.
    for (const [text, width] of Object.entries(measured)) {
      expect(getAccessTagWidthPx(text) - 31).toBeGreaterThanOrEqual(width);
    }
  });

  test('a forwarder with a long name is called by what it is', () => {
    const fixture = structuredClone(load('http-api-vpc-link'));
    fixture.config = fixture.config.replaceAll('albWeb', 'customerOrdersBackofficeWeb');
    fixture.resources = JSON.parse(
      JSON.stringify(fixture.resources).replaceAll('AlbWeb', 'CustomerOrdersBackofficeWeb')
    );
    fixture.stacktapeResources = JSON.parse(
      JSON.stringify(fixture.stacktapeResources)
        .replaceAll('albWeb', 'customerOrdersBackofficeWeb')
        .replaceAll('AlbWeb', 'CustomerOrdersBackofficeWeb')
    );
    const model = buildDiagramModel({ parsedConfig: parse(fixture.config) })!;
    const scene = selectDiagramView({ model, layers: ALL_LAYERS, security: buildSecurityGroupModel(fixture) });
    const { access } = nodeOf(scene, 'customerOrdersBackofficeWeb');
    expect(access?.text).toBe('Public via its load balancer');
    // The sentence has room for the name.
    expect(access?.detail).toBe('Anyone on the internet can reach it through customerOrdersBackofficeWeb ALB.');
  });

  test('one address is named, several are counted, and ranges are called ranges', () => {
    expect(tagFor([tcp(443, { CidrIp: '203.0.113.10/32' })])).toBe('limited: Only 203.0.113.10');
    expect(tagFor([tcp(443, { CidrIp: '203.0.113.10/32' }), tcp(8080, { CidrIp: '203.0.113.11/32' })])).toBe(
      'limited: Only 2 IP addresses'
    );
    expect(tagFor([tcp(443, { CidrIp: '203.0.113.0/24' })])).toBe('limited: Only 1 IP range');
    expect(tagFor([tcp(443, { CidrIp: '203.0.113.0/24' }), tcp(443, { CidrIp: '198.51.100.7/32' })])).toBe(
      'limited: Only 2 IP ranges'
    );
    expect(tagFor([tcp(443, { SourcePrefixListId: 'pl-0123456789' })])).toBe('limited: Only 1 IP range');
  });

  test('more than two resources, or names too long for a tag, are counted', () => {
    const scene = (names: number, tail: Array<Record<string, unknown>> = []) => {
      const { config, input } = syntheticTemplate({
        functions: names + 1,
        groups: [
          ...Array.from({ length: names }, (_, index) => ({
            id: `Caller${index}`,
            members: (member: number) => member === index,
            ingress: []
          })),
          {
            id: 'Target',
            members: (member: number) => member === names,
            ingress: [
              ...Array.from({ length: names }, (_, index) =>
                tcp(443, { SourceSecurityGroupId: { Ref: `Caller${index}` } })
              ),
              ...tail
            ]
          }
        ]
      });
      const topology = buildDiagramTopology({ parsedConfig: config as never });
      const expandedGroups = new Set(findRoleGroups({ topology: topology! }).map((group) => group.id));
      const model = buildDiagramModel({ parsedConfig: config as never, expandedGroups })!;
      return selectDiagramView({ model, layers: ALL_LAYERS, security: buildSecurityGroupModel(input) });
    };
    expect(tagsOf(scene(2)).fn2).toBe('limited: Only fn0, fn1');
    expect(tagsOf(scene(3)).fn3).toBe('limited: Only 3 resources');
    // Naming the address as well would not fit, so both are counted.
    expect(tagsOf(scene(3, [tcp(443, { CidrIp: '203.0.113.10/32' })])).fn3).toBe(
      'limited: Only 3 resources + 1 IP address'
    );
    for (const text of Object.values(tagsOf(scene(3, [tcp(443, { CidrIp: '203.0.113.0/24' })])))) {
      expect(text.replace(/^\w+: /, '').length).toBeLessThanOrEqual(30);
    }
  });
});

describe('bounded work', () => {
  test('300 functions in two groups, one rule between them: every picture in well under two seconds', () => {
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
    const scenes = COMBINATIONS.map((layers) => selectDiagramView({ model, layers, security }));
    const elapsed = performance.now() - started;

    expect(frame?.nodeTiles).toHaveLength(300);
    const everything = scenes[3];
    expect(everything.nodes).toHaveLength(300);
    const tagged = everything.nodes.filter((node) => node.access);
    expect(tagged).toHaveLength(150);
    expect(new Set(tagged.map((node) => node.access?.text))).toEqual(new Set(['Only 150 resources']));
    expect(elapsed).toBeLessThan(2000);
  });
});

describe('the frame', () => {
  for (const name of templateNames) {
    test(`${name}: holds every tag, with or without the Infrastructure layer`, () => {
      const fixture = load(name);
      const model = buildDiagramModel({ parsedConfig: parse(fixture.config) })!;
      const security = buildSecurityGroupModel(fixture);
      const chips = new Set(
        (diagramFrame({ model, security })?.chips ?? []).map(({ tile, text }) => `${text}@${tile.x},${tile.y}`)
      );
      for (const layers of [ACCESS, ALL_LAYERS]) {
        for (const node of selectDiagramView({ model, layers, security }).nodes) {
          if (node.access)
            expect(chips.has(`${node.access.text}@${node.access.tile.x},${node.access.tile.y}`)).toBe(true);
        }
      }
    });
  }
});
