import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { RadioGroup } from './RadioGroup.js';

test('renders one named native radio per option', () => {
  const markup = renderToStaticMarkup(
    <RadioGroup name="region" onValueChange={() => undefined} options={[{ label: 'Europe', value: 'eu' }]} value="eu" />
  );

  expect(markup).toContain('type="radio"');
  expect(markup).toContain('name="region"');
  expect(markup).toContain('checked=""');
});
