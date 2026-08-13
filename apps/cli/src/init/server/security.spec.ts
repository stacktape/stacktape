import { describe, expect, it } from 'bun:test';
import {
  CONTENT_SECURITY_POLICY,
  createSessionSecrets,
  createToken,
  isSameOrigin,
  readCookie,
  secretsMatch,
  sessionCookie
} from './security';

describe('tokens', () => {
  it('are long and unguessable', () => {
    const token = createToken();

    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(createToken()).not.toBe(token);
  });

  it('gives a session three distinct secrets', () => {
    const secrets = createSessionSecrets();

    expect(new Set([secrets.handshakeToken, secrets.sessionToken, secrets.csrfToken]).size).toBe(3);
  });
});

describe('secretsMatch', () => {
  it('accepts an exact match and rejects anything else', () => {
    expect(secretsMatch('abc', 'abc')).toBe(true);
    expect(secretsMatch('abc', 'abd')).toBe(false);
  });

  it('rejects a length mismatch without throwing', () => {
    // timingSafeEqual throws on differing lengths; a shorter guess must be a plain rejection.
    expect(secretsMatch('abc', 'abcd')).toBe(false);
    expect(secretsMatch('', 'abc')).toBe(false);
  });
});

describe('isSameOrigin', () => {
  const port = 51234;

  it('accepts the loopback origins we serve', () => {
    for (const host of ['127.0.0.1', 'localhost', '[::1]']) {
      expect(isSameOrigin({ origin: `http://${host}:${port}`, host: `${host}:${port}`, port })).toBe(true);
    }
  });

  it('rejects a rebound hostname even though it resolves to loopback', () => {
    // This is the attack Origin checking exists for: an attacker controls DNS, not the Origin header.
    expect(isSameOrigin({ origin: 'http://evil.test', host: `evil.test:${port}`, port })).toBe(false);
    expect(isSameOrigin({ origin: 'http://evil.test', host: `127.0.0.1:${port}`, port })).toBe(false);
  });

  it('rejects the right host on the wrong port', () => {
    expect(isSameOrigin({ origin: `http://127.0.0.1:${port}`, host: '127.0.0.1:9999', port })).toBe(false);
  });

  it('allows a missing Origin only for a navigation', () => {
    // The browser sends no Origin when first loading the page, but anything carrying data must say
    // where it came from.
    expect(isSameOrigin({ origin: null, host: `127.0.0.1:${port}`, port, isNavigation: true })).toBe(true);
    expect(isSameOrigin({ origin: null, host: `127.0.0.1:${port}`, port })).toBe(false);
  });

  it('rejects a missing Host outright', () => {
    expect(isSameOrigin({ origin: `http://127.0.0.1:${port}`, host: null, port })).toBe(false);
  });
});

describe('content security policy', () => {
  it('denies everything by default and permits no remote origin', () => {
    // The page renders filenames, quotes and error text from a repository we do not control, so a
    // rendering bug must not be able to become script execution.
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("script-src 'self'");
    expect(CONTENT_SECURITY_POLICY).not.toContain('http://');
    expect(CONTENT_SECURITY_POLICY).not.toContain('https://');
  });

  it('never allows inline or evaluated script', () => {
    expect(CONTENT_SECURITY_POLICY).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(CONTENT_SECURITY_POLICY).not.toContain('unsafe-eval');
  });

  it('cannot be framed', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
  });
});

describe('session cookie', () => {
  it('is HttpOnly and strictly same-site', () => {
    const cookie = sessionCookie('secret-value');

    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    // No Secure flag: this is plain http on loopback, where it would stop the cookie being set.
    expect(cookie).not.toContain('Secure');
  });

  it('round-trips through a cookie header', () => {
    expect(readCookie(sessionCookie('abc'), 'stacktape_init')).toBe('abc');
    expect(readCookie('other=1; stacktape_init=xyz; more=2', 'stacktape_init')).toBe('xyz');
    expect(readCookie('other=1', 'stacktape_init')).toBeUndefined();
    expect(readCookie(null, 'stacktape_init')).toBeUndefined();
  });
});
