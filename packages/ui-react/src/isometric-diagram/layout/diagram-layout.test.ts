import type { IsoConnector, IsoNode, IsoScene, IsoTilePoint } from '../scene.js';
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { getDiagramFixtures, parseFixtureConfig } from '../fixture-scenes.js';
import { buildIsometricScene } from '../scene-builder.js';
import { assignFlowColumns } from './columns.js';
import { layoutDiagram } from './diagram-layout.js';
import { solveDifferenceConstraints } from './network-simplex.js';

/**
 * Semantic layout checks over every fixture and the larger review configs. They assert what a reader
 * relies on — flow direction, zone membership, unobstructed connectors and legible chips — rather
 * than exact coordinates, so the layout can be tuned without rewriting them.
 */

const configDirectory = new URL('../test-configs/', import.meta.url);
const cases = [
  ...getDiagramFixtures().map((fixture) => ({ id: fixture.id, config: parseFixtureConfig({ fixture }) })),
  ...readdirSync(configDirectory)
    .filter((file) => file.endsWith('.yml'))
    .map((file) => ({
      id: file.replace(/\.yml$/, ''),
      config: parse(readFileSync(new URL(file, configDirectory), 'utf8'))
    }))
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
  'user-auth-pool'
]);
const SOURCES = new Set(['user', 'schedule']);
/** The renderer's block is 1.32 tiles square. */
const HALF_FOOTPRINT = 0.66;
const EPSILON = 1e-6;

const buildScene = (config: unknown) => {
  const scene = buildIsometricScene({ parsedConfig: config as never });
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
/** A block's silhouette: its floor diamond (105 × 53 px) extruded by the tallest pedestal drawn today. */
const PEDESTAL_PX = 30;
const nodeBody = (node: IsoNode): ScreenPoint[] => {
  const { x, y } = toScreen(node.tile);
  return [
    { x, y: y + 26.4 },
    { x: x + 52.8, y },
    { x: x + 52.8, y: y - PEDESTAL_PX },
    { x, y: y - 26.4 - PEDESTAL_PX },
    { x: x - 52.8, y: y - PEDESTAL_PX },
    { x: x - 52.8, y }
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
  for (const { id, config } of cases) {
    describe(id, () => {
      const scene = buildScene(config);
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

      test('is deterministic', () => {
        expect(buildScene(structuredClone(config))).toEqual(scene);
      });
    });
  }

  test('keeps existing nodes in their columns and mostly in order when an unrelated resource appears', () => {
    for (const { id, config } of cases) {
      const before = buildScene(config);
      const after = buildScene({ ...config, resources: { ...config.resources, addedLater: { type: 'bucket' } } });
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
