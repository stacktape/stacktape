import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

/**
 * A scripted AWS endpoint on loopback for CLI process scenarios. Every SDK client in the child process reaches it
 * through `AWS_ENDPOINT_URL`; the request is identified by the SigV4 credential scope (the service) and by the query
 * `Action`, the JSON `x-amz-target` or the REST path (the operation). A scenario registers the operations it expects;
 * anything else is answered with HTTP 501 and recorded, so a scenario can assert that the CLI made no request it did
 * not anticipate.
 *
 * This proves how our code calls AWS and handles the answers, not how AWS behaves.
 */

export type AwsRequest = {
  service: string;
  operation: string;
  method: string;
  path: string;
  /** Parsed JSON body (JSON and REST-JSON protocols) or form parameters (query protocols). */
  input: Record<string, unknown>;
  rawBody: string;
};

export type AwsReply =
  | { kind: 'json'; body: unknown; status?: number }
  | { kind: 'xml'; operation: string; result: string }
  | { kind: 'error'; code: string; message: string; status?: number }
  | { kind: 'raw'; status: number; contentType: string; body: string }
  /** Never answers; the child process must give up or be interrupted. */
  | { kind: 'hang' };

export type AwsHandler = (request: AwsRequest) => AwsReply | Promise<AwsReply>;

const XML_NAMESPACES: Record<string, string> = {
  sts: 'https://sts.amazonaws.com/doc/2011-06-15/',
  cloudformation: 'http://cloudformation.amazonaws.com/doc/2010-05-15/'
};

const queryServices = new Set(['sts', 'cloudformation', 'ec2']);

const readBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
};

const serviceFromAuthorization = (request: IncomingMessage) => {
  const authorization = request.headers.authorization ?? '';
  // Credential=<key>/<date>/<region>/<service>/aws4_request
  return /Credential=[^/]+\/[^/]+\/[^/]+\/([^/]+)\/aws4_request/.exec(authorization)?.[1] ?? 'unknown';
};

const identify = (request: IncomingMessage, rawBody: string): AwsRequest => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const service = serviceFromAuthorization(request);
  const target = request.headers['x-amz-target'];
  const method = request.method ?? 'GET';
  if (typeof target === 'string') {
    return {
      service,
      operation: target.split('.').at(-1) ?? target,
      method,
      path: url.pathname,
      input: rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {},
      rawBody
    };
  }
  if (queryServices.has(service)) {
    const parameters = new URLSearchParams(rawBody || url.search);
    return {
      service,
      operation: parameters.get('Action') ?? 'UnknownAction',
      method,
      path: url.pathname,
      input: Object.fromEntries(parameters),
      rawBody
    };
  }
  let input: Record<string, unknown> = {};
  try {
    input = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
  } catch {}
  return { service, operation: `${method} ${url.pathname}`, method, path: url.pathname, input, rawBody };
};

const escapeXml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/** Serializes a value the way AWS query protocols do: lists as `<member>` elements, objects as nested elements. */
export const toQueryXml = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.map((item) => `<member>${toQueryXml(item)}</member>`).join('');
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => `<${key}>${toQueryXml(item)}</${key}>`)
      .join('');
  }
  return escapeXml(String(value));
};

const send = (response: ServerResponse, request: AwsRequest, reply: Exclude<AwsReply, { kind: 'hang' }>) => {
  const requestId = randomUUID();
  if (reply.kind === 'json') {
    response.writeHead(reply.status ?? 200, {
      'content-type': 'application/x-amz-json-1.1',
      'x-amzn-requestid': requestId
    });
    response.end(JSON.stringify(reply.body ?? {}));
    return;
  }
  if (reply.kind === 'xml') {
    const namespace = XML_NAMESPACES[request.service] ?? '';
    response.writeHead(200, { 'content-type': 'text/xml', 'x-amzn-requestid': requestId });
    response.end(
      `<?xml version="1.0" encoding="UTF-8"?><${reply.operation}Response xmlns="${namespace}"><${reply.operation}Result>${reply.result}</${reply.operation}Result><ResponseMetadata><RequestId>${requestId}</RequestId></ResponseMetadata></${reply.operation}Response>`
    );
    return;
  }
  if (reply.kind === 'error') {
    const status = reply.status ?? 400;
    if (queryServices.has(request.service)) {
      response.writeHead(status, { 'content-type': 'text/xml', 'x-amzn-requestid': requestId });
      response.end(
        `<?xml version="1.0" encoding="UTF-8"?><ErrorResponse><Error><Type>Sender</Type><Code>${escapeXml(reply.code)}</Code><Message>${escapeXml(reply.message)}</Message></Error><RequestId>${requestId}</RequestId></ErrorResponse>`
      );
      return;
    }
    response.writeHead(status, {
      'content-type': 'application/x-amz-json-1.1',
      'x-amzn-errortype': reply.code,
      'x-amzn-requestid': requestId
    });
    response.end(JSON.stringify({ __type: reply.code, message: reply.message }));
    return;
  }
  response.writeHead(reply.status, { 'content-type': reply.contentType, 'x-amzn-requestid': requestId });
  response.end(reply.body);
};

export type LoopbackAws = {
  endpoint: string;
  /** Every request the child sent, in order. */
  requests: AwsRequest[];
  /** Requests no handler answered. A scenario that did not expect them fails on this list. */
  unexpected: string[];
  /** Registers or replaces the answer for `service.Operation` (REST operations use `service.METHOD /path`). */
  on: (key: string, handler: AwsHandler) => void;
  callsTo: (key: string) => AwsRequest[];
  close: () => Promise<void>;
};

export const startLoopbackAws = async (): Promise<LoopbackAws> => {
  const handlers = new Map<string, AwsHandler>();
  const requests: AwsRequest[] = [];
  const unexpected: string[] = [];
  const hanging = new Set<ServerResponse>();

  const server = createServer(async (incoming, response) => {
    let request: AwsRequest | undefined;
    try {
      request = identify(incoming, await readBody(incoming));
      requests.push(request);
      const key = `${request.service}.${request.operation}`;
      const handler =
        handlers.get(key) ??
        [...handlers.entries()].find(([pattern]) => pattern.endsWith('*') && key.startsWith(pattern.slice(0, -1)))?.[1];
      if (!handler) {
        unexpected.push(key);
        send(response, request, {
          kind: 'raw',
          status: 501,
          contentType: 'application/json',
          body: JSON.stringify({ message: `The loopback AWS endpoint has no answer for ${key}.` })
        });
        return;
      }
      const reply = await handler(request);
      if (reply.kind === 'hang') {
        hanging.add(response);
        response.on('close', () => hanging.delete(response));
        return;
      }
      send(response, request, reply);
    } catch (error) {
      response.writeHead(500, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ message: `Loopback AWS handler failed: ${String(error)}` }));
      unexpected.push(`handler error for ${request?.service}.${request?.operation}: ${String(error)}`);
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    endpoint: `http://127.0.0.1:${port}`,
    requests,
    unexpected,
    on: (key, handler) => {
      handlers.set(key, handler);
    },
    callsTo: (key) => requests.filter(({ service, operation }) => `${service}.${operation}` === key),
    close: () =>
      new Promise<void>((resolve) => {
        for (const response of hanging) response.destroy();
        server.closeAllConnections();
        server.close(() => resolve());
      })
  };
};
