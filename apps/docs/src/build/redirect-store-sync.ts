/**
 * The Lambda behind the `redirectStore` custom resource in `stacktape.ts`. It writes the redirect table into the
 * CloudFront KeyValueStore that the redirect function reads (`cdn-redirects.ts`).
 *
 * CloudFormation calls it when the table or the store changes, including the update that rolls a failed deploy back,
 * which writes the previous table again. It deletes keys that left the table, puts new and changed ones, and leaves the
 * rest. The store is part of the stack, so deleting the resource leaves the store to CloudFormation.
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

/** `resourceProperties` of the custom resource. CloudFormation passes them to the handler as they are. */
export type RedirectStoreProperties = {
  storeArn: string;
  /** `[old path, new URL]` pairs from `buildRedirectStoreEntries`. */
  redirects: [string, string][];
};

type CustomResourceEvent = {
  RequestType: 'Create' | 'Update' | 'Delete';
  ResponseURL: string;
  StackId: string;
  RequestId: string;
  LogicalResourceId: string;
  PhysicalResourceId?: string;
  ResourceProperties: RedirectStoreProperties;
};

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
  // Every update names the version it changes, read before the keys, so an edit made meanwhile fails the deploy
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

/** Syncs the store and reports the result to CloudFormation, which waits for it. */
export const respondToStackEvent = async (event: CustomResourceEvent, client: CloudFrontKeyValueStoreClient) => {
  const { storeArn, redirects } = event.ResourceProperties;
  let status: 'SUCCESS' | 'FAILED' = 'SUCCESS';
  let reason = '';
  try {
    if (event.RequestType !== 'Delete') {
      const { deleted, put } = await syncRedirectStore({ client, storeArn, wanted: Object.fromEntries(redirects) });
      console.info(`Redirect store ${storeArn}: ${redirects.length} redirects, ${deleted} deleted, ${put} put.`);
    }
  } catch (error) {
    status = 'FAILED';
    reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error(error);
  }
  const response = await fetch(event.ResponseURL, {
    method: 'PUT',
    // The response URL is presigned without a content type.
    headers: { 'content-type': '' },
    body: JSON.stringify({
      Status: status,
      Reason: reason,
      // The store is the managed thing; a new store means a new resource, and the old one needs no cleanup.
      PhysicalResourceId: event.RequestType === 'Delete' ? event.PhysicalResourceId : storeArn,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId
    })
  });
  if (!response.ok) throw new Error(`Could not send the response to CloudFormation: ${response.status}`);
};

export default (event: CustomResourceEvent) => respondToStackEvent(event, new CloudFrontKeyValueStoreClient({}));
