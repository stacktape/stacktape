import type { IsoConnector, IsoLabel, IsoNode, IsoScene, IsoTilePoint } from '../scene.js';
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { getDiagramFixtures, parseFixtureConfig } from '../fixture-scenes.js';
import { findRoleGroups } from '../grouping.js';
import { BADGE_HEIGHT_PX, BADGE_OFFSET_PX, hasBadge, SHAPE_HEIGHT_PX } from '../node-appearance.js';
import { buildIsometricScene } from '../scene-builder.js';
import { buildDiagramTopology } from '../topology.js';
import { assignFlowColumns } from './columns.js';
import { layoutDiagram } from './diagram-layout.js';
import { solveDifferenceConstraints } from './network-simplex.js';

/**
 * Semantic layout checks over every fixture and the larger review configs. They assert what a reader
 * relies on — flow direction, zone membership, unobstructed connectors and legible chips — rather
 * than exact coordinates, so the layout can be tuned without rewriting them.
 */

const lambda = (properties: Record<string, unknown> = {}) => ({
  type: 'function',
  properties: { packaging: { type: 'js-bundle', properties: { entryfilePath: 'src/index.ts' } }, ...properties }
});

/**
 * Twenty functions that all reference one HTTP API declared after them, some joined to the VPC. They
 * share a column with the API, so their connectors loop through the gutter after the last column,
 * which once kept its minimum width and pushed loop tracks through the nodes beside it. Collapsed,
 * they are two groups and nothing loops, so this case is laid out with its groups expanded.
 */
const finalColumnLoops = {
  resources: {
    ...Object.fromEntries(
      Array.from({ length: 20 }, (_, index) => [
        `fn${index}`,
        lambda({
          environment: { API_URL: "$ResourceParam('api', 'url')" },
          ...([1, 5, 7, 11, 12, 15, 17].includes(index) ? { joinDefaultVpc: true } : {})
        })
      ])
    ),
    api: { type: 'http-api-gateway' }
  }
};

const configDirectory = new URL('../test-configs/', import.meta.url);
const configs = [
  ...getDiagramFixtures().map((fixture) => ({ id: fixture.id, config: parseFixtureConfig({ fixture }) })),
  ...readdirSync(configDirectory)
    .filter((file) => file.endsWith('.yml'))
    .map((file) => ({
      id: file.replace(/\.yml$/, ''),
      config: parse(readFileSync(new URL(file, configDirectory), 'utf8'))
    }))
];

/** Every role group of a configuration, to lay it out with all of them expanded. */
const allGroups = (config: unknown) => {
  const topology = buildDiagramTopology({ parsedConfig: config as never });
  return new Set(topology ? findRoleGroups({ topology }).map((group) => group.id) : []);
};

/** Each configuration as it opens (groups collapsed) and, when it has groups, with every group expanded. */
const cases: { id: string; config: any; expand: boolean }[] = [
  ...configs.map(({ id, config }) => ({ id, config, expand: false })),
  ...configs
    .filter(({ config }) => allGroups(config).size > 0)
    .map(({ id, config }) => ({ id: `${id} (expanded)`, config, expand: true })),
  { id: 'final-column-loops', config: finalColumnLoops, expand: true }
];

const DATA_STORES = new Set([
  'relational-database',
  'dynamo-db-table',
  'redis',
  'mongo-db-atlas-cluster',
  'upstash-redis',
  'open-search-domain',
  'bucket',
  'efs-filesystem',
  'user-auth-pool',
  'dsql-database',
  'agentcore-memory'
]);
const SOURCES = new Set(['user', 'schedule']);
/** The renderer's block is 1.32 tiles square. */
const HALF_FOOTPRINT = 0.66;
const EPSILON = 1e-6;

const buildScene = (config: unknown, expand = false) => {
  const scene = buildIsometricScene({
    parsedConfig: config as never,
    expandedGroups: expand ? allGroups(config) : undefined
  });
  if (!scene) throw new Error('Expected a scene');
  return scene;
};

