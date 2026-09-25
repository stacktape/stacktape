/**
 * Third Lambda of the packaging smoke fixture: the one that is packaged on its own.
 *
 * Its config sets `includeFiles`, which the split path does not implement, so this function takes the ordinary
 * per-Lambda buildpack while its two siblings share one build and a layer. A correct response therefore proves
 * both packaging paths ran in the same deployment, and that this one reached a file no import pulls in — the
 * notice is read from disk at runtime, not bundled.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalogIdentity } from './status-catalog';

const HANDLER_NAME = 'catalogNote';

/** `includeFiles` copies the notice next to the handler; nothing imports it, so only that copy puts it there. */
const readNotice = (): string => {
  try {
    return readFileSync(join(import.meta.dirname ?? __dirname, 'notice.txt'), 'utf8').trim();
  } catch {
    return 'MISSING';
  }
};

export const handler = async () => ({
  statusCode: 200,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(
    {
      handler: HANDLER_NAME,
      revision: process.env.CANARY_REVISION ?? 'base',
      catalog: catalogIdentity(),
      notice: readNotice()
    },
    null,
    2
  )
});
