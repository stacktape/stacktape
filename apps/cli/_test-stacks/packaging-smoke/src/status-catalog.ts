/**
 * The module both Lambdas of this fixture import.
 *
 * Stacktape's split bundler only lifts a chunk into a Lambda layer when at least two Node Lambdas import it and
 * the chunk is at least `DEFAULT_LAYER_CONFIG.minChunkSize` (1 KiB) large. The table below is therefore sized to
 * clear that threshold on its own; `tests/characterization/packaging-smoke-fixture.spec.ts` fails if it is
 * trimmed back under it, so the fixture cannot quietly stop exercising layering.
 *
 * The data is ordinary HTTP semantics: which status codes a client may safely resend, and why.
 *
 * The module imports nothing at all, not even a Node built-in, so what the bundler puts in the shared chunk is
 * exactly this file.
 */

export type StatusClass = 'informational' | 'success' | 'redirection' | 'client-error' | 'server-error';

export type StatusRecord = {
  code: number;
  reason: string;
  statusClass: StatusClass;
  /** Whether a client may resend the identical request without changing it first. */
  retryable: boolean;
  note: string;
};

export const HTTP_STATUS_CATALOG: readonly StatusRecord[] = [
  {
    code: 100,
    reason: 'Continue',
    statusClass: 'informational',
    retryable: false,
    note: 'Interim; keep sending the body.'
  },
  {
    code: 101,
    reason: 'Switching Protocols',
    statusClass: 'informational',
    retryable: false,
    note: 'The connection changes protocol.'
  },
  {
    code: 103,
    reason: 'Early Hints',
    statusClass: 'informational',
    retryable: false,
    note: 'Preload hints before the real response.'
  },
  { code: 200, reason: 'OK', statusClass: 'success', retryable: false, note: 'The request already succeeded.' },
  {
    code: 201,
    reason: 'Created',
    statusClass: 'success',
    retryable: false,
    note: 'Resending would create a second resource.'
  },
  {
    code: 202,
    reason: 'Accepted',
    statusClass: 'success',
    retryable: false,
    note: 'Poll the job instead of resending.'
  },
  { code: 204, reason: 'No Content', statusClass: 'success', retryable: false, note: 'Succeeded with an empty body.' },
  {
    code: 206,
    reason: 'Partial Content',
    statusClass: 'success',
    retryable: false,
    note: 'Request the next range, not the same one.'
  },
  {
    code: 301,
    reason: 'Moved Permanently',
    statusClass: 'redirection',
    retryable: false,
    note: 'Follow the new location and remember it.'
  },
  {
    code: 302,
    reason: 'Found',
    statusClass: 'redirection',
    retryable: false,
    note: 'Follow the new location for this call only.'
  },
  { code: 303, reason: 'See Other', statusClass: 'redirection', retryable: false, note: 'Fetch the result with GET.' },
  {
    code: 304,
    reason: 'Not Modified',
    statusClass: 'redirection',
    retryable: false,
    note: 'The cached copy is still valid.'
  },
  {
    code: 307,
    reason: 'Temporary Redirect',
    statusClass: 'redirection',
    retryable: false,
    note: 'Repeat at the new location, method intact.'
  },
  {
    code: 308,
    reason: 'Permanent Redirect',
    statusClass: 'redirection',
    retryable: false,
    note: 'Repeat at the new location from now on.'
  },
  {
    code: 400,
    reason: 'Bad Request',
    statusClass: 'client-error',
    retryable: false,
    note: 'Fix the request before sending it again.'
  },
  {
    code: 401,
    reason: 'Unauthorized',
    statusClass: 'client-error',
    retryable: false,
    note: 'Obtain credentials, then send a new request.'
  },
  {
    code: 402,
    reason: 'Payment Required',
    statusClass: 'client-error',
    retryable: false,
    note: 'Billing must be settled out of band.'
  },
  {
    code: 403,
    reason: 'Forbidden',
    statusClass: 'client-error',
    retryable: false,
    note: 'The identity lacks permission; retrying cannot help.'
  },
  {
    code: 404,
    reason: 'Not Found',
    statusClass: 'client-error',
    retryable: false,
    note: 'Nothing is served at that path.'
  },
  {
    code: 405,
    reason: 'Method Not Allowed',
    statusClass: 'client-error',
    retryable: false,
    note: 'Use one of the advertised methods.'
  },
  {
    code: 406,
    reason: 'Not Acceptable',
    statusClass: 'client-error',
    retryable: false,
    note: 'Negotiate a representation the server has.'
  },
  {
    code: 408,
    reason: 'Request Timeout',
    statusClass: 'client-error',
    retryable: true,
    note: 'The server gave up waiting; a fresh attempt is fine.'
  },
  {
    code: 409,
    reason: 'Conflict',
    statusClass: 'client-error',
    retryable: false,
    note: 'Re-read the current state and rebuild the request.'
  },
  {
    code: 410,
    reason: 'Gone',
    statusClass: 'client-error',
    retryable: false,
    note: 'The resource was removed deliberately.'
  },
  {
    code: 411,
    reason: 'Length Required',
    statusClass: 'client-error',
    retryable: false,
    note: 'Add a Content-Length header.'
  },
  {
    code: 412,
    reason: 'Precondition Failed',
    statusClass: 'client-error',
    retryable: false,
    note: 'The supplied precondition no longer holds.'
  },
  {
    code: 413,
    reason: 'Content Too Large',
    statusClass: 'client-error',
    retryable: false,
    note: 'Send a smaller payload.'
  },
  {
    code: 414,
    reason: 'URI Too Long',
    statusClass: 'client-error',
    retryable: false,
    note: 'Move the parameters into the body.'
  },
  {
    code: 415,
    reason: 'Unsupported Media Type',
    statusClass: 'client-error',
    retryable: false,
    note: 'Encode the body as a supported type.'
  },
  {
    code: 416,
    reason: 'Range Not Satisfiable',
    statusClass: 'client-error',
    retryable: false,
    note: 'Ask for a range the resource actually has.'
  },
  {
    code: 422,
    reason: 'Unprocessable Content',
    statusClass: 'client-error',
    retryable: false,
    note: 'The syntax parsed but the content is invalid.'
  },
  {
    code: 423,
    reason: 'Locked',
    statusClass: 'client-error',
    retryable: true,
    note: 'The lock is usually released shortly.'
  },
  {
    code: 425,
    reason: 'Too Early',
    statusClass: 'client-error',
    retryable: true,
    note: 'Resend once the handshake has completed.'
  },
  {
    code: 428,
    reason: 'Precondition Required',
    statusClass: 'client-error',
    retryable: false,
    note: 'Add a conditional header and resend.'
  },
  {
    code: 429,
    reason: 'Too Many Requests',
    statusClass: 'client-error',
    retryable: true,
    note: 'Back off, honouring Retry-After.'
  },
  {
    code: 431,
    reason: 'Request Header Fields Too Large',
    statusClass: 'client-error',
    retryable: false,
    note: 'Shrink the headers.'
  },
  {
    code: 451,
    reason: 'Unavailable For Legal Reasons',
    statusClass: 'client-error',
    retryable: false,
    note: 'Access is blocked by a legal demand.'
  },
  {
    code: 500,
    reason: 'Internal Server Error',
    statusClass: 'server-error',
    retryable: true,
    note: 'Unclassified server fault; retry with backoff.'
  },
  {
    code: 501,
    reason: 'Not Implemented',
    statusClass: 'server-error',
    retryable: false,
    note: 'The server never supports this method.'
  },
  {
    code: 502,
    reason: 'Bad Gateway',
    statusClass: 'server-error',
    retryable: true,
    note: 'An upstream hop failed; retry with backoff.'
  },
  {
    code: 503,
    reason: 'Service Unavailable',
    statusClass: 'server-error',
    retryable: true,
    note: 'Overloaded or draining; retry with backoff.'
  },
  {
    code: 504,
    reason: 'Gateway Timeout',
    statusClass: 'server-error',
    retryable: true,
    note: 'An upstream hop was too slow; retry with backoff.'
  },
  {
    code: 507,
    reason: 'Insufficient Storage',
    statusClass: 'server-error',
    retryable: false,
    note: 'The server is out of room; retrying will not help.'
  },
  {
    code: 508,
    reason: 'Loop Detected',
    statusClass: 'server-error',
    retryable: false,
    note: 'The request cycles; the caller must change it.'
  },
  {
    code: 511,
    reason: 'Network Authentication Required',
    statusClass: 'server-error',
    retryable: false,
    note: 'Sign in to the captive network first.'
  }
];

