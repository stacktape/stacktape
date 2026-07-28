/**
 * Second Lambda of the packaging smoke fixture: a whole-catalog aggregation.
 *
 * It takes no input and reduces the shared catalog instead of looking a single entry up, so its response is
 * distinguishable from `retry-advisor`'s while reporting the same shared-module identity.
 */

import { catalogIdentity, countByClass, retryableCodes } from './status-catalog';

const HANDLER_NAME = 'catalogReport';

export const handler = async () => {
  const countsByClass = countByClass();

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(
      {
        handler: HANDLER_NAME,
        catalog: catalogIdentity(),
        countsByClass,
        retryableCodes: retryableCodes()
      },
      null,
      2
    )
  };
};
