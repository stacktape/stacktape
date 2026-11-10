import type { IsoScene } from './scene.js';
import type { DiagramOverlays } from './views.js';
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { getDiagramFixtures, getFixtureById, parseFixtureConfig } from './fixture-scenes.js';
import { findRoleGroups } from './grouping.js';
import { buildDiagramModel, diagramFrame, selectDiagramView } from './scene-builder.js';
import { buildSecurityGroupModel } from './security-groups.js';
import { buildDiagramTopology } from './topology.js';
import { ALL_OVERLAYS, DIAGRAM_VIEWS, presetOf, VIEW_PRESETS } from './views.js';

/**
 * The view model: which nodes, connectors and zones each preset and overlay shows, and the rule that a node keeps its
 * place in every view that shows it.
 */

const configDirectory = new URL('./test-configs/', import.meta.url);
const templateDirectory = new URL('./generated/security-group-templates/', import.meta.url);
const configs = [
  ...getDiagramFixtures().map((fixture) => ({
    id: fixture.id,
    config: parseFixtureConfig({ fixture }),
    security: null
  })),
  ...readdirSync(configDirectory)
    .filter((file) => file.endsWith('.yml'))
    .map((file) => ({
      id: file.replace(/\.yml$/, ''),
      config: parse(readFileSync(new URL(file, configDirectory), 'utf8')),
      security: null
    })),
  // The synthesized templates' configs, with their security groups.
  ...readdirSync(templateDirectory)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const fixture = JSON.parse(readFileSync(new URL(file, templateDirectory), 'utf8'));
      return {
        id: `template ${file.replace(/\.json$/, '')}`,
        config: parse(fixture.config),
        security: buildSecurityGroupModel(fixture)
      };
    })
];

const sceneFor = ({ id, overlays }: { id: string; overlays: DiagramOverlays }) => {
  const model = buildDiagramModel({ parsedConfig: parseFixtureConfig({ fixture: getFixtureById({ id }) }) });
  if (!model) throw new Error(`No model for ${id}`);
  return selectDiagramView({ model, overlays });
};

/** Whether a route's segments pass through a point. */
const passesThrough = (points: { x: number; y: number }[], point: { x: number; y: number }) =>
  points.slice(1).some((end, index) => {
    const start = points[index];
    const cross = (end.x - start.x) * (point.y - start.y) - (end.y - start.y) * (point.x - start.x);
    const within =
      point.x >= Math.min(start.x, end.x) - 1e-9 &&
      point.x <= Math.max(start.x, end.x) + 1e-9 &&
      point.y >= Math.min(start.y, end.y) - 1e-9 &&
      point.y <= Math.max(start.y, end.y) + 1e-9;
    return Math.abs(cross) < 1e-9 && within;
  });

const nodeIds = (scene: IsoScene) => scene.nodes.map((node) => node.id);
const connector = (scene: IsoScene, from: string, to: string) =>
  scene.connectors.find((candidate) => candidate.from === from && candidate.to === to);

const allGroups = (config: unknown) => {
  const topology = buildDiagramTopology({ parsedConfig: config as never });
  return new Set(topology ? findRoleGroups({ topology }).map((group) => group.id) : []);
};

const CUSTOM: DiagramOverlays = {
  createdResources: false,
  network: true,
  securityGroups: true,
  permissions: false,
  labels: false
};

describe('presets', () => {
  test('each preset is recognised, and any other combination is custom', () => {
    for (const view of DIAGRAM_VIEWS) expect(presetOf(VIEW_PRESETS[view])).toBe(view);
    expect(presetOf({ ...VIEW_PRESETS.application, labels: false })).toBeUndefined();
    expect(presetOf(ALL_OVERLAYS)).toBeUndefined();
  });
});

