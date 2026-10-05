import { describe, expect, test } from 'bun:test';
import { escapeHtml, oauthCallbackHeaders, renderOAuthCallbackPage } from './oauth-callback-page';

describe('escapeHtml', () => {
  const cases: Array<[string, string]> = [
    ['access_denied', 'access_denied'],
    ['<script>alert(1)</script>', '&lt;script&gt;alert(1)&lt;/script&gt;'],
    ['" onmouseover="x', '&quot; onmouseover=&quot;x'],
    ["' onfocus='x", '&#39; onfocus=&#39;x'],
    ['a & b', 'a &amp; b'],
    // Already-escaped input is escaped again rather than trusted.
    ['&lt;b&gt;', '&amp;lt;b&amp;gt;']
  ];

  test.each(cases)('%s', (input, expected) => {
    expect(escapeHtml(input)).toBe(expected);
  });
});

describe('renderOAuthCallbackPage', () => {
  test('a success says where to go back to, and closes a tab the wizard opened', () => {
    const html = renderOAuthCallbackPage({ outcome: 'success', returnTo: 'wizard' }, 'nonce-1');

    expect(html).toContain('Signed in');
    expect(html).toContain('return to the Stacktape wizard');
    expect(html).toContain('window.close()');
    expect(renderOAuthCallbackPage({ outcome: 'success', returnTo: 'terminal' }, 'nonce-1')).toContain(
      'return to your terminal'
    );
  });

  test('a failure shows a bounded, escaped reason and stays open to be read', () => {
    const html = renderOAuthCallbackPage(
      { outcome: 'failure', returnTo: 'terminal', reason: `<b>${'x'.repeat(500)}` },
      'nonce-1'
    );

    expect(html).toContain('&lt;b&gt;');
    expect(html).not.toContain('<b>');
    expect(html).not.toContain('x'.repeat(201));
    expect(html).not.toContain('window.close()');
  });

  test('needs nothing from the network', () => {
    const html = renderOAuthCallbackPage({ outcome: 'success', returnTo: 'wizard' }, 'nonce-1');

    expect(html).not.toMatch(/(src|href)=/);
    expect(html).not.toContain('url(');
  });

  test('admits its own style and script by nonce, and nothing else', () => {
    const headers = oauthCallbackHeaders('nonce-1');
    const html = renderOAuthCallbackPage({ outcome: 'success', returnTo: 'wizard' }, 'nonce-1');

    expect(headers['Content-Security-Policy']).toContain("script-src 'nonce-nonce-1'");
    expect(headers['Content-Security-Policy']).toContain("default-src 'none'");
    expect(html).toContain('<script nonce="nonce-1">');
    expect(html).toContain('<style nonce="nonce-1">');
  });
});
