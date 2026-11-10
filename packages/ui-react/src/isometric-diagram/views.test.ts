import type { IsoScene } from './scene.js';
import type { DiagramLayers } from './views.js';
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { getDiagramFixtures, getFixtureById, parseFixtureConfig } from './fixture-scenes.js';
import { findRoleGroups } from './grouping.js';
import { buildDiagramModel, diagramFrame, selectDiagramView } from './scene-builder.js';
import { buildSecurityGroupModel } from './security-groups.js';
import { buildDiagramTopology } from './topology.js';
import { ALL_LAYERS, hasInfrastructure, NO_LAYERS } from './views.js';

/**
 * The layer model: which nodes, connectors and zones the picture shows with and without each layer, and the rule that
 * a node keeps its place whichever layers are on.
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

const modelFor = (id: string) => {
  const model = buildDiagramModel({ parsedConfig: parseFixtureConfig({ fixture: getFixtureById({ id }) }) });
  if (!model) throw new Error(`No model for ${id}`);
  return model;
};

const sceneFor = ({ id, layers }: { id: string; layers: DiagramLayers }) =>
  selectDiagramView({ model: modelFor(id), layers });

const INFRASTRUCTURE: DiagramLayers = { infrastructure: true, access: false };
const ACCESS: DiagramLayers = { infrastructure: false, access: true };
const COMBINATIONS = [NO_LAYERS, INFRASTRUCTURE, ACCESS, ALL_LAYERS];

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

describe('without layers', () => {
  test('shows declared resources and their flow, without zones, NAT or outbound pipes', () => {
    for (const fixture of getDiagramFixtures()) {
      const scene = sceneFor({ id: fixture.id, layers: NO_LAYERS });
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
    const full = sceneFor({ id: 'web-service-rds', layers: ALL_LAYERS });
    const scene = sceneFor({ id: 'web-service-rds', layers: NO_LAYERS });
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
    const scene = sceneFor({ id: 'nextjs-hosting', layers: NO_LAYERS });
    expect(nodeIds(scene)).not.toContain('web--server');
    expect(nodeIds(scene)).not.toContain('web--assets');
    expect(
      scene.connectors.filter((candidate) => candidate.from === 'web' && candidate.semantic === 'dependency')
    ).not.toEqual([]);
  });

  test('keeps connectTo access and connector labels, which no layer hides', () => {
    for (const layers of COMBINATIONS) {
      const scene = sceneFor({ id: 'full-stack', layers });
      expect(scene.connectors.some((candidate) => candidate.semantic === 'dependency')).toBe(true);
      expect(scene.connectors.some((candidate) => candidate.label)).toBe(true);
    }
  });

  test('keeps a public data store and its badge whatever else is hidden', () => {
    for (const fixture of getDiagramFixtures()) {
      const full = sceneFor({ id: fixture.id, layers: INFRASTRUCTURE });
      const publicIds = full.nodes.filter((node) => node.isPublic).map((node) => node.id);
      for (const layers of COMBINATIONS) {
        const scene = sceneFor({ id: fixture.id, layers });
        expect(scene.nodes.filter((node) => node.isPublic).map((node) => node.id)).toEqual(publicIds);
      }
    }
  });
});

describe('infrastructure layer', () => {
  test('shows what Stacktape creates, the VPC, subnet tiers, NAT and outbound traffic', () => {
    const scene = sceneFor({ id: 'private-subnets', layers: INFRASTRUCTURE });
    expect(scene.rectangles.map((rectangle) => rectangle.id)).toEqual(
      expect.arrayContaining(['vpc', 'subnet-public', 'subnet-private'])
    );
    expect(nodeIds(scene)).toContain('nat-gateway');
    expect(scene.connectors.some((candidate) => candidate.semantic === 'egress')).toBe(true);
    expect(nodeIds(sceneFor({ id: 'web-service-rds', layers: INFRASTRUCTURE }))).toContain('webApp--gw');
  });

  test('marks whether a load balancer faces the internet and names VPC Links', () => {
    const shared = sceneFor({ id: 'shared-alb-platform', layers: INFRASTRUCTURE });
    expect(shared.nodes.find((node) => node.resourceType === 'application-load-balancer')?.exposure).toBe(
      'internet-facing'
    );
    expect(connector(sceneFor({ id: 'full-stack', layers: INFRASTRUCTURE }), 'webApp--gw', 'webApp')?.label).toBe(
      'VPC Link'
    );
  });

  test('internal load balancers, declared or a private service’s, are marked internal', () => {
    for (const [template, id] of [
      ['shared-network-stage', 'internalLb'],
      ['private-network', 'internalApi--alb']
    ]) {
      const fixture = JSON.parse(readFileSync(new URL(`${template}.json`, templateDirectory), 'utf8'));
      const model = buildDiagramModel({ parsedConfig: parse(fixture.config) });
      const scene = selectDiagramView({ model: model!, layers: INFRASTRUCTURE });
      expect(scene.nodes.find((node) => node.id === id)?.exposure).toBe('internal');
    }
  });

  test('has something to add only where Stacktape creates infrastructure', () => {
    // Functions, an HTTP API, queues and tables: nothing sits under the configuration.
    expect(hasInfrastructure(modelFor('serverless-routes'))).toBe(false);
    expect(sceneFor({ id: 'serverless-routes', layers: INFRASTRUCTURE })).toEqual(
      sceneFor({ id: 'serverless-routes', layers: NO_LAYERS })
    );
    for (const id of ['web-service-rds', 'private-subnets', 'nextjs-hosting', 'full-stack']) {
      expect(hasInfrastructure(modelFor(id))).toBe(true);
    }
    // Whenever the layer changes the picture, it is offered.
    for (const fixture of getDiagramFixtures()) {
      const model = modelFor(fixture.id);
      const changes =
        JSON.stringify(selectDiagramView({ model, layers: INFRASTRUCTURE })) !==
        JSON.stringify(selectDiagramView({ model, layers: NO_LAYERS }));
      expect(hasInfrastructure(model)).toBe(changes);
    }
  });
});

describe('access layer', () => {
  test('adds nothing without a deployed stage’s security groups', () => {
    for (const id of ['secured-apis', 'full-stack']) {
      expect(sceneFor({ id, layers: ACCESS })).toEqual(sceneFor({ id, layers: NO_LAYERS }));
    }
  });

  test('draws the deployed stage’s groups and fades the request flow behind them', () => {
    const fixture = JSON.parse(readFileSync(new URL('database-accessibility.json', templateDirectory), 'utf8'));
    const model = buildDiagramModel({ parsedConfig: parse(fixture.config) });
    const security = buildSecurityGroupModel(fixture);
    for (const layers of [ACCESS, ALL_LAYERS]) {
      const scene = selectDiagramView({ model: model!, layers, security });
      expect(scene.securityGroups?.length).toBeGreaterThan(0);
      for (const edge of scene.connectors.filter((candidate) => candidate.semantic === 'request')) {
        expect(edge.muted).toBe(true);
      }
      for (const edge of scene.connectors.filter((candidate) => candidate.semantic === 'dependency')) {
        expect(edge.muted).toBeFalsy();
      }
      // The VPC is the Infrastructure layer's, with or without access rules over it.
      expect(scene.rectangles.length > 0).toBe(layers.infrastructure);
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
      test(`a node keeps its place whichever layers are on: ${id}${suffix}`, () => {
        // Status lines are reserved in the one layout every picture selects from, so statuses show under every layer.
        const model = buildDiagramModel({ parsedConfig: config, expandedGroups, statusLines });
        if (!model) throw new Error(`No model for ${id}`);
        const scenes = COMBINATIONS.map((layers) => selectDiagramView({ model, layers, security }));
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
        // The frame the renderer fits covers every combination's nodes.
        const frame = diagramFrame({ model, security });
        for (const tile of tiles.values()) expect(frame?.nodeTiles).toContainEqual(tile);
      });
    }
  }
});
