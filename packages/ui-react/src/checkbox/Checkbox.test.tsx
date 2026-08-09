import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Checkbox } from './Checkbox.js';

test('associates its native input with the visible label', () => {
  const markup = renderToStaticMarkup(<Checkbox id="terms" label="Accept terms" name="terms" />);

  expect(markup).toContain('for="terms"');
  expect(markup).toContain('id="terms"');
  expect(markup).toContain('type="checkbox"');
});
