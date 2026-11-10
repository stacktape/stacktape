import type { DiagramResourceStatus, DiagramStatuses } from './status.js';
import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { getFixtureById, getSceneForFixture, parseFixtureConfig } from './fixture-scenes.js';
import { IsometricDiagram } from './IsometricDiagram.js';
import { IsoRenderer } from './IsoRenderer.js';
import { buildNodeStatuses, countResourcesNeedingAttention, readStatuses } from './status.js';

/**
 * Live status on the diagram: what a host's statuses become on each drawn node, and what the drawing shows. The
 * `serverless-routes` fixture has a group of six API functions (`createOrder`, `listOrders`, ...), a DynamoDB table
 * and implicit nodes such as the internet user.
 */

const incident = {
  tone: 'critical',
  text: 'Open incident',
  detail: 'Alarm "orders-5xx" triggered',
  href: '/i/1'
} as const;
const error = (detail: string) => ({ tone: 'warning', text: 'Open error', detail, href: '/issues/7' }) as const;
const risk = { tone: 'warning', text: 'Security risk', detail: 'High: point-in-time recovery is off' } as const;

const scene = getSceneForFixture({ fixture: getFixtureById({ id: 'serverless-routes' }) })!;
const routesGroup = 'group--function--api-request';
const implicitNode = scene.nodes.find((node) => node.isImplicit)!;

const statusesOf = (input: DiagramStatuses) =>
  buildNodeStatuses({ nodes: scene.nodes, groups: scene.groups, statuses: readStatuses(input) });

const countMatches = (text: string, pattern: RegExp) => (text.match(pattern) || []).length;

/** Every path and polygon of the canvas, which holds nothing but the scene. */
const geometry = (markup: string) =>
  [...(markup.match(/<svg [^>]*stp-diagram__canvas.*?<\/svg>/s)?.[0] ?? '').matchAll(/ (?:d|points)="([^"]+)"/g)].map(
    (match) => match[1]
  );
/** The canvas without the status marks themselves. */
const shapesOnly = (markup: string) =>
  geometry(markup.replace(/<g data-iso-kind="node-status".*?<\/g>|<polygon data-iso-kind="status-ring"[^>]*>/g, ''));

describe('reading what the host reports', () => {
  test('keeps worded statuses worst first, bounds their text and drops unsafe links', () => {
    const read = readStatuses({
      api: [
        { tone: 'ok', text: '  Healthy  ' },
        { tone: 'warning', text: 'Security risk', href: 'javascript:alert(1)' },
        { tone: 'critical', text: 'Open\n incident', href: '/incidents/view?id=1' },
        { tone: 'bad' as never, text: 'Odd tone', href: '//elsewhere.example/x' },
        { tone: 'critical', text: '   ' },
        { tone: 'warning', text: 'x'.repeat(200), href: 'https://example.com/finding' }
      ]
    }).get('api')!;

    expect(read.map((status) => [status.tone, status.text.slice(0, 20), status.href])).toEqual([
      ['critical', 'Open incident', '/incidents/view?id=1'],
      ['warning', 'Security risk', undefined],
      ['warning', 'xxxxxxxxxxxxxxxxxxxx', 'https://example.com/finding'],
      ['unknown', 'Odd tone', undefined],
      ['ok', 'Healthy', undefined]
    ]);
    expect(read[2]!.text.length).toBe(60);
    expect(read[2]!.text.endsWith('…')).toBe(true);
  });

  test('ignores input that is not a list of statuses', () => {
    const read = readStatuses({
      api: 'broken' as never,
      queue: [null, 3, { text: 'Paused' }] as never,
      empty: []
    });
    expect([...read.keys()]).toEqual(['queue']);
    expect(read.get('queue')).toEqual([{ tone: 'unknown', text: 'Paused', detail: undefined, href: undefined }]);
  });
});

describe('statuses on drawn nodes', () => {
  test('a resource shows its worst status and how many more it has', () => {
    const statuses = statusesOf({ ordersTable: [risk, incident, error('TimeoutError')] });
    expect(statuses.get('ordersTable')).toMatchObject({ tone: 'critical', text: 'Open incident', more: 2 });
    expect(statuses.get('ordersTable')!.line).toBe('Open incident +2');
  });

  test('a collapsed group takes its worst member’s tone and counts the members that share it', () => {
    const statuses = statusesOf({
      createOrder: [incident],
      listOrders: [error('TypeError')],
      getOrder: [error('RangeError')]
    });
    const group = statuses.get(routesGroup)!;
    expect(group).toMatchObject({ tone: 'critical', line: '1 of 6 failing', affected: { count: 1, of: 6 } });
    // Every member's status is listed, worst first, with the member it belongs to.
    expect(group.entries.map((entry) => [entry.resourceName, entry.tone])).toEqual([
      ['createOrder', 'critical'],
      ['listOrders', 'warning'],
      ['getOrder', 'warning']
    ]);
    expect(statusesOf({ listOrders: [error('TypeError')], getOrder: [risk] }).get(routesGroup)!.line).toBe(
      '2 of 6 flagged'
    );
  });

  test('implicit nodes, unknown names and resources that report nothing carry no status', () => {
    const statuses = statusesOf({ [implicitNode.id]: [incident], somethingElse: [incident] });
    expect(statuses.size).toBe(0);
  });

  test('counts resources that need attention one by one, group members included', () => {
    const statuses = statusesOf({
      createOrder: [incident],
      listOrders: [error('TypeError')],
      ordersTable: [risk],
      api: [{ tone: 'ok', text: 'Healthy' }]
    });
    expect(countResourcesNeedingAttention(statuses)).toBe(3);
  });
});

