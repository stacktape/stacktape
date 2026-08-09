import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { SectionLoader } from './SectionLoader';

test('renders nothing after loading has finished', () => {
  expect(renderToStaticMarkup(<SectionLoader isLoading={false} />)).toBe('');
});

test('reserves its final layout while the anti-flicker delay is active', () => {
  const markup = renderToStaticMarkup(<SectionLoader label="Loading deployments" />);

  expect(markup).toContain('aria-hidden="true"');
  expect(markup).toContain('stp-ui-section-loader--section');
  expect(markup).not.toContain('Loading deployments');
});

test('an immediately visible loader is an accessible live status', () => {
  const markup = renderToStaticMarkup(<SectionLoader delayMs={0} label="Loading deployments" size="compact" />);

  expect(markup).toContain('<output');
  expect(markup).toContain('aria-label="Loading deployments"');
  expect(markup).toContain('aria-live="polite"');
  expect(markup).toContain('stp-ui-section-loader--compact');
  expect(markup).toContain('Loading deployments');
});
