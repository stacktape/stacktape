import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Select } from './Select.js';

test('renders a labelled enhanced select without requiring a browser portal', () => {
  const region = { label: 'Europe', value: 'eu-west-1' };
  const markup = renderToStaticMarkup(<Select defaultValue={region} label="Region" name="region" options={[region]} />);

  expect(markup).toContain('for="region-input"');
  expect(markup).toContain('id="region-input"');
  expect(markup).toContain('Europe');
});
