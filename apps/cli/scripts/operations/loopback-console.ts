import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';
import type { CurrentUserAndOrgDataResponse } from '@stacktape/console-api/api-key';

/**
 * The Stacktape API procedures a day-2 CLI command reaches, answered on loopback the way the Console's tRPC batch
 * endpoint answers them (`/stacktape-api/<procedures>?batch=1`). Only the configured API key is accepted, except by the
 * anonymous procedures. Unknown procedures fail with NOT_FOUND and are recorded.
 *
 * Better Auth's routes under `/stacktape-api/auth/*` (the device authorization flow `stacktape login` uses) answer
 * only when a scenario registers them with `onAuth`; the request body is parsed as JSON and recorded.
 */

export const LOOPBACK_API_KEY = 'stp-operations-loopback-key';
export const OFFLINE_ACCOUNT_ID = '111122223333';

const TRPC_ERROR_CODES: Record<string, number> = {
  UNAUTHORIZED: -32001,
  FORBIDDEN: -32003,
  NOT_FOUND: -32004,
  INTERNAL_SERVER_ERROR: -32603
};
const TRPC_HTTP_STATUS: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

export type ConsoleCall = { procedure: string; input: unknown };
export type ConsoleHandler = (input: unknown) => unknown | Promise<unknown>;
export type AuthCall = { path: string; body: unknown };
export type AuthHandler = (
  body: unknown
) => { status: number; body: unknown } | Promise<{ status: number; body: unknown }>;

/** Procedures of the anonymous tRPC surface: they are answered without an API key. */
const ANONYMOUS_PROCEDURES = new Set(['exchangeTokenForApiKey', 'stackPriceEstimation']);

export class ConsoleProcedureError extends Error {
  constructor(
    readonly code: keyof typeof TRPC_ERROR_CODES,
    message: string
  ) {
    super(message);
  }
}

export const developerIdentity = ({
  projectName,
  role = 'OWNER',
  accountId = OFFLINE_ACCOUNT_ID
}: {
  projectName: string;
  role?: string;
  accountId?: string;
}): CurrentUserAndOrgDataResponse => ({
  user: { id: 'user_operations', name: 'Operations Tester', email: 'operations@example.test' },
  organization: { id: 'org_operations', name: 'Operations Org', role },
  connectedAwsAccounts: [
    {
      id: 'acc_operations',
      organizationId: 'org_operations',
      name: 'operations-account',
      awsAccountId: accountId,
      state: 'ACTIVE',
      primaryRegions: ['eu-west-1'],
      defaultRegion: 'eu-west-1',
      connectionMode: 'BASIC',
      securityScanning: 'OFF'
    }
  ],
  projects: [
    {
      id: 'prj_operations',
      organizationId: 'org_operations',
      name: projectName,
      configPath: null,
      defaultRegion: 'eu-west-1'
    }
  ],
  permissions: ['deployments:deploy', 'deployments:delete-non-production'],
  isProjectScoped: false
});

const readBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
};

export type LoopbackConsole = {
  endpoint: string;
  calls: ConsoleCall[];
  authCalls: AuthCall[];
  unexpected: string[];
  on: (procedure: string, handler: ConsoleHandler) => void;
  /** Answers `POST <endpoint>/auth<path>`, for example `/device/token`. */
  onAuth: (path: string, handler: AuthHandler) => void;
  close: () => Promise<void>;
};

