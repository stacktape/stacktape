import stripAnsi from 'strip-ansi';
import type { WizardState } from '../../src/init/server/wizard-server';

type JsonRecord = Record<string, unknown>;

export type InitWizardClient = {
  getState: () => Promise<WizardState>;
  post: (path: string, body?: JsonRecord) => Promise<WizardState>;
  waitForState: ({
    accept,
    label,
    timeoutMs
  }: {
    accept: (state: WizardState) => boolean;
    label: string;
    timeoutMs: number;
  }) => Promise<WizardState>;
};

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const wizardUrlPattern = /http:\/\/127\.0\.0\.1:\d+\/#token=[A-Za-z0-9_-]+/;

/** Extracts the one-time wizard URL without ever printing it from the canary. */
export const extractWizardUrl = (output: string): string | undefined => wizardUrlPattern.exec(stripAnsi(output))?.[0];

const parseJson = async (response: Response): Promise<JsonRecord> => {
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const detail =
      body !== null && typeof body === 'object' && typeof (body as JsonRecord).error === 'string'
        ? (body as JsonRecord).error
        : `HTTP ${response.status}`;
    throw new Error(`Wizard request failed: ${detail}`);
  }
  assert(body !== null && typeof body === 'object' && !Array.isArray(body), 'Wizard returned a non-object response.');
  return body as JsonRecord;
};

const stateFrom = (body: JsonRecord): WizardState => {
  const candidate = body.state ?? body;
  assert(candidate !== null && typeof candidate === 'object' && !Array.isArray(candidate), 'Wizard state is missing.');
  const state = candidate as WizardState;
  assert(typeof state.phase === 'string', 'Wizard state has no phase.');
  return state;
};

const sleep = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const requestSignal = (parent: AbortSignal | undefined, timeoutMs: number): AbortSignal => {
  const timeout = AbortSignal.timeout(timeoutMs);
  return parent === undefined ? timeout : AbortSignal.any([parent, timeout]);
};

/**
 * Spends the wizard's one-time handshake token and returns a cookie/CSRF-aware client.
 *
 * This drives the same localhost API as the React page. The token remains in memory only and is
 * deliberately absent from errors, logs, and the release scorecard.
 */
export const connectToInitWizard = async (
  wizardUrl: string,
  { signal, requestTimeoutMs = 15_000 }: { signal?: AbortSignal; requestTimeoutMs?: number } = {}
): Promise<InitWizardClient> => {
  const parsed = new URL(wizardUrl);
  assert(parsed.hostname === '127.0.0.1', 'Refusing to drive a wizard that is not bound to loopback.');
  assert(parsed.protocol === 'http:', 'The localhost wizard must use HTTP.');
  const token = new URLSearchParams(parsed.hash.slice(1)).get('token');
  assert(token, 'Wizard URL has no handshake token.');

  const origin = parsed.origin;
  const handshake = new URL('/api/handshake', origin);
  handshake.searchParams.set('token', token);
  const handshakeResponse = await fetch(handshake, {
    method: 'POST',
    headers: { Origin: origin },
    signal: requestSignal(signal, requestTimeoutMs)
  });
  const setCookie = handshakeResponse.headers.get('set-cookie');
  const cookie = setCookie?.split(';', 1)[0];
  const handshakeBody = await parseJson(handshakeResponse);
  const csrfToken = handshakeBody.csrfToken;
  assert(cookie, 'Wizard handshake did not set a session cookie.');
  assert(typeof csrfToken === 'string' && csrfToken.length > 0, 'Wizard handshake did not return a CSRF token.');

  const request = async ({ path, method, body }: { path: string; method: 'GET' | 'POST'; body?: JsonRecord }) => {
    const response = await fetch(new URL(path, origin), {
      method,
      headers: {
        Origin: origin,
        Cookie: cookie,
        ...(method === 'POST' ? { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken } : {})
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: requestSignal(signal, requestTimeoutMs)
    });
    return stateFrom(await parseJson(response));
  };

  const getState = () => request({ path: '/api/state', method: 'GET' });
  const post = (path: string, body?: JsonRecord) => request({ path, method: 'POST', ...(body ? { body } : {}) });

  return {
    getState,
    post,
    waitForState: async ({ accept, label, timeoutMs }) => {
      const deadline = Date.now() + timeoutMs;
      let latest = stateFrom(handshakeBody);
      while (!accept(latest)) {
        if (signal?.aborted) throw signal.reason;
        if (Date.now() >= deadline) throw new Error(`Timed out waiting for the wizard to ${label}.`);
        await sleep(500);
        latest = await getState();
      }
      return latest;
    }
  };
};
