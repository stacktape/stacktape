/**
 * Writes the redirect table into the CloudFront KeyValueStore that the redirect function reads (`cdn-redirects.ts`).
 * `scripts/write-redirect-store.ts` runs it after each deploy. It deletes keys that left the table, puts new and changed
 * ones, and leaves the rest.
 */

// The KeyValueStore API accepts only SigV4A signatures. The SDK signs with this package once it is loaded.
// oxlint-disable-next-line import/no-unassigned-import
import '@aws-sdk/signature-v4a';
import {
  CloudFrontKeyValueStoreClient,
  DescribeKeyValueStoreCommand,
  paginateListKeys,
  UpdateKeysCommand
} from '@aws-sdk/client-cloudfront-keyvaluestore';
import { planRedirectStoreUpdates } from './cdn-redirects.ts';

/** Makes the store hold exactly `wanted`. Returns how many keys it deleted and put. */
export const syncRedirectStore = async ({
  client,
  storeArn,
  wanted
}: {
  client: CloudFrontKeyValueStoreClient;
  storeArn: string;
  wanted: Record<string, string>;
}) => {
  // Every update names the version it changes, read before the keys, so an edit made meanwhile fails the write
  // instead of being overwritten.
  let { ETag: version } = await client.send(new DescribeKeyValueStoreCommand({ KvsARN: storeArn }));
  const current: Record<string, string> = {};
  for await (const page of paginateListKeys({ client, pageSize: 50 }, { KvsARN: storeArn })) {
    for (const { Key, Value } of page.Items ?? []) if (Key !== undefined && Value !== undefined) current[Key] = Value;
  }
  const updates = planRedirectStoreUpdates(current, wanted);
  for (const { puts, deletes } of updates) {
    // oxlint-disable-next-line no-await-in-loop -- each update needs the version the previous one returned
    ({ ETag: version } = await client.send(
      new UpdateKeysCommand({ KvsARN: storeArn, IfMatch: version, Puts: puts, Deletes: deletes })
    ));
  }
  return {
    deleted: updates.reduce((sum, { deletes }) => sum + deletes.length, 0),
    put: updates.reduce((sum, { puts }) => sum + puts.length, 0)
  };
};
