// The `writeRedirects` afterDeploy hook in `stacktape.ts`: makes the CloudFront KeyValueStore hold this checkout's
// redirect table. The CLI runs it after it has uploaded `dist`, so the store never sends a reader to a page the bucket
// does not hold yet. Running it again is safe: it changes only the keys that differ.
import { CloudFrontKeyValueStoreClient } from '@aws-sdk/client-cloudfront-keyvaluestore';
import { buildRedirectStoreEntries } from '../src/build/cdn-redirects.ts';
import { syncRedirectStore } from '../src/build/redirect-store-sync.ts';
import { CDN_REDIRECTS } from '../src/utils/site-redirects.ts';

const storeArn = process.env.REDIRECT_STORE_ARN;
if (!storeArn) throw new Error('REDIRECT_STORE_ARN is not set. Run this script through the writeRedirects hook.');

const wanted = buildRedirectStoreEntries(CDN_REDIRECTS);
const { deleted, put } = await syncRedirectStore({ client: new CloudFrontKeyValueStoreClient({}), storeArn, wanted });
console.info(`Redirect store ${storeArn}: ${Object.keys(wanted).length} redirects, ${deleted} deleted, ${put} put.`);
