import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Badge, CountBadge } from './Badge.js';

test('encodes badge meaning as stable semantic classes', () => {
  const markup = renderToStaticMarkup(<Badge tone="success">Ready</Badge>);

  expect(markup).toContain('stp-ui-badge--success');
  expect(markup).toContain('stp-ui-badge--soft');
  expect(markup).toContain('>Ready</span>');
});

test('count badges cap large values and expose a compact variant', () => {
  const markup = renderToStaticMarkup(<CountBadge isCompact value={128} />);

  expect(markup).toContain('stp-ui-count-badge--compact');
  expect(markup).toContain('99+');
});
