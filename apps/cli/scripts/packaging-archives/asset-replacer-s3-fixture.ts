/**
 * The only network endpoint the service helper can reach during the asset replacer acceptance: a small S3 and
 * CloudFormation-response server. It runs with Node in a container that has no network, and the helper's container
 * shares that network namespace, so both see each other on 127.0.0.1 and nothing else, not even DNS.
 *
 * The acceptance writes `scenario.json` before each invocation. The server answers:
 *
 * - `GET /<bucket>/<key>`: the scenario's pristine object for that key, or the scenario's error status;
 * - `PUT /<bucket>/<key>`: a single-part upload. The body is decoded as the SDK framed it (`aws-chunked` or plain), its
 *   length and checksums are verified, and the decoded bytes are kept in `captures/`, unless the scenario refuses it;
 * - `PUT /cfn/<name>`: a CloudFormation custom-resource response, kept in `cfn/`.
 *
 * Anything else, including multipart uploads and virtual-host addressing, is refused and recorded as unexpected. Every
 * request is appended to `requests.jsonl` without credentials. The acceptance builds this file for Node and mounts it:
 *
 *   node asset-replacer-s3-fixture.mjs <fixture directory>
 */
import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { join } from 'node:path';
import { crc32 } from 'node:zlib';

export const FIXTURE_PORT = 9000;
/** The name the acceptance gives this server once built for Node. */
export const FIXTURE_SERVER_FILE = 'asset-replacer-s3-fixture.mjs';
const MAX_BODY_BYTES = 64 * 1024 * 1024;

