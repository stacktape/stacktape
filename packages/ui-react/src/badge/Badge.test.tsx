import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Badge, CountBadge } from './Badge.js';

test('encodes badge meaning as stable semantic classes', () => {
  const markup = renderToStaticMarkup(<Badge tone="success">Ready</Badge>);

  expect(markup).toContain('stp-ui-badge--success');
  expect(markup).toContain('stp-ui-badge--soft');
  expect(markup).toContain('>Ready</span>');
});

test('count badges cap large values', () => {
  expect(renderToStaticMarkup(<CountBadge value={128} />)).toContain('>99+</span>');
});

test('the dot form of a count badge has no text', () => {
  const markup = renderToStaticMarkup(<CountBadge display="dot" value={7} />);

  expect(markup).toContain('stp-ui-count-badge--dot');
  expect(markup).toContain('aria-hidden="true"');
  expect(markup).not.toContain('>7<');
});
