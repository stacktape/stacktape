import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { randomBytes } from 'node:crypto';

/**
 * A new API Gateway stage answers some requests as if it did not exist for about half a minute after CloudFormation
 * created it. Measured in eu-west-3 (r2bg) from the stage's CREATE_COMPLETE: WebSocket handshakes alternated between
 * 101 and `403 {"message":"Forbidden"}` until 24-31 s, with runs of up to 11 s of successes before the last refusal; an
 * HTTP API route answered `404 {"message":"Not Found"}` until 33.5 s. A dev session reported ready within that window,
 * and the first browser connection failed (r2bc Shop).
 */
export const NEW_STAGE_SETTLE_MS = 45_000;
/** How long a session waits for a WebSocket stage that still refuses handshakes after it settled. */
export const WEBSOCKET_HANDSHAKE_TIMEOUT_MS = 60_000;
const HANDSHAKE_INTERVAL_MS = 1000;
/** Consecutive accepted handshakes that prove a stage created in this session serves connections. */
const FRESH_STAGE_ACCEPTED_HANDSHAKES = 3;
const HANDSHAKE_REQUEST_TIMEOUT_MS = 5000;

/**
 * - `accepted`: the stage answered the handshake itself: 101, or an answer from the API's own authorizer or `$connect`
 *   handler, such as 401 when the authorizer's identity source is missing.
 * - `not-deployed`: API Gateway's `403 {"message":"Forbidden"}` for a stage it does not know (yet).
 * - `unreachable`: a network error or no answer in time.
 */
export type HandshakeResult = 'accepted' | 'not-deployed' | 'unreachable';

/**
 * Opens a WebSocket handshake to the stage and closes it at once. A stage with a `$connect` route runs its handler, and
 * its `$disconnect` handler when the connection closes.
 */
export const probeWebSocketHandshake = (url: string): Promise<HandshakeResult> =>
  new Promise((resolve) => {
    const target = new URL(url);
    const secure = target.protocol === 'wss:' || target.protocol === 'https:';
    const request = (secure ? httpsRequest : httpRequest)(
      {
        host: target.hostname,
        port: target.port || (secure ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        method: 'GET',
        agent: false,
        headers: {
          Connection: 'Upgrade',
          Upgrade: 'websocket',
          'Sec-WebSocket-Version': '13',
          'Sec-WebSocket-Key': randomBytes(16).toString('base64'),
          'User-Agent': 'stacktape-dev-readiness-check'
        }
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () => {
          const unknownStage = response.statusCode === 403 && /"message"\s*:\s*"Forbidden"/.test(body);
          resolve(unknownStage ? 'not-deployed' : 'accepted');
        });
        response.on('error', () => resolve('unreachable'));
      }
    );
    request.on('upgrade', (_response, socket) => {
      socket.destroy();
      resolve('accepted');
    });
    request.on('error', () => resolve('unreachable'));
    request.setTimeout(HANDSHAKE_REQUEST_TIMEOUT_MS, () => {
      request.destroy();
      resolve('unreachable');
    });
    request.end();
  });

export type ApiStageReadiness = {
  ready: boolean;
  waitedMs: number;
  /** Set when the stage did not accept connections in time: the session goes on, and says what may fail. */
  note?: string;
};

/**
 * Waits until a WebSocket or HTTP API stage serves requests. A stage created at least {@link NEW_STAGE_SETTLE_MS} ago
 * needs no wait. A WebSocket stage is checked with real handshakes too, unless its `$connect` route requires IAM
 * signatures, which the check does not send: one accepted handshake for an older stage, several in a row for a new
 * one. An HTTP API is not called, since every request runs the application's code; it waits for the stage to settle.
 */
export const waitForApiStage = async ({
  kind,
  name,
  url,
  stageUpdatedAt,
  handshake = true,
  now = Date.now,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  probe = probeWebSocketHandshake
}: {
  kind: 'websocket' | 'http';
  /** The gateway's name in the config. */
  name: string;
  url?: string;
  /** When CloudFormation last created or updated the stage, by the same clock as `now`. */
  stageUpdatedAt?: number;
  /** `false` for a WebSocket API whose `$connect` route requires IAM signatures. */
  handshake?: boolean;
  now?: () => number;
  sleep?: (ms: number) => Promise<unknown>;
  probe?: (url: string) => Promise<HandshakeResult>;
}): Promise<ApiStageReadiness> => {
  const startedAt = now();
  const settledAt = stageUpdatedAt === undefined ? startedAt : stageUpdatedAt + NEW_STAGE_SETTLE_MS;
  const isNewStage = settledAt > startedAt;
  if (isNewStage) await sleep(settledAt - startedAt);
  if (kind === 'http' || !handshake || !url) return { ready: true, waitedMs: now() - startedAt };

  const required = isNewStage ? FRESH_STAGE_ACCEPTED_HANDSHAKES : 1;
  const deadline = now() + WEBSOCKET_HANDSHAKE_TIMEOUT_MS;
  let accepted = 0;
  let last: HandshakeResult = 'unreachable';
  for (;;) {
    last = await probe(url);
    accepted = last === 'accepted' ? accepted + 1 : 0;
    if (accepted >= required) return { ready: true, waitedMs: now() - startedAt };
    if (now() >= deadline) break;
    await sleep(HANDSHAKE_INTERVAL_MS);
  }
  const answer =
    last === 'not-deployed' ? 'still answers handshakes with HTTP 403 Forbidden' : 'does not answer handshakes';
  return {
    ready: false,
    waitedMs: now() - startedAt,
    note: `WebSocket API ${name} ${answer} after ${Math.round(WEBSOCKET_HANDSHAKE_TIMEOUT_MS / 1000)} s of checks (${url}). AWS may still be rolling out its stage: connections can fail for a short time. Reconnect if one does.`
  };
};