describe('drawing statuses', () => {
  const statuses: Record<string, DiagramResourceStatus[]> = {
    createOrder: [incident],
    ordersTable: [risk, error('TimeoutError')],
    api: [{ tone: 'ok', text: 'Healthy' }]
  };

  test('puts a pill under each resource that reports something and rings only those that need attention', () => {
    const markup = renderToStaticMarkup(<IsoRenderer scene={scene} statuses={statuses} />);
    expect(countMatches(markup, /data-iso-kind="node-status"/g)).toBe(3);
    expect(countMatches(markup, /data-iso-kind="status-ring" data-iso-tone="critical"/g)).toBe(1);
    expect(countMatches(markup, /data-iso-kind="status-ring" data-iso-tone="warning"/g)).toBe(1);
    // Words, not only colour: the pill and the node's accessible name say what is wrong.
    expect(markup).toContain('>1 of 6 failing<');
    expect(markup).toContain('>Security risk +1<');
    expect(markup).toContain('aria-label="api routes, 6 functions, 1 of 6 failing"');
    expect(markup).toContain('2 resources need attention');
  });

  test('shows host notices about the whole picture inside the frame, with their tone', () => {
    const markup = renderToStaticMarkup(
      <IsoRenderer
        scene={scene}
        statuses={{}}
        notices={[
          { id: 'deploying', tone: 'info', content: 'A deploy is running.' },
          { id: 'incident', tone: 'critical', content: <a href="/incidents/view?id=2">Uptime check is down</a> }
        ]}
      />
    );
    const toolbar = markup.slice(markup.indexOf('stp-diagram__toolbar'));
    expect(countMatches(toolbar, /class="stp-diagram__notice" data-tone="(info|critical)"/g)).toBe(2);
    expect(toolbar).toContain('A deploy is running.');
    expect(toolbar).toContain('<a href="/incidents/view?id=2">Uptime check is down</a>');
    expect(renderToStaticMarkup(<IsoRenderer scene={scene} />)).not.toContain('stp-diagram__notice');
  });

  test('draws nothing extra when the host passes no statuses', () => {
    for (const markup of [
      renderToStaticMarkup(<IsoRenderer scene={scene} />),
      renderToStaticMarkup(<IsoRenderer scene={scene} statuses={{}} />)
    ]) {
      expect(markup).not.toContain('data-iso-kind="node-status"');
      expect(markup).not.toContain('data-iso-kind="status-ring"');
      expect(markup).not.toContain('need attention');
    }
  });

  test('statuses never move anything; only passing them at all reserves room for the pill', () => {
    const config = parseFixtureConfig({ fixture: getFixtureById({ id: 'serverless-routes' }) });
    const quiet = renderToStaticMarkup(<IsometricDiagram config={config} statuses={{}} />);
    const busy = renderToStaticMarkup(<IsometricDiagram config={config} statuses={statuses} />);
    expect(shapesOnly(busy)).toEqual(shapesOnly(quiet));

    const website = renderToStaticMarkup(<IsometricDiagram config={config} />);
    // Without statuses the scene is laid out exactly as before: no room is reserved.
    expect(geometry(website)).toEqual(
      geometry(renderToStaticMarkup(<IsoRenderer scene={scene} onToggleGroup={() => undefined} />))
    );
    expect(geometry(website)).not.toEqual(geometry(quiet));
  });
});

const pills = (markup: string) =>
  [...markup.matchAll(/<g data-iso-kind="node-status".*?<\/g>/gs)].map((match) => match[0]).sort();
const viewBox = (markup: string) => markup.match(/viewBox="([^"]+)"/)?.[1];

describe('statuses and layers', () => {
  test('the same statuses show in the same place and frame whichever layers are on', () => {
    const fixture = getFixtureById({ id: 'full-stack' });
    const config = parseFixtureConfig({ fixture });
    const statuses: DiagramStatuses = { webApp: [incident], mainDb: [risk], apiHandler: [error('TimeoutError')] };
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      if (!String(args[0] ?? '').includes('useLayoutEffect')) originalError(...args);
    };
    const markups = [false, true].map((infrastructure) =>
      renderToStaticMarkup(
        <IsometricDiagram
          config={config}
          statuses={statuses}
          layers={{ infrastructure, access: false }}
          animateConnectors={false}
        />
      )
    );
    console.error = originalError;
    expect(pills(markups[0])).toHaveLength(3);
    for (const markup of markups) {
      expect(pills(markup)).toEqual(pills(markups[0]));
      expect(viewBox(markup)).toBe(viewBox(markups[0]));
      expect(countMatches(markup, /data-iso-kind="status-ring"/g)).toBe(3);
    }
  });
});