const segmentsOf = (connector: IsoConnector) =>
  connector.route.points.slice(0, -1).map((start, index) => ({ start, end: connector.route.points[index + 1] }));

/** Whether an axis-aligned segment enters the open square of half-size `half` around `center`. */
const segmentEntersSquare = ({
  start,
  end,
  center,
  half
}: {
  start: IsoTilePoint;
  end: IsoTilePoint;
  center: IsoTilePoint;
  half: number;
}) => {
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  return (
    maxX > center.x - half + EPSILON &&
    minX < center.x + half - EPSILON &&
    maxY > center.y - half + EPSILON &&
    minY < center.y + half - EPSILON
  );
};

// Screen geometry, as the renderer draws it at zoom 1 (2:1 projection, 80 × 40 px tiles).
const toScreen = ({ x, y }: IsoTilePoint) => ({ x: (x - y) * 40, y: -(x + y) * 20 });
type ScreenPoint = { x: number; y: number };
/** Convex polygons overlap unless one of their edge normals separates them. */
const polygonsOverlap = (a: ScreenPoint[], b: ScreenPoint[]) => {
  for (const polygon of [a, b]) {
    for (const [index, start] of polygon.entries()) {
      const end = polygon[(index + 1) % polygon.length];
      const axis = { x: end.y - start.y, y: start.x - end.x };
      const project = (points: ScreenPoint[]) => points.map((point) => point.x * axis.x + point.y * axis.y);
      const [first, second] = [project(a), project(b)];
      if (Math.max(...first) <= Math.min(...second) + EPSILON || Math.max(...second) <= Math.min(...first) + EPSILON) {
        return false;
      }
    }
  }
  return true;
};
/** A node's silhouette: its floor diamond (105 × 53 px) extruded by its shape's height, and any badge above it. */
const nodeBody = (node: IsoNode): ScreenPoint[] => {
  const { x, y } = toScreen(node.tile);
  const height = SHAPE_HEIGHT_PX[node.shape] + (hasBadge(node) ? BADGE_OFFSET_PX + BADGE_HEIGHT_PX / 2 : 0);
  return [
    { x, y: y + 26.4 },
    { x: x + 52.8, y },
    { x: x + 52.8, y: y - height },
    { x, y: y - 26.4 - height },
    { x: x - 52.8, y: y - height },
    { x: x - 52.8, y }
  ];
};
/** The two-line name tag under a node's front tip: the name and the muted type line. */
const nodeTag = (node: IsoNode): ScreenPoint[] => {
  const { x, y } = toScreen({ x: node.tile.x - HALF_FOOTPRINT, y: node.tile.y - HALF_FOOTPRINT });
  const halfWidth =
    Math.max(Math.min(node.label.length, 20) * 6.4, Math.min(node.typeLabel?.length ?? 0, 32) * 4.8) / 2;
  return [
    { x: x - halfWidth, y: y + 6 },
    { x: x + halfWidth, y: y + 6 },
    { x: x + halfWidth, y: y + 31 },
    { x: x - halfWidth, y: y + 31 }
  ];
};
/** A zone tag: bold text rotated to the edge it runs along, about 0.68 em per character, as tall as its font. */
const zoneTagStrip = (label: IsoLabel): ScreenPoint[] => {
  const fontSize = label.fontSize ?? 11;
  const length = label.text.length * fontSize * 0.68;
  const angle = Math.atan2(20, 40) * (label.axis === 'y' ? 1 : -1);
  const along = { x: Math.cos(angle), y: Math.sin(angle) };
  const across = { x: -Math.sin(angle) * (fontSize / 2), y: Math.cos(angle) * (fontSize / 2) };
  const start = toScreen(label.tile);
  const end = { x: start.x + along.x * length, y: start.y + along.y * length };
  return [
    { x: start.x - across.x, y: start.y - across.y },
    { x: end.x - across.x, y: end.y - across.y },
    { x: end.x + across.x, y: end.y + across.y },
    { x: start.x + across.x, y: start.y + across.y }
  ];
};
/** A connector chip: 10 px text with 6 px padding, 18 px tall, centered on its label tile. */
const chipBox = (connector: IsoConnector): ScreenPoint[] => {
  const { x, y } = toScreen(connector.route.labelTile);
  const halfWidth = ((connector.label?.length ?? 0) * 6.6 + 12) / 2;
  return [
    { x: x - halfWidth, y: y - 9 },
    { x: x + halfWidth, y: y - 9 },
    { x: x + halfWidth, y: y + 9 },
    { x: x - halfWidth, y: y + 9 }
  ];
};

