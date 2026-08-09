import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { TextField } from './TextField.js';

test('connects a validation message to the native input', () => {
  const markup = renderToStaticMarkup(<TextField id="email" label="Email" message="Required" messageTone="error" />);

  expect(markup).toContain('for="email"');
  expect(markup).toContain('aria-describedby="email-message"');
  expect(markup).toContain('id="email-message"');
});
