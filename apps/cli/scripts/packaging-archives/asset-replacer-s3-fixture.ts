/** Records helper traffic and CloudFormation callbacks; forwards S3 to shared MiniStack.
 * The only synthetic S3 answers are deliberate 403 download/upload fault injection.
 * It runs in the emulator's network namespace, whose external route the fixture removes.
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { join } from 'node:path';

export const FIXTURE_PORT = 9000;
/** The name the acceptance gives this server once built for Node. */
export const FIXTURE_SERVER_FILE = 'asset-replacer-s3-fixture.mjs';
const MAX_BODY_BYTES = 64 * 1024 * 1024;

export type FixtureScenario = {
  name: string;
  bucket: string;
  getStatus?: 200 | 403 | undefined;
  putStatus?: 200 | 403 | undefined;
};

export type FixtureRequestRecord = {
  scenario: string;
  method: string;
  path: string;
  host: string;
  route: 'get-object' | 'put-object' | 'cloudformation-response' | 'unexpected';
  addressing?: 'path-style' | undefined;
  status: number;
  key?: string | undefined;
  headers: Record<string, string>;
  authorization?: { scheme: string; signedHeaders: string } | undefined;
  bodyBytes: number;
  /** For uploads: how the body was framed, the decoded length and which checksum was verified against which value. */
  upload?:
    | {
        framing: 'aws-chunked' | 'plain';
        decodedBytes: number;
        capture?: string | undefined;
      }
    | undefined;
  problem?: string | undefined;
};

const RECORDED_HEADERS = [
  'content-length',
  'content-type',
  'content-encoding',
  'content-md5',
  'transfer-encoding',
  'expect',
  'x-amz-content-sha256',
  'x-amz-decoded-content-length',
  'x-amz-trailer',
  'x-amz-sdk-checksum-algorithm',
  'x-amz-checksum-mode',
  'x-amz-checksum-crc32',
  'x-amz-checksum-crc32c',
  'x-amz-checksum-sha1',
  'x-amz-checksum-sha256',
  'user-agent'
];

