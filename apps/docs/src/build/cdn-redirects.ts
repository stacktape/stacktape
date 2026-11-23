/**
 * The production CDN answers the site's old URLs with a 301. Astro's static build renders each redirect as a
 * meta-refresh page, which browsers follow but which search engines treat as a weaker signal; the CDN answers first.
 *
 * The redirect table lives in a CloudFront KeyValueStore (old path → new URL), and a small CloudFront Function looks
 * every request up in it. The function code never changes with the table, so its 10 KB limit no longer caps the number
 * of redirects. `scripts/write-redirect-store.ts` writes the table into the store after each deploy (`stacktape.ts`).
 *
 * Keys are paths without the trailing slash and match with or without it, because Stacktape 3 docs served pages without
 * one. The query string is kept; browsers keep the fragment themselves.
 */

/** CloudFront rejects function code larger than 10 KB. */
export const CLOUDFRONT_FUNCTION_MAX_BYTES = 10 * 1024;

/** KeyValueStore quotas: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html */
export const KEY_VALUE_STORE_LIMITS = {
  maxKeyBytes: 512,
  maxValueBytes: 1024,
  maxStoreBytes: 5 * 1024 * 1024,
  /** Keys one `UpdateKeys` request may put or delete. */
  maxKeysPerUpdate: 50
};

/** Browsers cache a 301 without expiry unless told otherwise; an hour keeps a wrong redirect correctable. */
const REDIRECT_CACHE_CONTROL = 'public, max-age=3600';

/** The module the CloudFront Functions runtime provides for the associated KeyValueStore. */
export const REDIRECT_FUNCTION_IMPORT = "import cf from 'cloudfront';";

/**
 * The handler after the import. `cf.kvs()` reads the one store associated with the function. `get` throws for a key
 * that is not in the store: that request is not a redirect and continues to the bucket. If the store cannot be read,
 * the request continues too, and the bucket's meta-refresh page still redirects the reader.
 */
export const REDIRECT_FUNCTION_BODY = `
var redirects = cf.kvs();

async function handler(event) {
  var request = event.request;
  var path = request.uri.length > 1 ? request.uri.replace(/\\/+$/, '') : request.uri;
  var target;
  try {
    target = await redirects.get(path);
  } catch (error) {
    return request;
  }
  var query = [];
  for (var name in request.querystring) {
    var entry = request.querystring[name];
    (entry.multiValue || [entry]).forEach(function (item) {
      query.push(item.value === '' ? name : name + '=' + item.value);
    });
  }
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      location: { value: query.length ? target + '?' + query.join('&') : target },
      'cache-control': { value: '${REDIRECT_CACHE_CONTROL}' }
    }
  };
}
`;

/** CloudFront Functions JavaScript (runtime `cloudfront-js-2.0`) for a viewer-request association with the store. */
export const REDIRECT_FUNCTION_CODE = `${REDIRECT_FUNCTION_IMPORT}\n${REDIRECT_FUNCTION_BODY}`;

const withoutTrailingSlash = (path: string) => (path === '/' ? path : path.replace(/\/+$/, ''));

const FILE_TARGET = /\.\w+$/;

/**
 * The store's contents: each old path without its trailing slash → the URL to redirect to. Page targets end with a
 * slash; file targets such as `/sitemap-index.xml` keep their extension. Fails the build, not the deploy, when an entry
 * breaks a store quota or a target is neither a page nor a file.
 */
export const buildRedirectStoreEntries = (redirects: Record<string, string>): Record<string, string> => {
  const entries: Record<string, string> = {};
  let storeBytes = 0;
  for (const [from, to] of Object.entries(redirects)) {
    if (!FILE_TARGET.test(to) && (!to.endsWith('/') || FILE_TARGET.test(to.slice(0, -1)))) {
      throw new Error(`Redirect target ${to} (from ${from}) must be a page ending with a slash or a file.`);
    }
    const key = withoutTrailingSlash(from);
    if (key === '/' || !key.startsWith('/')) throw new Error(`Redirect source ${from} must be a path below /.`);
    if (entries[key] !== undefined && entries[key] !== to) {
      throw new Error(`${from} redirects to both ${entries[key]} and ${to}.`);
    }
    const keyBytes = Buffer.byteLength(key);
    const valueBytes = Buffer.byteLength(to);
    if (keyBytes > KEY_VALUE_STORE_LIMITS.maxKeyBytes) {
      throw new Error(`Redirect source ${from} is ${keyBytes} bytes; the store allows keys up to 512.`);
    }
    if (valueBytes > KEY_VALUE_STORE_LIMITS.maxValueBytes) {
      throw new Error(`Redirect target ${to} is ${valueBytes} bytes; the store allows values up to 1 KB.`);
    }
    storeBytes += keyBytes + valueBytes;
    entries[key] = to;
  }
  if (storeBytes > KEY_VALUE_STORE_LIMITS.maxStoreBytes) {
    throw new Error(`The redirect table is ${storeBytes} bytes; a KeyValueStore holds up to 5 MB.`);
  }
  return entries;
};

export type RedirectStoreUpdate = { deletes: { Key: string }[]; puts: { Key: string; Value: string }[] };

/**
 * The `UpdateKeys` requests that turn the store's current contents into the wanted ones, at most 50 keys each. Deletes
 * come first, so a page that moves back to a URL it once redirected from never sees both directions at once.
 */
export const planRedirectStoreUpdates = (
  current: Record<string, string>,
  wanted: Record<string, string>
): RedirectStoreUpdate[] => {
  const operations: { Key: string; Value?: string }[] = [
    ...Object.keys(current)
      .filter((key) => !Object.hasOwn(wanted, key))
      .map((key) => ({ Key: key })),
    ...Object.entries(wanted)
      .filter(([key, value]) => current[key] !== value)
      .map(([key, value]) => ({ Key: key, Value: value }))
  ];
  const batches: RedirectStoreUpdate[] = [];
  for (let start = 0; start < operations.length; start += KEY_VALUE_STORE_LIMITS.maxKeysPerUpdate) {
    const slice = operations.slice(start, start + KEY_VALUE_STORE_LIMITS.maxKeysPerUpdate);
    batches.push({
      deletes: slice.filter(({ Value }) => Value === undefined).map(({ Key }) => ({ Key })),
      puts: slice.flatMap(({ Key, Value }) => (Value === undefined ? [] : [{ Key, Value }]))
    });
  }
  return batches;
};
