import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { IconButton, IconButtonLink } from './icon-button.tsx';

test('an icon-only button carries its accessible name', () => {
  const markup = renderToStaticMarkup(<IconButton icon={<svg data-icon />} label="Copy code" />);

  expect(markup).toStartWith('<button');
  expect(markup).toContain('aria-label="Copy code"');
  expect(markup).toContain('type="button"');
  expect(markup).toContain('data-icon');
});

test('it defaults to the secondary surface and takes any other variant', () => {
  expect(renderToStaticMarkup(<IconButton icon={null} label="Copy" />)).toContain('stp-ui-button--secondary');
  expect(renderToStaticMarkup(<IconButton icon={null} label="Delete" variant="danger" />)).toContain(
    'stp-ui-button--danger'
  );
});

test('loading replaces the icon, blocks activation and announces the busy state', () => {
  const markup = renderToStaticMarkup(<IconButton icon={<svg data-icon />} isLoading label="Refresh" />);

  expect(markup).toContain('disabled=""');
  expect(markup).toContain('aria-busy="true"');
  expect(markup).toContain('stp-ui-spinner');
  expect(markup).not.toContain('data-icon');
  // The label lives on the control, so it survives the icon being swapped out.
  expect(markup).toContain('aria-label="Refresh"');
});

test('an explicit size makes the control square at that pixel size', () => {
  const markup = renderToStaticMarkup(<IconButton icon={null} label="Show" size={30} />);

  expect(markup).toContain('width:30px');
  expect(markup).toContain('height:30px');
});

test('a caller style wins over the size shorthand', () => {
  const markup = renderToStaticMarkup(<IconButton icon={null} label="Show" size={30} style={{ height: '18px' }} />);

  expect(markup).toContain('width:30px');
  expect(markup).toContain('height:18px');
});

test('a navigating icon button is an anchor with the same accessible name', () => {
  const markup = renderToStaticMarkup(
    <IconButtonLink href="/projects" icon={<svg data-icon />} label="Open projects" />
  );

  expect(markup).toStartWith('<a');
  expect(markup).toContain('href="/projects"');
  expect(markup).toContain('aria-label="Open projects"');
  expect(markup).not.toContain('<button');
});
