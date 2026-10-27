import { STACKTAPE_TRPC_API_ENDPOINT } from 'src/config/params';

/**
 * Signing in to Stacktape with the OAuth device authorization flow (RFC 8628), served by Better Auth in the Stacktape
 * API under `<api>/auth`.
 *
 * The CLI asks for a device code, the person approves its user code on the Console's `/device` page, and the CLI polls
 * until it receives a short-lived Better Auth session token. The token is only exchanged for the CLI session
 * (`startApiKeyExchange`); it is never stored, printed or logged. Used by `stacktape login` and the init wizard alike,
 * so the waiting is a promise the caller observes rather than a terminal prompt.
 */

export const STACKTAPE_CLI_CLIENT_ID = 'stacktape-cli';
const DEVICE_CODE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';

const REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_INTERVAL_SECONDS = 5;
/** RFC 8628 section 3.5: every `slow_down` adds five seconds to the polling interval. */
const SLOW_DOWN_INCREMENT_SECONDS = 5;
const MAX_NETWORK_RETRY_DELAY_MS = 30_000;

export type DeviceSignInFailure = {
  ok: false;
  /**
   * `expired`: nobody approved the code in time. `denied`: the person refused it on the Console page. `network`: the
   * Stacktape API could not be reached. `failed`: the API answered with something this flow cannot continue from.
   */
  reason: 'expired' | 'denied' | 'network' | 'failed';
  detail?: string;
};

export type DeviceSignInOutcome = { ok: true; sessionToken: string } | DeviceSignInFailure;

export type DeviceSignIn = {
  ok: true;
  /** The code the person compares with the one the Console page shows. Safe to print. */
  userCode: string;
  /** The Console's `/device` page, for typing on another device. */
  verificationUri: string;
  /** The same page with the code filled in. This is the address to open. */
  verificationUriComplete: string;
  /** Milliseconds since the epoch. */
  expiresAt: number;
  /** Settles once with the session token or the reason there is none. Never rejects, and never settles after `cancel`. */
  completed: Promise<DeviceSignInOutcome>;
  /** Stops polling. Safe to call at any time, repeatedly. */
  cancel: () => void;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const CONNECTION_FAILURE =
  /fetch failed|unable to connect|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EPIPE|ConnectionRefused|ConnectionClosed|socket|network/i;

/** Whether a failed request never reached the API or got no answer from it, as opposed to an answer saying no. */
export const isNetworkFailure = (error: unknown): boolean => {
  for (let current = error, depth = 0; current !== undefined && current !== null && depth < 5; depth += 1) {
    if (!(current instanceof Error)) return false;
    const code = (current as { code?: unknown }).code;
    if (current.name === 'AbortError' || current.name === 'TimeoutError') return true;
    if (CONNECTION_FAILURE.test(current.message) || (typeof code === 'string' && CONNECTION_FAILURE.test(code))) {
      return true;
    }
    current = current.cause;
  }
  return false;
};

const authUrl = (endpoint: string, path: string) => `${endpoint.replace(/\/+$/, '')}/auth${path}`;

const post = async (url: string, body: Record<string, string>, signal?: AbortSignal) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal: signal === undefined ? timeout : AbortSignal.any([signal, timeout])
  });
  const text = await response.text();
  let json: unknown;
  try {
    json = text === '' ? undefined : JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: response.status, json };
};

/** A short, printable reason from an error answer, for the person to quote when asking for help. */
const describeAnswer = (status: number, json: unknown): string => {
  const parts = isRecord(json)
    ? [json.error, json.error_description, json.message].filter(
        (part): part is string => typeof part === 'string' && part !== ''
      )
    : [];
  const described = parts.length === 0 ? `HTTP ${status}` : parts.join(': ');
  return described.replace(/[^\x20-\x7E]/g, '').slice(0, 200);
};

/**
 * A web address the CLI may open or print: https, or http on loopback for a local Console, and without control
 * characters.
 */
const readAddress = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || /[^\x21-\x7E]/.test(value)) return undefined;
  try {
    const url = new URL(value);
    const isLoopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
    return url.protocol === 'https:' || (url.protocol === 'http:' && isLoopback) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

const positiveSeconds = (value: unknown, otherwise: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : otherwise;

const sleep = (milliseconds: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(done, milliseconds);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    }
    signal.addEventListener('abort', done, { once: true });
  });