const s3Error = (response: ServerResponse, status: number, code: string, message: string) => {
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<Error><Code>${code}</Code><Message>${message}</Message><RequestId>asset-replacer-fixture</RequestId></Error>`;
  response.writeHead(status, { 'content-type': 'application/xml', 'content-length': Buffer.byteLength(body) });
  response.end(body);
};

const readBody = (request: IncomingMessage) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('request body is larger than the fixture accepts'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });

/** Pass the original signed SDK request and response through; the emulator owns storage and S3 errors. */
const forward = (incoming: IncomingMessage, outgoing: ServerResponse, body: Buffer) =>
  new Promise<number>((resolve, reject) => {
    const upstream = httpRequest(
      {
        hostname: '127.0.0.1',
        port: 4566,
        path: incoming.url,
        method: incoming.method,
        headers: incoming.headers,
        timeout: 30_000
      },
      (response) => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(outgoing);
        response.on('end', () => resolve(response.statusCode ?? 502));
        response.on('error', reject);
      }
    );
    upstream.on('timeout', () => upstream.destroy(new Error('MiniStack request timed out')));
    upstream.on('error', reject);
    upstream.end(body);
  });

const main = () => {
  const directory = process.argv[2];
  if (!directory) throw new Error(`Usage: node ${FIXTURE_SERVER_FILE} <fixture directory>`);
  for (const child of ['captures', 'cfn']) mkdirSync(join(directory, child), { recursive: true });

  const handle = async (request: IncomingMessage, response: ServerResponse) => {
    const scenario = JSON.parse(readFileSync(join(directory, 'scenario.json'), 'utf8')) as FixtureScenario;
    const url = new URL(request.url ?? '/', 'http://fixture');
    const host = request.headers.host ?? '';
    const headers = Object.fromEntries(
      RECORDED_HEADERS.filter((name) => request.headers[name] !== undefined).map((name) => [
        name,
        String(request.headers[name])
      ])
    );
    const authorization = request.headers.authorization?.match(/^(\S+) .*SignedHeaders=([^,]+)/);
    const body = await readBody(request);
    const record: FixtureRequestRecord = {
      scenario: scenario.name,
      method: request.method ?? '',
      path: url.pathname + url.search,
      host,
      route: 'unexpected',
      status: 0,
      headers,
      ...(authorization ? { authorization: { scheme: authorization[1]!, signedHeaders: authorization[2]! } } : {}),
      bodyBytes: body.length
    };
    const finish = (status: number) => {
      record.status = status;
      appendFileSync(join(directory, 'requests.jsonl'), `${JSON.stringify(record)}\n`);
    };

    const cfn = url.pathname.match(/^\/cfn\/([\w.-]+)$/);
    if (cfn && request.method === 'PUT') {
      record.route = 'cloudformation-response';
      writeFileSync(join(directory, 'cfn', `${scenario.name}-${cfn[1]}.json`), body);
      response.writeHead(200, { 'content-length': 0 });
      response.end();
      finish(200);
      return;
    }

    // Path-style S3: the bucket is the first path segment; a virtual-host request would name it in the Host header.
    const [, bucket, ...keyParts] = url.pathname.split('/');
    const key = decodeURIComponent(keyParts.join('/'));
    // The SDK names the operation in an `x-id` parameter; any other query, such as a multipart upload's, is refused.
    const operation = { GET: 'GetObject', PUT: 'PutObject' }[request.method ?? ''];
    const queryIsOperationOnly =
      url.search === '' ||
      ([...url.searchParams.keys()].join() === 'x-id' && url.searchParams.get('x-id') === operation);
    const isS3Object =
      bucket === scenario.bucket && key !== '' && host.startsWith('127.0.0.1') && queryIsOperationOnly && !cfn;
    if (isS3Object && request.method === 'GET') {
      record.route = 'get-object';
      record.addressing = 'path-style';
      record.key = key;
      if (scenario.getStatus === 403) {
        s3Error(response, 403, 'AccessDenied', 'The fixture refuses this download.');
        finish(403);
        return;
      }
      const status = await forward(request, response, body);
      finish(status);
      return;
    }
    if (isS3Object && request.method === 'PUT') {
      record.route = 'put-object';
      record.addressing = 'path-style';
      record.key = key;
      if (scenario.putStatus === 403) {
        s3Error(response, 403, 'AccessDenied', 'The fixture refuses this upload.');
        finish(403);
        return;
      }
      // The host reads the persisted object through the real SDK after invocation, before extracting and running it.
      record.upload = {
        framing: String(request.headers['content-encoding'] ?? '').includes('aws-chunked') ? 'aws-chunked' : 'plain',
        decodedBytes: 0,
        capture: join('captures', `${scenario.name}.zip`)
      };
      finish(await forward(request, response, body));
      return;
    }

    record.problem =
      bucket !== scenario.bucket || !host.startsWith('127.0.0.1')
        ? 'not a path-style request for the scenario bucket'
        : url.search
          ? 'a query, such as a multipart upload, which the fixture does not support'
          : 'no such route';
    s3Error(response, 403, 'UnexpectedRequest', 'The asset replacer fixture does not serve this request.');
    finish(403);
  };

  const server = createServer((request, response) => {
    handle(request, response).catch((error: unknown) => {
      appendFileSync(
        join(directory, 'requests.jsonl'),
        `${JSON.stringify({ route: 'unexpected', problem: error instanceof Error ? error.message : String(error) })}\n`
      );
      if (!response.headersSent) response.writeHead(500);
      response.end();
    });
  });
  // No request may hang the acceptance: slow headers, bodies and idle connections are cut off.
  server.headersTimeout = 10_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 5_000;
  server.listen(FIXTURE_PORT, '127.0.0.1', () => console.info(`fixture listening on 127.0.0.1:${FIXTURE_PORT}`));
};

// Node has no `import.meta.main`, and the acceptance imports this module for its types and constants.
if (process.argv[1]?.endsWith(FIXTURE_SERVER_FILE)) {
  main();
}
