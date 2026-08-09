import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Switch } from './Switch.js';

test('exposes checked and busy state accessibly', () => {
  const markup = renderToStaticMarkup(<Switch checked isBusy label="Guardrail" onCheckedChange={() => undefined} />);

  expect(markup).toContain('role="switch"');
  expect(markup).toContain('aria-checked="true"');
  expect(markup).toContain('aria-busy="true"');
  expect(markup).toContain('disabled=""');
});
