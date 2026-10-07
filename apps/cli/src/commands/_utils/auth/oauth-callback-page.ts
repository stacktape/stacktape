/**
 * The page the browser lands on when Google sign-in hands the result back to this machine.
 *
 * Served once by the loopback listener in `cognito-client.ts`, for the terminal `stacktape login` and
 * for the init wizard alike. It is self-contained: no external font, image or script, because the
 * listener serves exactly one path and the page must render with the CLI offline a moment later.
 */

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/** Makes a value safe to place in HTML text or a quoted attribute. */
export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]!);

/** A reason is shown to a person, so it is bounded: a query parameter can be any length. */
const MAX_REASON_LENGTH = 200;

export type OAuthCallbackPage = {
  /** Where the person started, which is where the page sends them back to. */
  returnTo: 'terminal' | 'wizard';
} & ({ outcome: 'success' } | { outcome: 'failure'; reason: string });

const RETURN_PLACE = { terminal: 'your terminal', wizard: 'the Stacktape wizard' } as const;

/** Values from `@stacktape/design-tokens`, inlined because this page cannot load a stylesheet. */
const STYLES = `
  html, body { height: 100%; }
  body {
    margin: 0;
    display: grid;
    place-items: center;
    background: rgb(22, 28, 28);
    color: rgba(255, 255, 255, 0.87);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
    font-size: 15px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  main { box-sizing: border-box; width: 100%; max-width: 440px; padding: 32px 28px; }
  .brand {
    margin: 0 0 28px;
    color: rgb(54, 190, 190);
    font-size: 0.76rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .mark { display: block; margin: 0 0 16px; }
  h1 { margin: 0; font-size: 1.5rem; font-weight: 650; line-height: 1.2; letter-spacing: -0.01em; }
  p { margin: 10px 0 0; color: rgb(160, 160, 160); }
  .reason { color: rgba(255, 255, 255, 0.87); overflow-wrap: anywhere; }
`;

const SUCCESS_MARK =
  '<svg class="mark" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="18" fill="rgb(54, 190, 190)" fill-opacity="0.16"/><path d="M11 18.5l4.6 4.6L25 13.6" fill="none" stroke="rgb(54, 190, 190)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const FAILURE_MARK =
  '<svg class="mark" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="18" fill="#eb6161" fill-opacity="0.16"/><path d="M12.5 12.5l11 11m0-11l-11 11" fill="none" stroke="#eb6161" stroke-width="2.4" stroke-linecap="round"/></svg>';

/**
 * The address carries a single-use authorization code. It is spent by the time this page renders, and
 * removing it keeps it out of the address bar and the tab's history anyway. A successful tab then
 * closes itself, which a browser allows when a script opened it (the wizard) and ignores otherwise
 * (the terminal, where the operating system opened it) — so the sentence on the page stays true.
 */
const SCRIPT_BY_OUTCOME = {
  success: "history.replaceState(null, '', '/callback'); setTimeout(function () { window.close(); }, 900);",
  failure: "history.replaceState(null, '', '/callback');"
} as const;

/**
 * The response headers for the page. Inline style and script are admitted by nonce and nothing else
 * may load, so an escaping mistake in the page cannot turn into script execution on this origin.
 */
export const oauthCallbackHeaders = (nonce: string): Record<string, string> => ({
  'Content-Type': 'text/html; charset=utf-8',
  'Content-Security-Policy': `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  // The listener closes after this response; a kept-alive socket would hold its port open.
  Connection: 'close'
});

export const renderOAuthCallbackPage = (page: OAuthCallbackPage, nonce: string): string => {
  const place = RETURN_PLACE[page.returnTo];
  const body =
    page.outcome === 'success'
      ? `${SUCCESS_MARK}
      <h1>Signed in</h1>
      <p>Google sign-in worked. You can close this tab and return to ${place}.</p>`
      : `${FAILURE_MARK}
      <h1>Sign-in did not finish</h1>
      <p>Reason: <span class="reason">${escapeHtml(page.reason.slice(0, MAX_REASON_LENGTH))}</span></p>
      <p>Nothing was changed. Close this tab and try again from ${place}.</p>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${page.outcome === 'success' ? 'Signed in' : 'Sign-in did not finish'} · Stacktape</title>
    <style nonce="${escapeHtml(nonce)}">${STYLES}</style>
  </head>
  <body>
    <main>
      <p class="brand">Stacktape</p>
      ${body}
    </main>
    <script nonce="${escapeHtml(nonce)}">${SCRIPT_BY_OUTCOME[page.outcome]}</script>
  </body>
</html>
`;
};