export type FixtureScenario = {
  name: string;
  bucket: string;
  /** Object key → file below the fixture directory, served unchanged on every GET. */
  objects: Record<string, string>;
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
        declaredDecodedBytes: number | null;
        checksums: { algorithm: string; source: 'header' | 'trailer'; verified: boolean }[];
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

const CRC32C_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? (value >>> 1) ^ 0x82f63b78 : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

const crc32c = (bytes: Buffer) => {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value = CRC32C_TABLE[(value ^ byte) & 0xff]! ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
};

const uint32Base64 = (value: number) => {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32BE(value >>> 0);
  return bytes.toString('base64');
};

/** Base64 checksum values as S3 reports them, by the algorithm names S3 headers use. */
const CHECKSUMS: Record<string, (bytes: Buffer) => string> = {
  crc32: (bytes) => uint32Base64(crc32(bytes)),
  crc32c: (bytes) => uint32Base64(crc32c(bytes)),
  sha1: (bytes) => createHash('sha1').update(bytes).digest('base64'),
  sha256: (bytes) => createHash('sha256').update(bytes).digest('base64'),
  md5: (bytes) => createHash('md5').update(bytes).digest('base64')
};

/** Decodes an `aws-chunked` body: `<hex size>[;extensions]\r\n<data>\r\n` chunks, a zero chunk, then trailer lines. */
const decodeAwsChunked = (body: Buffer) => {
  const chunks: Buffer[] = [];
  const trailers: Record<string, string> = {};
  let offset = 0;
  const readLine = () => {
    const end = body.indexOf('\r\n', offset);
    if (end === -1) throw new Error('aws-chunked body ends inside a line');
    const line = body.toString('latin1', offset, end);
    offset = end + 2;
    return line;
  };
  for (;;) {
    const size = Number.parseInt(readLine().split(';')[0]!, 16);
    if (!Number.isFinite(size) || size < 0) throw new Error('aws-chunked body has an invalid chunk size');
    if (size === 0) break;
    if (offset + size + 2 > body.length || body.toString('latin1', offset + size, offset + size + 2) !== '\r\n') {
      throw new Error('aws-chunked chunk is not followed by CRLF');
    }
    chunks.push(body.subarray(offset, offset + size));
    offset += size + 2;
  }
  for (let line = readLine(); line !== ''; line = readLine()) {
    const separator = line.indexOf(':');
    trailers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
  }
  if (offset !== body.length) throw new Error('aws-chunked body has bytes after its trailer');
  return { decoded: Buffer.concat(chunks), trailers };
};

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

const main = () => {
  const directory = process.argv[2];
  if (!directory) throw new Error(`Usage: node ${FIXTURE_SERVER_FILE} <fixture directory>`);
  for (const child of ['captures', 'cfn']) mkdirSync(join(directory, child), { recursive: true });
  let captureCount = 0;

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
      const object = scenario.objects[key];
      if (!object) {
        s3Error(response, 404, 'NoSuchKey', 'The fixture has no such key.');
        finish(404);
        return;
      }
      if (scenario.getStatus === 403) {
        s3Error(response, 403, 'AccessDenied', 'The fixture refuses this download.');
        finish(403);
        return;
      }
      const bytes = readFileSync(join(directory, object));
      const responseHeaders: Record<string, string | number> = {
        'content-type': 'application/zip',
        'content-length': bytes.length,
        etag: `"${createHash('md5').update(bytes).digest('hex')}"`,
        'last-modified': new Date(0).toUTCString(),
        'accept-ranges': 'bytes'
      };
      // Returned when asked, as S3 does for an object stored with it, so the SDK's response validation runs.
      if (request.headers['x-amz-checksum-mode'] === 'ENABLED') {
        responseHeaders['x-amz-checksum-crc32'] = CHECKSUMS.crc32!(bytes);
      }
      response.writeHead(200, responseHeaders);
      response.end(bytes);
      finish(200);
      return;
    }
    if (isS3Object && request.method === 'PUT') {
      record.route = 'put-object';
      record.addressing = 'path-style';
      record.key = key;
      try {
        const chunked = String(request.headers['content-encoding'] ?? '')
          .split(',')
          .map((part) => part.trim())
          .includes('aws-chunked');
        const { decoded, trailers } = chunked ? decodeAwsChunked(body) : { decoded: body, trailers: {} };
        const declared = request.headers['x-amz-decoded-content-length'];
        const declaredDecodedBytes = declared === undefined ? null : Number(declared);
        if (declaredDecodedBytes !== null && declaredDecodedBytes !== decoded.length) {
          throw new Error(`decoded ${decoded.length} bytes, but the request declared ${declaredDecodedBytes}`);
        }
        const checksums: NonNullable<FixtureRequestRecord['upload']>['checksums'] = [];
        for (const [algorithm, compute] of Object.entries(CHECKSUMS)) {
          const headerName = algorithm === 'md5' ? 'content-md5' : `x-amz-checksum-${algorithm}`;
          for (const [source, value] of [
            ['header', request.headers[headerName]],
            ['trailer', trailers[headerName]]
          ] as const) {
            if (typeof value !== 'string') continue;
            const verified = value === compute(decoded);
            checksums.push({ algorithm, source, verified });
            if (!verified) throw new Error(`the ${algorithm} ${source} checksum does not match the decoded body`);
          }
        }
        record.upload = {
          framing: chunked ? 'aws-chunked' : 'plain',
          decodedBytes: decoded.length,
          declaredDecodedBytes,
          checksums
        };
        if (scenario.putStatus === 403) {
          s3Error(response, 403, 'AccessDenied', 'The fixture refuses this upload.');
          finish(403);
          return;
        }
        captureCount += 1;
        const capture = join('captures', `${scenario.name}-${captureCount}.zip`);
        writeFileSync(join(directory, capture), decoded);
        record.upload.capture = capture;
        response.writeHead(200, { etag: `"${createHash('md5').update(decoded).digest('hex')}"`, 'content-length': 0 });
        response.end();
        finish(200);
      } catch (error) {
        record.problem = error instanceof Error ? error.message : String(error);
        s3Error(response, 400, 'InvalidRequest', 'The fixture could not decode this upload.');
        finish(400);
      }
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
