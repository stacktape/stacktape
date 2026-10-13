import { describe, expect, test } from 'bun:test';
import { escapeHtml } from './oauth-callback-page';

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