/** Starts the configured Console procedures on a random loopback port. */
export const startLoopbackConsole = async ({ identity }: { identity: CurrentUserAndOrgDataResponse }) => {
  const handlers = new Map<string, ConsoleHandler>([
    ['currentUserAndOrgData', () => identity],
    ['recordStackOperation', () => ({ success: true })]
  ]);
  const calls: ConsoleCall[] = [];
  const authCalls: AuthCall[] = [];
  const authHandlers = new Map<string, AuthHandler>();
  const unexpected: string[] = [];
  const sockets = new Set<Socket>();

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (!url.pathname.startsWith('/stacktape-api/')) {
      unexpected.push(request.url ?? '/');
      response.writeHead(403, { 'content-type': 'text/plain' });
      response.end('Outbound requests are refused in this scenario.');
      return;
    }
    if (url.pathname.startsWith('/stacktape-api/auth/')) {
      const path = url.pathname.slice('/stacktape-api/auth'.length);
      const text = await readBody(request);
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        // Recorded as the raw text: a scenario asserting on the body sees what was sent.
      }
      authCalls.push({ path, body });
      const handler = request.method === 'POST' ? authHandlers.get(path) : undefined;
      if (!handler) {
        unexpected.push(`${request.method} ${url.pathname}`);
        response.writeHead(404, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ error: 'not_found' }));
        return;
      }
      const answer = await handler(body);
      response.writeHead(answer.status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(answer.body));
      return;
    }
    const procedures = decodeURIComponent(url.pathname.replace(/^\/stacktape-api\//, '')).split(',');
    const rawInput = request.method === 'POST' ? await readBody(request) : (url.searchParams.get('input') ?? '{}');
    const batchInput = JSON.parse(rawInput || '{}') as Record<string, unknown>;
    const apiKey = request.headers.stp_api_key;
    const items = await Promise.all(
      procedures.map(async (procedure, index) => {
        const input = batchInput[String(index)];
        calls.push({ procedure, input });
        const fail = (code: keyof typeof TRPC_ERROR_CODES, message: string) => ({
          status: TRPC_HTTP_STATUS[code],
          item: {
            error: { message, code: TRPC_ERROR_CODES[code], data: { code, httpStatus: TRPC_HTTP_STATUS[code] } }
          }
        });
        if (apiKey !== LOOPBACK_API_KEY && !ANONYMOUS_PROCEDURES.has(procedure)) {
          return fail('UNAUTHORIZED', 'Invalid API key.');
        }
        const handler = handlers.get(procedure);
        if (!handler) {
          unexpected.push(procedure);
          return fail('NOT_FOUND', `No procedure ${procedure}.`);
        }
        try {
          return { status: 200, item: { result: { data: (await handler(input)) ?? null } } };
        } catch (error) {
          if (error instanceof ConsoleProcedureError) return fail(error.code, error.message);
          return fail('INTERNAL_SERVER_ERROR', String(error));
        }
      })
    );
    const status = items.every(({ status: itemStatus }) => itemStatus === items[0].status) ? items[0].status : 207;
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(items.map(({ item }) => item)));
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    endpoint: `http://127.0.0.1:${port}/stacktape-api`,
    calls,
    authCalls,
    unexpected,
    on: (procedure, handler) => {
      handlers.set(procedure, handler);
    },
    onAuth: (path, handler) => {
      authHandlers.set(path, handler);
    },
    close: () =>
      new Promise<void>((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolve());
      })
  } satisfies LoopbackConsole;
};

/** The Better Auth session token the loopback device flow hands out. Distinctive, so a leak is found by one search. */
export const LOOPBACK_SESSION_TOKEN = 'better-auth-session-loopback-secret';
export const LOOPBACK_DEVICE_CODE = 'device-code-loopback-secret';
export const LOOPBACK_USER_CODE = 'WDJB-MJHT';
export const LOOPBACK_VERIFICATION_URI = 'https://console.stacktape.test/device';

/**
 * What the token endpoint answers to each poll, in order; the last answer repeats. `approve` returns the session
 * token, `unavailable` is a 503 without an OAuth error, and the rest are the RFC 8628 error codes.
 */
export type DevicePollAnswer =
  | 'authorization_pending'
  | 'slow_down'
  | 'expired_token'
  | 'access_denied'
  | 'approve'
  | 'unavailable';

/**
 * Registers Better Auth's device authorization routes on a loopback Console, answering polls from a script. A poll
 * that is not shaped as RFC 8628 requires (grant type, client ID, the issued device code) is refused with
 * `invalid_request`, so a scenario sees a client that sends the wrong request.
 */
export const scriptDeviceAuthorization = (
  api: LoopbackConsole,
  { answers, interval = 0.05, expiresIn = 120 }: { answers: DevicePollAnswer[]; interval?: number; expiresIn?: number }
) => {
  const polls: number[] = [];
  api.onAuth('/device/code', (body) => {
    const clientId = (body as { client_id?: unknown } | null)?.client_id;
    if (clientId !== 'stacktape-cli') return { status: 400, body: { error: 'invalid_client' } };
    return {
      status: 200,
      body: {
        device_code: LOOPBACK_DEVICE_CODE,
        user_code: LOOPBACK_USER_CODE,
        verification_uri: LOOPBACK_VERIFICATION_URI,
        verification_uri_complete: `${LOOPBACK_VERIFICATION_URI}?user_code=${LOOPBACK_USER_CODE}`,
        expires_in: expiresIn,
        interval
      }
    };
  });
  api.onAuth('/device/token', (body) => {
    const request = (body ?? {}) as Record<string, unknown>;
    if (
      request.grant_type !== 'urn:ietf:params:oauth:grant-type:device_code' ||
      request.client_id !== 'stacktape-cli' ||
      request.device_code !== LOOPBACK_DEVICE_CODE
    ) {
      return { status: 400, body: { error: 'invalid_request' } };
    }
    const answer = answers[Math.min(polls.length, answers.length - 1)];
    polls.push(Date.now());
    if (answer === 'approve') {
      return { status: 200, body: { access_token: LOOPBACK_SESSION_TOKEN, token_type: 'Bearer', expires_in: 300 } };
    }
    if (answer === 'unavailable') return { status: 503, body: { message: 'Service Unavailable' } };
    return { status: 400, body: { error: answer, error_description: `Loopback answer: ${answer}` } };
  });
  return { polls };
};