const columnOf = (scene: IsoScene) => {
  const columns = [...new Set(scene.nodes.map((node) => node.tile.x))].sort((a, b) => a - b);
  return new Map(scene.nodes.map((node) => [node.id, columns.indexOf(node.tile.x)]));
};

/** Whether `to` can reach `from` along request/event edges, i.e. the edge closes a cycle. */
const closesCycle = ({ scene, from, to }: { scene: IsoScene; from: string; to: string }) => {
  const seen = new Set<string>();
  const stack = [to];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (current === from) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const connector of scene.connectors) {
      if (connector.from === current && connector.semantic !== 'dependency') stack.push(connector.to);
    }
  }
  return false;
};

describe('diagram layout', () => {
  for (const { id, config, expand } of cases) {
    describe(id, () => {
      const scene = buildScene(config, expand);
      const nodes = new Map(scene.nodes.map((node) => [node.id, node]));

      test('keeps node footprints apart', () => {
        for (const [index, a] of scene.nodes.entries()) {
          for (const b of scene.nodes.slice(index + 1)) {
            const apart =
              Math.abs(a.tile.x - b.tile.x) >= HALF_FOOTPRINT * 2 + 0.5 ||
              Math.abs(a.tile.y - b.tile.y) >= HALF_FOOTPRINT * 2 + 0.5;
            expect(apart, `${a.id} and ${b.id} overlap`).toBe(true);
          }
        }
      });

      test('keeps zone members inside their rectangle and everything else outside it', () => {
        for (const rectangle of scene.rectangles) {
          const members = new Set(rectangle.memberNodeIds);
          expect(members.size).toBeGreaterThan(0);
          for (const node of scene.nodes) {
            const footprint = {
              x0: node.tile.x - HALF_FOOTPRINT,
              x1: node.tile.x + HALF_FOOTPRINT,
              y0: node.tile.y - HALF_FOOTPRINT,
              y1: node.tile.y + HALF_FOOTPRINT
            };
            if (members.has(node.id)) {
              const inside =
                footprint.x0 >= rectangle.from.x &&
                footprint.x1 <= rectangle.to.x &&
                footprint.y0 >= rectangle.from.y &&
                footprint.y1 <= rectangle.to.y;
              expect(inside, `${node.id} sticks out of ${rectangle.id}`).toBe(true);
            } else {
              const outside =
                footprint.x1 <= rectangle.from.x ||
                footprint.x0 >= rectangle.to.x ||
                footprint.y1 <= rectangle.from.y ||
                footprint.y0 >= rectangle.to.y;
              expect(outside, `${node.id} intrudes into ${rectangle.id}`).toBe(true);
            }
          }
        }
      });

      test('routes connectors orthogonally and never through a node they do not touch', () => {
        for (const connector of scene.connectors) {
          expect(connector.route.points[0]).toEqual(nodes.get(connector.from)!.tile);
          expect(connector.route.points.at(-1)).toEqual(nodes.get(connector.to)!.tile);
          for (const { start, end } of segmentsOf(connector)) {
            const orthogonal = Math.abs(start.x - end.x) < EPSILON || Math.abs(start.y - end.y) < EPSILON;
            expect(orthogonal, `${connector.id} has a diagonal segment`).toBe(true);
            for (const node of scene.nodes) {
              if (node.id === connector.from || node.id === connector.to) continue;
              const blocked = segmentEntersSquare({ start, end, center: node.tile, half: HALF_FOOTPRINT });
              expect(blocked, `${connector.id} passes through ${node.id}`).toBe(false);
            }
          }
        }
      });

      test('draws the flow left to right, sources first and data stores last', () => {
        const dataX = scene.nodes.filter((node) => DATA_STORES.has(node.resourceType ?? ''));
        const otherX = scene.nodes.filter((node) => !DATA_STORES.has(node.resourceType ?? ''));
        for (const store of dataX) {
          for (const other of otherX) {
            expect(store.tile.x, `${store.id} is left of ${other.id}`).toBeGreaterThan(other.tile.x);
          }
        }
        for (const source of scene.nodes.filter((node) => SOURCES.has(node.resourceType ?? ''))) {
          for (const other of scene.nodes) {
            if (!SOURCES.has(other.resourceType ?? '')) expect(source.tile.x).toBeLessThan(other.tile.x);
          }
        }
        for (const connector of scene.connectors) {
          const from = nodes.get(connector.from)!;
          const to = nodes.get(connector.to)!;
          const flows =
            (connector.semantic === 'request' || connector.semantic === 'event' || connector.semantic === 'egress') &&
            !DATA_STORES.has(from.resourceType ?? '');
          if (flows && !closesCycle({ scene, from: connector.from, to: connector.to })) {
            expect(to.tile.x, `${connector.id} runs backwards`).toBeGreaterThan(from.tile.x);
          }
          // Every route, back edges included, keeps heading the same way along the flow.
          const direction = Math.sign(to.tile.x - from.tile.x);
          if (direction === 0) continue;
          for (const { start, end } of segmentsOf(connector)) {
            expect((end.x - start.x) * direction, `${connector.id} doubles back`).toBeGreaterThanOrEqual(-EPSILON);
          }
        }
      });

      test('places connector chips clear of node bodies and of each other', () => {
        const chips = new Map<string, ScreenPoint[]>();
        for (const connector of scene.connectors) {
          if (!connector.label) continue;
          // Edges of one bundle that share a label also share one chip.
          chips.set(
            `${connector.label}@${connector.route.labelTile.x},${connector.route.labelTile.y}`,
            chipBox(connector)
          );
        }
        const boxes = [...chips.entries()];
        for (const [key, box] of boxes) {
          for (const node of scene.nodes) {
            expect(polygonsOverlap(box, nodeBody(node)), `chip ${key} covers ${node.id}`).toBe(false);
          }
        }
        for (const [index, [key, box]] of boxes.entries()) {
          for (const [otherKey, other] of boxes.slice(index + 1)) {
            expect(polygonsOverlap(box, other), `chips ${key} and ${otherKey} overlap`).toBe(false);
          }
        }
      });

      test('lays zone tags along their zone, clear of node bodies, name tags and chips', () => {
        for (const label of scene.labels) {
          const rectangle = scene.rectangles.find((zone) => `${zone.id}-label` === label.id)!;
          // The tag starts on, or just beside, one of its zone's edges.
          const nearX = Math.min(Math.abs(label.tile.x - rectangle.from.x), Math.abs(label.tile.x - rectangle.to.x));
          const nearY = Math.min(Math.abs(label.tile.y - rectangle.from.y), Math.abs(label.tile.y - rectangle.to.y));
          expect(Math.min(nearX, nearY), `${label.id} is not on an edge of its zone`).toBeLessThan(0.5);
          const strip = zoneTagStrip(label);
          for (const node of scene.nodes) {
            expect(polygonsOverlap(strip, nodeBody(node)), `${label.id} covers ${node.id}`).toBe(false);
            expect(polygonsOverlap(strip, nodeTag(node)), `${label.id} covers the name of ${node.id}`).toBe(false);
          }
          for (const connector of scene.connectors) {
            if (!connector.label) continue;
            expect(polygonsOverlap(strip, chipBox(connector)), `${label.id} covers chip ${connector.id}`).toBe(false);
          }
          for (const other of scene.labels) {
            if (other !== label) expect(polygonsOverlap(strip, zoneTagStrip(other))).toBe(false);
          }
        }
      });

      test('is deterministic', () => {
        expect(buildScene(structuredClone(config), expand)).toEqual(scene);
      });
    });
  }

  test('keeps existing nodes in their columns and mostly in order when an unrelated resource appears', () => {
    for (const { id, config, expand } of cases) {
      const before = buildScene(config, expand);
      const after = buildScene(
        { ...config, resources: { ...config.resources, addedLater: { type: 'bucket' } } },
        expand
      );
      const [oldColumns, newColumns] = [columnOf(before), columnOf(after)];
      const newTiles = new Map(after.nodes.map((node) => [node.id, node.tile]));
      let pairs = 0;
      let flipped = 0;
      for (const [index, a] of before.nodes.entries()) {
        expect(newColumns.get(a.id), `${id}: ${a.id} changed column`).toBe(oldColumns.get(a.id));
        for (const b of before.nodes.slice(index + 1)) {
          if (oldColumns.get(a.id) !== oldColumns.get(b.id)) continue;
          pairs += 1;
          const wasAbove = a.tile.y > b.tile.y;
          if (wasAbove !== newTiles.get(a.id)!.y > newTiles.get(b.id)!.y) flipped += 1;
        }
      }
      expect(flipped, `${id}: ${flipped} of ${pairs} same-column pairs swapped`).toBeLessThanOrEqual(pairs * 0.2);
    }
  });

  test('lays out a 72-resource stack within its time budget', () => {
    const config = cases.find((candidate) => candidate.id === 'serverless-60')!.config;
    buildScene(config);
    const started = performance.now();
    buildScene(config);
    expect(performance.now() - started).toBeLessThan(500);
  });
});

