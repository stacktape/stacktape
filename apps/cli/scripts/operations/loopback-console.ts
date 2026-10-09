import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';
import type { CurrentUserAndOrgDataResponse } from '@stacktape/console-api/api-key';

/**
 * The Stacktape API procedures a day-2 CLI command reaches, answered on loopback the way the Console's tRPC batch
 * endpoint answers them (`/stacktape-api/<procedures>?batch=1`). Only the configured API key is accepted. Unknown
 * procedures fail with NOT_FOUND and are recorded.
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
  role = 'OWNER'
}: {
  projectName: string;
  role?: string;
}): CurrentUserAndOrgDataResponse => ({
  user: { id: 'user_operations', name: 'Operations Tester', email: 'operations@example.test' },
  organization: { id: 'org_operations', name: 'Operations Org', role, securityScanningEnabled: false },
  connectedAwsAccounts: [
    {
      id: 'acc_operations',
      organizationId: 'org_operations',
      name: 'operations-account',
      awsAccountId: OFFLINE_ACCOUNT_ID,
      state: 'ACTIVE',
      primaryRegions: ['eu-west-1'],
      defaultRegion: 'eu-west-1',
      connectionMode: 'BASIC'
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
  unexpected: string[];
  on: (procedure: string, handler: ConsoleHandler) => void;
  close: () => Promise<void>;
};

/** Starts the configured Console procedures on a random loopback port. */
export const startLoopbackConsole = async ({ identity }: { identity: CurrentUserAndOrgDataResponse }) => {
  const handlers = new Map<string, ConsoleHandler>([
    ['currentUserAndOrgData', () => identity],
    ['recordStackOperation', () => ({ success: true })]
  ]);
  const calls: ConsoleCall[] = [];
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
        if (apiKey !== LOOPBACK_API_KEY) return fail('UNAUTHORIZED', 'Invalid API key.');
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
    unexpected,
    on: (procedure, handler) => {
      handlers.set(procedure, handler);
    },
    close: () =>
      new Promise<void>((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolve());
      })
  } satisfies LoopbackConsole;
};
