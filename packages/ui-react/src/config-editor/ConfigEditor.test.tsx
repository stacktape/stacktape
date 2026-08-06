import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConfigEditor } from './ConfigEditor.js';

const views = [
  { id: 'source', label: 'Editor' },
  { id: 'diagram', label: 'Architecture diagram', shortLabel: 'Diagram' }
] as const;

test('renders accessible controlled view navigation and the active panel', () => {
  const markup = renderToStaticMarkup(
    <ConfigEditor activeView="diagram" onActiveViewChange={() => undefined} unsaved views={views}>
      <p>Diagram content</p>
    </ConfigEditor>
  );

  expect(markup).toContain('role="tablist"');
  expect(markup).toContain('role="tab"');
  expect(markup).toContain('aria-selected="true"');
  expect(markup).toContain('role="tabpanel"');
  expect(markup).toContain('Diagram content');
});

test('can hide navigation without leaving an orphaned tab panel', () => {
  const markup = renderToStaticMarkup(
    <ConfigEditor activeView="source" hideTabs id="embedded-config" onActiveViewChange={() => undefined} views={views}>
      <textarea aria-label="Configuration" />
    </ConfigEditor>
  );

  expect(markup).toContain('id="embedded-config"');
  expect(markup).not.toContain('role="tablist"');
  expect(markup).not.toContain('role="tabpanel"');
});

test('renders host actions in the header without making them part of the tablist', () => {
  const markup = renderToStaticMarkup(
    <ConfigEditor
      actions={<button type="button">Save</button>}
      activeView="source"
      onActiveViewChange={() => undefined}
      views={views}
    >
      <textarea aria-label="Configuration" />
    </ConfigEditor>
  );

  expect(markup).toContain('stp-config-editor__actions');
  expect(markup).toContain('>Save</button>');
});