/**
 * Inputs that once froze the page for seconds. Each lays out in about half a second; the budget leaves
 * room for a loaded CI machine while still catching a return to quadratic or unbounded work.
 */
describe('layout performance', () => {
  const BUDGET_MS = 2000;
  const timed = (config: unknown) => {
    const started = performance.now();
    buildScene(config);
    return performance.now() - started;
  };

  test('places 300 distinct connector labels without comparing every pair', () => {
    const resources = Object.fromEntries(
      Array.from({ length: 300 }, (_, index) => [
        `fn${index}`,
        lambda({ events: [{ type: 'schedule', properties: { scheduleRate: `rate(${index + 2} minutes)` } }] })
      ])
    );
    expect(timed({ resources })).toBeLessThan(BUDGET_MS);
  });

  test('caps network simplex work on a dense cyclic graph', () => {
    const resources = Object.fromEntries(
      Array.from({ length: 300 }, (_, index) => [
        `r${index}`,
        lambda({ connectTo: Array.from({ length: 10 }, (__, step) => `r${(index + step + 1) % 300}`) })
      ])
    );
    expect(timed({ resources })).toBeLessThan(BUDGET_MS);
  });
});

const columns = (
  nodes: { id: string; rank?: 'first' | 'last' }[],
  edges: { from: string; to: string; flow?: boolean }[]
) => assignFlowColumns({ nodes, edges: edges.map((edge) => ({ flow: true, ...edge })) });