describe('application view', () => {
  test('shows declared resources and their flow, without zones, NAT or outbound pipes', () => {
    for (const fixture of getDiagramFixtures()) {
      const scene = sceneFor({ id: fixture.id, overlays: VIEW_PRESETS.application });
      expect(scene.rectangles).toEqual([]);
      expect(scene.labels).toEqual([]);
      expect(nodeIds(scene)).not.toContain('nat-gateway');
      expect(scene.connectors.filter((candidate) => candidate.semantic === 'egress')).toEqual([]);
      // Only the schedule and an implicit data store open to the internet stay among the implicit nodes.
      for (const node of scene.nodes.filter((candidate) => candidate.isImplicit)) {
        expect(node.resourceType === 'schedule' || node.isPublic).toBe(true);
      }
      expect(scene.nodes.some((node) => node.exposure)).toBe(false);
    }
  });

  test('a web service’s own gateway folds into it, and the user’s connector runs through the gateway’s spot', () => {
    const full = sceneFor({ id: 'web-service-rds', overlays: ALL_OVERLAYS });
    const scene = sceneFor({ id: 'web-service-rds', overlays: VIEW_PRESETS.application });
    const gateway = full.nodes.find((node) => node.id === 'webApp--gw');
    expect(gateway).toBeDefined();
    const folded = connector(scene, 'user', 'webApp');
    expect(folded?.label).toBe('HTTPS');
    expect(passesThrough(folded?.route.points ?? [], gateway?.tile as { x: number; y: number })).toBe(true);
    expect(folded?.route.points.at(0)).toEqual(full.nodes.find((node) => node.id === 'user')?.tile);
    expect(folded?.route.points.at(-1)).toEqual(full.nodes.find((node) => node.id === 'webApp')?.tile);
    // The service's panel names the user, not the hidden gateway.
    const webApp = scene.nodes.find((node) => node.id === 'webApp');
    expect(webApp?.connections).toContainEqual(expect.objectContaining({ direction: 'in', nodeId: 'user' }));
    expect(webApp?.connections.some((connection) => connection.nodeId.includes('--'))).toBe(false);
  });

  test('an SSR site keeps the access its hidden server function has', () => {
    const scene = sceneFor({ id: 'nextjs-hosting', overlays: VIEW_PRESETS.application });
    expect(nodeIds(scene)).not.toContain('web--server');
    expect(nodeIds(scene)).not.toContain('web--assets');
    expect(
      scene.connectors.filter((candidate) => candidate.from === 'web' && candidate.semantic === 'dependency')
    ).not.toEqual([]);
  });

  test('keeps a public data store and its badge whatever else it hides', () => {
    for (const fixture of getDiagramFixtures()) {
      const network = sceneFor({ id: fixture.id, overlays: VIEW_PRESETS.network });
      const publicIds = network.nodes.filter((node) => node.isPublic).map((node) => node.id);
      for (const view of DIAGRAM_VIEWS) {
        const scene = sceneFor({ id: fixture.id, overlays: VIEW_PRESETS[view] });
        expect(scene.nodes.filter((node) => node.isPublic).map((node) => node.id)).toEqual(publicIds);
      }
    }
  });
});

describe('network view', () => {
  test('shows the VPC, subnet tiers, NAT and outbound traffic', () => {
    const scene = sceneFor({ id: 'private-subnets', overlays: VIEW_PRESETS.network });
    expect(scene.rectangles.map((rectangle) => rectangle.id)).toEqual(
      expect.arrayContaining(['vpc', 'subnet-public', 'subnet-private'])
    );
    expect(nodeIds(scene)).toContain('nat-gateway');
    expect(scene.connectors.some((candidate) => candidate.semantic === 'egress')).toBe(true);
  });

  test('marks whether a load balancer faces the internet and names VPC Links', () => {
    const shared = sceneFor({ id: 'shared-alb-platform', overlays: VIEW_PRESETS.network });
    expect(shared.nodes.find((node) => node.resourceType === 'application-load-balancer')?.exposure).toBe(
      'internet-facing'
    );
    const full = sceneFor({ id: 'full-stack', overlays: VIEW_PRESETS.network });
    expect(connector(full, 'webApp--gw', 'webApp')?.label).toBe('VPC Link');
    // The label is the Network view's: the Security view, which shows the gateway too, does not carry it.
    expect(
      connector(sceneFor({ id: 'full-stack', overlays: VIEW_PRESETS.security }), 'webApp--gw', 'webApp')?.label
    ).toBeUndefined();
  });

  test('internal load balancers, declared or a private service’s, are marked internal', () => {
    for (const [template, id] of [
      ['shared-network-stage', 'internalLb'],
      ['private-network', 'internalApi--alb']
    ]) {
      const fixture = JSON.parse(readFileSync(new URL(`${template}.json`, templateDirectory), 'utf8'));
      const model = buildDiagramModel({ parsedConfig: parse(fixture.config) });
      const scene = selectDiagramView({ model: model!, overlays: VIEW_PRESETS.network });
      expect(scene.nodes.find((node) => node.id === id)?.exposure).toBe('internal');
    }
  });
});

