/**
 * Who is allowed to talk to the wizard server.
 *
 * This server can read the user's repository and, later, create infrastructure in their AWS
 * account, and it is reachable over HTTP on their machine. Every other page in their browser can
 * send it requests. So the interesting threat is not someone on the network — it is a tab they
 * already have open.
 *
 * Three checks, each closing a different door:
 *
 * 1. **A one-time token**, handed to the browser in the URL fragment, exchanged once for a session
 *    cookie. A fragment is never sent to a server, so the token cannot leak through a proxy log or
 *    a `Referer` header, and single use means a URL left in shell history is spent.
 * 2. **Origin and Host validation**, which is what actually stops DNS rebinding: an attacker can
 *    make a hostname resolve to 127.0.0.1, but they cannot forge the `Origin` the browser sends.
 * 3. **A CSRF token on mutations**, because a cookie alone would let any page trigger one.
 */

import { randomBytes, timingSafeEqual } from 'node:crypto';

/** Long enough that guessing is hopeless, short enough to paste into a terminal. */
const TOKEN_BYTES = 32;

export const createToken = (): string => randomBytes(TOKEN_BYTES).toString('base64url');

/**
 * Compare two secrets without leaking their contents through timing.
 *
 * Length is compared first and separately: `timingSafeEqual` throws on a length mismatch, and a
 * mismatched length is not a secret worth protecting anyway.
 */
export const secretsMatch = (left: string, right: string): boolean => {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
};

export type SessionSecrets = {
  /** Handed out once in the URL fragment, then spent. */
  handshakeToken: string;
  /** Set as an HttpOnly cookie after the handshake. */
  sessionToken: string;
  /** Returned to the page and echoed on every mutation. */
  csrfToken: string;
};

export const createSessionSecrets = (): SessionSecrets => ({
  handshakeToken: createToken(),
  sessionToken: createToken(),
  csrfToken: createToken()
});

/**
 * Whether a request's `Origin` and `Host` name this server.
 *
 * A missing `Origin` is allowed only for navigations, which is how the browser first loads the page;
 * anything carrying data must declare where it came from. `Host` is checked against the port we are
 * actually listening on, so a rebound hostname resolving to loopback still fails.
 */
export const isSameOrigin = ({
  origin,
  host,
  port,
  secFetchSite,
  isNavigation = false
}: {
  origin: string | null;
  host: string | null;
  port: number;
  /**
   * The browser's own account of where the request came from.
   *
   * Needed because `Origin` is not sent on same-origin GETs — which is most of them. `EventSource`
   * opening the event stream carries no `Origin` at all, so an Origin-only check rejected the
   * wizard's own progress feed with a 403 and the page sat there empty. `Sec-Fetch-Site` is sent on
   * every request by every browser that matters and cannot be set by script, which makes it the
   * better primary signal.
   */
  secFetchSite?: string | null;
  isNavigation?: boolean;
}): boolean => {
  const expectedHosts = [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`];
  if (host === null || !expectedHosts.includes(host)) {
    return false;
  }

  // `none` means the user typed the address or used a bookmark; `same-origin` means our own page
  // issued it. Anything else — `cross-site`, `same-site` — is another page talking to us.
  if (secFetchSite !== undefined && secFetchSite !== null) {
    if (secFetchSite === 'same-origin') return true;
    if (secFetchSite === 'none') return isNavigation;
    return false;
  }

  if (origin === null) {
    return isNavigation;
  }
  return expectedHosts.some((expected) => origin === `http://${expected}`);
};

/**
 * The Content-Security-Policy the wizard is served under.
 *
 * `default-src 'none'` with everything else added back deliberately. The page renders filenames,
 * source quotes, diffs and error text that all came out of a repository we do not control, so a
 * rendering mistake is one bug away from script execution — and script execution here means an
 * attacker with the wizard's own authority over the repository and the user's AWS credentials.
 *
 * No remote origins at all: the bundle is embedded in the CLI, so anything reaching out to the
 * network is either a mistake or an attack. `connect-src 'self'` allows the API and the event
 * stream; `frame-ancestors 'none'` stops the page being embedded and clickjacked.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  // Monaco and the diagram inject stylesheets at runtime; 'unsafe-inline' for styles does not permit
  // script execution, which is the property that matters here.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join('; ');

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  // The wizard is not an embeddable widget and never should be.
  'X-Frame-Options': 'DENY',
  // Nothing here should ever be cached: it is one session's view of one machine.
  'Cache-Control': 'no-store'
};

export const sessionCookie = (token: string): string =>
  // HttpOnly so a rendering bug cannot read it; SameSite=Strict so another site cannot ride it;
  // no Secure flag because this is plain http on loopback, where it would prevent the cookie
  // being set at all.
  `stacktape_init=${token}; Path=/; HttpOnly; SameSite=Strict`;

export const readCookie = (header: string | null, name: string): string | undefined => {
  if (header === null) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return undefined;
};
