import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { IsoRenderer } from './IsoRenderer.js';
import { getDiagramFixtures, getFixtureById, getSceneForFixture } from './fixture-scenes.js';

const countMatches = ({ text, pattern }: { text: string; pattern: RegExp }) => (text.match(pattern) || []).length;

describe('diagram svg structure', () => {
  for (const fixture of getDiagramFixtures()) {
    test(`renders svg structure for ${fixture.id}`, () => {
      const scene = getSceneForFixture({ fixture });
      expect(scene).not.toBeNull();

      const originalError = console.error;
      console.error = (...args: any[]) => {
        const firstArg = String(args[0] || '');
        if (firstArg.includes('useLayoutEffect')) return;
        originalError(...args);
      };

      const markup = renderToStaticMarkup(<IsoRenderer scene={scene!} width={1200} height={800} />);
      console.error = originalError;

      expect(markup.includes('<svg')).toBe(true);
      expect(countMatches({ text: markup, pattern: /data-iso-kind="connector-path"/g })).toBe(scene!.connectors.length);
      expect(countMatches({ text: markup, pattern: /data-iso-kind="node"/g })).toBe(scene!.nodes.length);
      expect(countMatches({ text: markup, pattern: /id="[^"]*-iso-arrow-request"/g })).toBe(1);
      expect(countMatches({ text: markup, pattern: /data-iso-kind="floor-label"/g })).toBe(scene!.labels.length);

      for (const label of scene!.labels.slice(0, 3)) {
        expect(markup.includes(label.text)).toBe(true);
      }
    });
  }

  test('marks running copies and internet-reachable data stores on the drawing', () => {
    const scene = getSceneForFixture({ fixture: getFixtureById({ id: 'agents-and-platform' }) });
    expect(scene).not.toBeNull();

    const markup = renderToStaticMarkup(<IsoRenderer scene={scene!} width={1200} height={800} />);
    // The database left on its default `internet` accessibility carries the badge; the Convex database does not.
    expect(countMatches({ text: markup, pattern: /data-iso-kind="public-badge"/g })).toBe(
      scene!.nodes.filter((node) => node.isPublic).length
    );
    expect(scene!.nodes.filter((node) => node.isPublic).map((node) => node.id)).toEqual(['ticketsDb']);
    // Two NAT gateways are drawn as two slabs, not as a badge.
    expect(markup).toContain('2 gateways · 1 per zone');
    expect(countMatches({ text: markup, pattern: /data-iso-kind="replica-badge"/g })).toBe(0);
  });

  test('shows a container service task range as a badge and in its type line', () => {
    const scene = getSceneForFixture({ fixture: getFixtureById({ id: 'default-microservices' }) });
    const markup = renderToStaticMarkup(<IsoRenderer scene={scene!} width={1200} height={800} />);

    expect(markup).toContain('Web service · 2–6 tasks');
    expect(countMatches({ text: markup, pattern: /data-iso-kind="replica-badge"/g })).toBe(1);
  });

  test('draws a collapsed group as a deck with its count, and offers to expand it only when the host can', () => {
    const scene = getSceneForFixture({ fixture: getFixtureById({ id: 'serverless-routes' }) })!;
    const groups = scene.nodes.filter((node) => node.memberCount);
    expect(groups.map((node) => [node.label, node.memberCount])).toEqual([
      ['api routes', 6],
      ['orderEvents subscribers', 3]
    ]);

    const markup = renderToStaticMarkup(<IsoRenderer scene={scene} onToggleGroup={() => undefined} />);
    expect(countMatches({ text: markup, pattern: /data-iso-shape="deck"/g })).toBe(2);
    expect(countMatches({ text: markup, pattern: /data-iso-kind="group-count"/g })).toBe(2);
    expect(countMatches({ text: markup, pattern: /data-iso-kind="group-toggle"/g })).toBe(2);
    expect(markup).toContain('aria-label="Show the 6 functions in api routes one by one"');
    expect(markup).toContain('6 functions');

    const readOnly = renderToStaticMarkup(<IsoRenderer scene={scene} />);
    expect(countMatches({ text: readOnly, pattern: /data-iso-kind="group-toggle"/g })).toBe(0);
  });

  test('makes every node a keyboard-reachable button and offers search', () => {
    const scene = getSceneForFixture({ fixture: getFixtureById({ id: 'serverless-routes' }) })!;
    const markup = renderToStaticMarkup(<IsoRenderer scene={scene} />);
    expect(
      countMatches({ text: markup, pattern: /data-iso-kind="node" data-iso-id="[^"]+" role="button" tabindex="0"/g })
    ).toBe(scene.nodes.length);
    expect(markup).toContain('aria-label="Find resource"');
  });
});
