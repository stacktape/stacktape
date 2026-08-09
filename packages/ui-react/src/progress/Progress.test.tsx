import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Progress } from './Progress.js';

test('clamps progress values before rendering', () => {
  const markup = renderToStaticMarkup(<Progress max={4} value={8} />);

  expect(markup).toContain('max="4"');
  expect(markup).toContain('value="4"');
  expect(markup).toContain('100%');
});