describe('flow columns', () => {
  test('puts a queue consumer after the queue and the producer before it', () => {
    const result = columns(
      [{ id: 'consumer' }, { id: 'queue' }, { id: 'producer' }, { id: 'user', rank: 'first' }],
      [
        { from: 'user', to: 'producer' },
        { from: 'producer', to: 'queue' },
        { from: 'queue', to: 'consumer' }
      ]
    );
    expect([result.get('user'), result.get('producer'), result.get('queue'), result.get('consumer')]).toEqual([
      0, 1, 2, 3
    ]);
  });

  test('keeps sinks in the last column even when they trigger something', () => {
    const result = columns(
      [{ id: 'api' }, { id: 'table', rank: 'last' }, { id: 'onChange' }],
      [
        { from: 'api', to: 'table' },
        { from: 'table', to: 'onChange' }
      ]
    );
    expect(result.get('table')).toBeGreaterThan(result.get('onChange')!);
    expect(result.get('table')).toBeGreaterThan(result.get('api')!);
  });

  test('breaks cycles deterministically and starts from the sources', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'user', rank: 'first' as const }];
    const edges = [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'a' },
      { from: 'user', to: 'b' },
      { from: 'b', to: 'c' }
    ];
    const result = columns(nodes, edges);
    expect(columns(nodes, edges)).toEqual(result);
    expect(result.get('b')).toBe(1);
    expect(result.get('a')).toBe(2);
    expect(result.get('c')).toBe(2);
  });

  test('moves a node nothing feeds next to the node it reaches', () => {
    const result = columns(
      [{ id: 'user', rank: 'first' }, { id: 'api' }, { id: 'fn' }, { id: 'job' }, { id: 'db', rank: 'last' }],
      [
        { from: 'user', to: 'api' },
        { from: 'api', to: 'fn' },
        { from: 'fn', to: 'db', flow: false },
        { from: 'job', to: 'db', flow: false }
      ]
    );
    expect(result.get('job')).toBe(result.get('fn'));
  });
});

