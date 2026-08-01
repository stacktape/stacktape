/**
 * First Lambda of the packaging smoke fixture: a single-status lookup.
 *
 * Called through its function URL as `?status=503`. It answers from the shared catalog module, so a correct
 * response proves that this handler ran *and* that the shared module was packaged and executed with it.
 */

import { catalogIdentity, findStatus } from './status-catalog';

const HANDLER_NAME = 'retryAdvisor';

const json = (statusCode: number, payload: unknown) => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload, null, 2)
});

export const handler = async (event: { queryStringParameters?: Record<string, string | undefined> }) => {
  const requested = event?.queryStringParameters?.status ?? '503';
  const code = Number(requested);

  if (!Number.isInteger(code)) {
    return json(400, {
      handler: HANDLER_NAME,
      revision: process.env.CANARY_REVISION ?? 'base',
      catalog: catalogIdentity(),
      error: `"${requested}" is not an HTTP status code.`
    });
  }

  const status = findStatus(code);
  if (!status) {
    return json(404, {
      handler: HANDLER_NAME,
      revision: process.env.CANARY_REVISION ?? 'base',
      catalog: catalogIdentity(),
      error: `Status ${code} is not in the catalog.`
    });
  }

  return json(200, {
    handler: HANDLER_NAME,
    revision: process.env.CANARY_REVISION ?? 'base',
    catalog: catalogIdentity(),
    status,
    advice: status.retryable ? 'retry-with-backoff' : 'do-not-retry'
  });
};
