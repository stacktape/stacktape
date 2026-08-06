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

  test('renders replica count indicators', () => {
    const scene = getSceneForFixture({ fixture: getFixtureById({ id: 'web-service-rds' }) });
    expect(scene).not.toBeNull();

    const markup = renderToStaticMarkup(<IsoRenderer scene={scene!} width={1200} height={800} />);
    expect(markup.includes('x2')).toBe(true);
  });
});