const node = (id: string, size: number, extra: { rank?: 'first' | 'last'; zone?: string } = {}) => ({
  id,
  width: size,
  depth: size,
  lift: 2,
  tag: { halfWidth: 1, height: 1.8 },
  ...extra
});
const edge = (from: string, to: string, flow = true) => ({ id: `${from}>${to}`, from, to, flow, bundle: 'x' });

describe('layout engine', () => {
  test('keeps nodes of any size apart, inside their zones and clear of passing connectors', () => {
    const nodes = [
      node('source', 1.32, { rank: 'first' }),
      node('group', 3.2),
      node('ingress', 1.32, { zone: 'outer' }),
      node('service', 2.4, { zone: 'inner' }),
      node('queue', 1.32),
      node('worker', 1.32),
      node('store', 2, { rank: 'last', zone: 'outer' }),
      node('bucket', 1.32, { rank: 'last' })
    ];
    const layout = layoutDiagram({
      nodes,
      edges: [
        edge('source', 'group'),
        edge('source', 'ingress'),
        edge('ingress', 'service'),
        edge('group', 'queue'),
        edge('queue', 'worker'),
        edge('service', 'store', false),
        edge('group', 'store', false),
        edge('worker', 'bucket', false),
        edge('bucket', 'worker')
      ],
      zones: [{ id: 'outer' }, { id: 'inner', parent: 'outer' }],
      measureLabel: () => ({ halfWidth: 0.6, halfHeight: 0.5 })
    });

    for (const [index, a] of nodes.entries()) {
      const at = layout.nodes.get(a.id)!;
      for (const b of nodes.slice(index + 1)) {
        const bt = layout.nodes.get(b.id)!;
        const apart =
          Math.abs(at.x - bt.x) >= (a.width + b.width) / 2 || Math.abs(at.y - bt.y) >= (a.depth + b.depth) / 2;
        expect(apart, `${a.id} and ${b.id} overlap`).toBe(true);
      }
    }
    const inside = (id: string, zone: string) => {
      const rect = layout.zones.get(zone)!;
      const tile = layout.nodes.get(id)!;
      const size = nodes.find((candidate) => candidate.id === id)!;
      return (
        tile.x - size.width / 2 >= rect.from.x &&
        tile.x + size.width / 2 <= rect.to.x &&
        tile.y - size.depth / 2 >= rect.from.y &&
        tile.y + size.depth / 2 <= rect.to.y
      );
    };
    expect(inside('ingress', 'outer') && inside('service', 'inner') && inside('store', 'outer')).toBe(true);
    for (const outsider of ['group', 'queue', 'worker', 'bucket', 'source']) {
      const rect = layout.zones.get('outer')!;
      const tile = layout.nodes.get(outsider)!;
      const size = nodes.find((candidate) => candidate.id === outsider)!;
      const clear =
        tile.x + size.width / 2 <= rect.from.x ||
        tile.x - size.width / 2 >= rect.to.x ||
        tile.y + size.depth / 2 <= rect.from.y ||
        tile.y - size.depth / 2 >= rect.to.y;
      expect(clear, `${outsider} intrudes into the outer zone`).toBe(true);
    }
    for (const [id, route] of layout.edges) {
      const [from, to] = id.split('>');
      for (const [index, start] of route.points.slice(0, -1).entries()) {
        const end = route.points[index + 1];
        for (const other of nodes) {
          if (other.id === from || other.id === to) continue;
          const center = layout.nodes.get(other.id)!;
          const blocked =
            Math.max(start.x, end.x) > center.x - other.width / 2 + EPSILON &&
            Math.min(start.x, end.x) < center.x + other.width / 2 - EPSILON &&
            Math.max(start.y, end.y) > center.y - other.depth / 2 + EPSILON &&
            Math.min(start.y, end.y) < center.y + other.depth / 2 - EPSILON;
          expect(blocked, `${id} passes through ${other.id}`).toBe(false);
        }
      }
    }
    expect(layout.edges.get('bucket>worker')!.reversed).toBe(true);
  });
});