export const findStatus = (code: number): StatusRecord | undefined =>
  HTTP_STATUS_CATALOG.find((entry) => entry.code === code);

export const retryableCodes = (): number[] =>
  HTTP_STATUS_CATALOG.filter((entry) => entry.retryable).map((entry) => entry.code);

export const countByClass = (): Record<StatusClass, number> => {
  const counts: Record<StatusClass, number> = {
    informational: 0,
    success: 0,
    redirection: 0,
    'client-error': 0,
    'server-error': 0
  };
  for (const entry of HTTP_STATUS_CATALOG) {
    counts[entry.statusClass] += 1;
  }
  return counts;
};

/**
 * Identifies the exact catalog that was packaged. Both Lambdas return it, and the same value can be computed from
 * this source tree, so a deployed response proves which revision of this module actually ran. FNV-1a keeps the
 * module free of imports; it only has to notice an edit, not resist an adversary.
 */
export const catalogFingerprint = (): string => {
  const serialized = JSON.stringify(HTTP_STATUS_CATALOG);
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index++) {
    hash = Math.imul(hash ^ serialized.charCodeAt(index), 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

/** The shape both Lambdas embed in their response so the shared module can be identified from the outside. */
export const catalogIdentity = () => ({
  entryCount: HTTP_STATUS_CATALOG.length,
  fingerprint: catalogFingerprint()
});
