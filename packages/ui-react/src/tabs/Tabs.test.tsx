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
