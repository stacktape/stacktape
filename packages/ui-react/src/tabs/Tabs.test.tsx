import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Tabs } from './Tabs.js';

const tabs = [
  { value: 'editor', label: 'Editor', panelId: 'editor-panel' },
  { value: 'diagram', label: 'Architecture diagram', compactLabel: 'Diagram' }
] as const;

test('renders a controlled accessible tab list', () => {
  const markup = renderToStaticMarkup(
    <Tabs ariaLabel="Configuration views" onValueChange={() => undefined} tabs={tabs} value="diagram" />
  );

  expect(markup).toContain('aria-label="Configuration views"');
  expect(markup).toContain('role="tablist"');
  expect(markup).toContain('role="tab"');
  expect(markup).toContain('aria-selected="true"');
  expect(markup).toContain('Architecture diagram');
  expect(markup).toContain('Diagram');
  expect(markup).toContain('stp-ui-tabs__indicator');
});

test('supports vertical tabs without changing their semantic role', () => {
  const markup = renderToStaticMarkup(
    <Tabs ariaLabel="Project stages" appearance="segmented" orientation="vertical" tabs={tabs} value="editor" />
  );

  expect(markup).toContain('aria-orientation="vertical"');
  expect(markup).toContain('stp-ui-tabs--vertical');
});

test('uses the underline itself instead of a sliding surface for underline tabs', () => {
  const markup = renderToStaticMarkup(
    <Tabs appearance="underline" ariaLabel="Documentation sections" tabs={tabs} value="editor" />
  );

  expect(markup).not.toContain('stp-ui-tabs__indicator');
});

test('a tab with an address is a real link and keeps its tab role', () => {
  const markup = renderToStaticMarkup(
    <Tabs ariaLabel="Sections" tabs={[{ value: 'logs', label: 'Logs', href: '/logs' }]} value="logs" />
  );

  expect(markup).toContain('<a ');
  expect(markup).toContain('href="/logs"');
  expect(markup).toContain('role="tab"');
});

test('separates and labels groups of tabs without adding tab stops', () => {
  const markup = renderToStaticMarkup(
    <Tabs
      ariaLabel="How to run the CLI"
      tabs={[
        { value: 'npx', label: 'npm', group: '' },
        { value: 'bun', label: 'bun', group: '' },
        { value: 'macos', label: 'macOS', group: 'No Node.js' },
        { value: 'linux', label: 'Linux', group: 'No Node.js' }
      ]}
      value="npx"
    />
  );

  expect(markup.match(/stp-ui-tabs__divider/g)).toHaveLength(1);
  // The kind that needs no name has none; the other is named once, before its first tab.
  expect(markup.match(/class="stp-ui-tabs__group"/g)).toHaveLength(1);
  expect(markup.indexOf('stp-ui-tabs__divider')).toBeGreaterThan(markup.indexOf('>bun<'));
  expect(markup.indexOf('No Node.js')).toBeLessThan(markup.indexOf('>macOS<'));
  expect(markup.match(/role="tab"/g)).toHaveLength(4);
});
