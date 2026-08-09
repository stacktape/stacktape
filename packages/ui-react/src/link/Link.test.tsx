import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Link, linkClassName } from './Link.js';

test('renders a router-neutral anchor with the shared appearance', () => {
  const markup = renderToStaticMarkup(<Link href="/docs">Docs</Link>);

  expect(markup).toContain('href="/docs"');
  expect(markup).toContain('stp-ui-link--accent');
  expect(markup).not.toContain('target=');
});

test('new-tab links receive a safe relationship by default', () => {
  const markup = renderToStaticMarkup(
    <Link href="https://stacktape.com" openInNewTab>
      Stacktape
    </Link>
  );

  expect(markup).toContain('target="_blank"');
  expect(markup).toContain('rel="noopener noreferrer"');
});

test('framework-owned links can reuse exactly the same classes', () => {
  expect(linkClassName({ tone: 'primary', underline: 'always', className: 'docs-link' })).toBe(
    'stp-ui-link stp-ui-link--primary stp-ui-link--underline-always docs-link'
  );
});