const poll = async ({
  endpoint,
  deviceCode,
  intervalSeconds,
  expiresAt,
  signal
}: {
  endpoint: string;
  deviceCode: string;
  intervalSeconds: number;
  expiresAt: number;
  signal: AbortSignal;
}): Promise<DeviceSignInOutcome | undefined> => {
  let interval = intervalSeconds;
  let networkFailures = 0;
  let delay = interval * 1000;

  for (;;) {
    await sleep(Math.min(delay, Math.max(0, expiresAt - Date.now())), signal);
    if (signal.aborted) return undefined;
    if (Date.now() >= expiresAt) return { ok: false, reason: 'expired' };

    let answer: Awaited<ReturnType<typeof post>>;
    try {
      answer = await post(
        authUrl(endpoint, '/device/token'),
        { grant_type: DEVICE_CODE_GRANT_TYPE, device_code: deviceCode, client_id: STACKTAPE_CLI_CLIENT_ID },
        signal
      );
    } catch (error) {
      if (signal.aborted) return undefined;
      if (!isNetworkFailure(error)) {
        return { ok: false, reason: 'failed', detail: error instanceof Error ? error.message : undefined };
      }
      // A dropped connection or a laptop waking up: keep trying, more slowly, until the code expires.
      networkFailures += 1;
      delay = Math.max(interval * 1000, Math.min(1000 * 2 ** networkFailures, MAX_NETWORK_RETRY_DELAY_MS));
      continue;
    }
    if (signal.aborted) return undefined;

    if (answer.status >= 200 && answer.status < 300) {
      const token = isRecord(answer.json) ? answer.json.access_token : undefined;
      return typeof token === 'string' && token !== ''
        ? { ok: true, sessionToken: token }
        : { ok: false, reason: 'failed', detail: 'The sign-in was approved, but no session was returned.' };
    }

    const error = isRecord(answer.json) ? answer.json.error : undefined;
    if (error === 'authorization_pending') {
      networkFailures = 0;
      delay = interval * 1000;
      continue;
    }
    if (error === 'slow_down') {
      networkFailures = 0;
      interval += SLOW_DOWN_INCREMENT_SECONDS;
      delay = interval * 1000;
      continue;
    }
    if (error === 'expired_token') return { ok: false, reason: 'expired' };
    if (error === 'access_denied') return { ok: false, reason: 'denied' };
    if (answer.status >= 500 || answer.status === 429) {
      // The API is there but struggling; the code is still valid, so this is retried like a lost connection.
      networkFailures += 1;
      delay = Math.max(interval * 1000, Math.min(1000 * 2 ** networkFailures, MAX_NETWORK_RETRY_DELAY_MS));
      continue;
    }
    return { ok: false, reason: 'failed', detail: describeAnswer(answer.status, answer.json) };
  }
};

/**
 * Asks the Stacktape API for a device code and starts polling for its approval.
 *
 * Opening the browser is the caller's job: the terminal asks the operating system, and the init wizard's page opens a
 * tab from the person's click.
 */
export const startDeviceSignIn = async ({
  endpoint = STACKTAPE_TRPC_API_ENDPOINT
}: { endpoint?: string } = {}): Promise<DeviceSignIn | DeviceSignInFailure> => {
  let answer: Awaited<ReturnType<typeof post>>;
  try {
    answer = await post(authUrl(endpoint, '/device/code'), { client_id: STACKTAPE_CLI_CLIENT_ID });
  } catch (error) {
    return isNetworkFailure(error)
      ? { ok: false, reason: 'network' }
      : { ok: false, reason: 'failed', detail: error instanceof Error ? error.message : undefined };
  }
  if (answer.status < 200 || answer.status >= 300) {
    return answer.status >= 500
      ? { ok: false, reason: 'network', detail: describeAnswer(answer.status, answer.json) }
      : { ok: false, reason: 'failed', detail: describeAnswer(answer.status, answer.json) };
  }

  const body = isRecord(answer.json) ? answer.json : {};
  const deviceCode = body.device_code;
  const userCode = body.user_code;
  const verificationUri = readAddress(body.verification_uri);
  const verificationUriComplete = readAddress(body.verification_uri_complete) ?? verificationUri;
  if (
    typeof deviceCode !== 'string' ||
    deviceCode === '' ||
    typeof userCode !== 'string' ||
    !/^[A-Za-z0-9-]{4,32}$/.test(userCode) ||
    verificationUri === undefined ||
    verificationUriComplete === undefined
  ) {
    return {
      ok: false,
      reason: 'failed',
      detail: 'The Stacktape API answered the sign-in request in an unknown shape.'
    };
  }

  const expiresAt = Date.now() + positiveSeconds(body.expires_in, 300) * 1000;
  const cancellation = new AbortController();
  const completed = new Promise<DeviceSignInOutcome>((resolve) => {
    void poll({
      endpoint,
      deviceCode,
      intervalSeconds: positiveSeconds(body.interval, DEFAULT_INTERVAL_SECONDS),
      expiresAt,
      signal: cancellation.signal
    }).then(
      (outcome) => {
        // A cancelled attempt never settles: whoever cancelled it has moved on and must not hear from it again.
        if (outcome !== undefined) resolve(outcome);
      },
      (error: unknown) => {
        if (!cancellation.signal.aborted) {
          resolve({ ok: false, reason: 'failed', detail: error instanceof Error ? error.message : undefined });
        }
      }
    );
  });

  return {
    ok: true,
    userCode,
    verificationUri,
    verificationUriComplete,
    expiresAt,
    completed,
    cancel: () => cancellation.abort()
  };
};
