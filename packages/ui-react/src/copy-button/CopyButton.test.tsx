import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CopyButton, CopyIconButton, CopyStateIcon } from './CopyButton.tsx';

test('the icon draws all three glyphs and shows the one for its state', () => {
  const idle = renderToStaticMarkup(<CopyStateIcon state="idle" />);
  expect(idle.match(/<svg/g)).toHaveLength(3);
  expect(idle.match(/data-shown="true"/g)).toHaveLength(1);
  expect(idle).toContain('data-copy-state="idle"');

  const copied = renderToStaticMarkup(<CopyStateIcon state="copied" />);
  // The check mark is the second glyph.
  expect(copied.indexOf('data-shown')).toBeGreaterThan(copied.indexOf('<svg', copied.indexOf('<svg') + 1));
});

test('a labelled button reserves the other label, so it keeps its width', () => {
  const markup = renderToStaticMarkup(<CopyButton ariaLabel="Copy the account ID" value="481516234200" />);

  expect(markup).toContain('data-reserved="Copied"');
  expect(markup).toContain('aria-label="Copy the account ID"');
  expect(markup).toContain('<output aria-live="polite"');
});

test('an icon button is named by its label', () => {
  const markup = renderToStaticMarkup(<CopyIconButton label="Copy the command" tooltip={null} value="stacktape" />);

  expect(markup).toContain('aria-label="Copy the command"');
  expect(markup).toContain('stp-ui-button--plain');
});