describe('security view without a deployment', () => {
  test('keeps firewalls, authorizers and connectTo access prominent and fades the request flow', () => {
    const scene = sceneFor({ id: 'secured-apis', overlays: VIEW_PRESETS.security });
    expect(scene.securityGroups).toBeUndefined();
    const security = scene.connectors.filter((candidate) => candidate.semantic === 'security');
    expect(security.length).toBeGreaterThan(0);
    for (const edge of security) expect(edge.muted).toBeFalsy();
    for (const edge of scene.connectors.filter((candidate) => candidate.semantic === 'request')) {
      expect(edge.muted).toBe(true);
    }
    expect(scene.rectangles).toEqual([]);
  });
});

describe('overlays', () => {
  test('permissions and labels switch connectTo connectors and connector labels', () => {
    const scene = sceneFor({
      id: 'full-stack',
      overlays: { ...VIEW_PRESETS.network, permissions: false, labels: false }
    });
    expect(scene.connectors.filter((candidate) => candidate.semantic === 'dependency')).toEqual([]);
    expect(scene.connectors.filter((candidate) => candidate.label)).toEqual([]);
    for (const node of scene.nodes) {
      expect(node.connections.filter((connection) => connection.semantic === 'dependency')).toEqual([]);
    }
  });
});

describe('stable positions', () => {
  for (const { id, config, security } of configs) {
    for (const [expanded, statusLines] of [
      [false, false],
      [true, false],
      [false, true]
    ] as const) {
      const expandedGroups = expanded ? allGroups(config) : new Set<string>();
      if (expanded && expandedGroups.size === 0) continue;
      const suffix = `${expanded ? ' (expanded)' : ''}${statusLines ? ' (with status lines)' : ''}`;
      test(`a node keeps its place in every view that shows it: ${id}${suffix}`, () => {
        // Status lines are reserved in the one layout every view selects from, so statuses show in every view too.
        const model = buildDiagramModel({ parsedConfig: config, expandedGroups, statusLines });
        if (!model) throw new Error(`No model for ${id}`);
        const combinations = [...DIAGRAM_VIEWS.map((view) => VIEW_PRESETS[view]), CUSTOM, ALL_OVERLAYS];
        const scenes = combinations.map((overlays) => selectDiagramView({ model, overlays, security }));
        const tiles = new Map<string, { x: number; y: number }>();
        for (const scene of scenes) {
          for (const node of scene.nodes) {
            const seen = tiles.get(node.id);
            if (!seen) tiles.set(node.id, node.tile);
            else {
              expect(Math.abs(node.tile.x - seen.x)).toBeLessThan(1e-9);
              expect(Math.abs(node.tile.y - seen.y)).toBeLessThan(1e-9);
            }
          }
          // Every connector still starts and ends at the nodes it names.
          const byId = new Map(scene.nodes.map((node) => [node.id, node]));
          for (const edge of scene.connectors) {
            expect(edge.route.points.at(0)).toEqual(byId.get(edge.from)?.tile);
            expect(edge.route.points.at(-1)).toEqual(byId.get(edge.to)?.tile);
          }
        }
        // The frame the renderer fits covers every view's nodes.
        const frame = diagramFrame({ model, security });
        for (const tile of tiles.values()) expect(frame?.nodeTiles).toContainEqual(tile);
      });
    }
  }
});