describe('network simplex', () => {
  test('pulls weighted pairs together without breaking separations', () => {
    // x and y must stay 2 apart; both are pulled to a free target t, y three times as hard as x.
    const [x, y, t, pullX, pullY] = [0, 1, 2, 3, 4];
    const values = solveDifferenceConstraints({
      variableCount: 5,
      constraints: [
        { from: x, to: y, minLength: 2, weight: 0 },
        { from: pullX, to: x, minLength: 0, weight: 1 },
        { from: pullX, to: t, minLength: 0, weight: 1 },
        { from: pullY, to: y, minLength: 0, weight: 3 },
        { from: pullY, to: t, minLength: 0, weight: 3 }
      ]
    });
    expect(values[y] - values[x]).toBe(2);
    expect(values[t]).toBe(values[y]);
  });

  test('returns valid ranks when the pivot budget runs out', () => {
    // A chain of separations with pulls that need several pivots to optimise.
    const count = 12;
    const constraints = [
      ...Array.from({ length: count - 1 }, (_, index) => ({ from: index, to: index + 1, minLength: 2, weight: 0 })),
      ...Array.from({ length: count }, (_, index) => [
        { from: count + index, to: index, minLength: 0, weight: index + 1 },
        { from: count + index, to: (index * 7) % count, minLength: 0, weight: index + 1 }
      ]).flat()
    ];
    for (const maxPivots of [0, 1, 3]) {
      const values = solveDifferenceConstraints({ variableCount: count * 2, constraints, maxPivots });
      for (const constraint of constraints) {
        expect(values[constraint.to] - values[constraint.from]).toBeGreaterThanOrEqual(constraint.minLength);
      }
    }
  });

  test('rejects contradictory constraints instead of returning a wrong answer', () => {
    expect(() =>
      solveDifferenceConstraints({
        variableCount: 2,
        constraints: [
          { from: 0, to: 1, minLength: 1, weight: 0 },
          { from: 1, to: 0, minLength: 1, weight: 0 }
        ]
      })
    ).toThrow();
  });
});
