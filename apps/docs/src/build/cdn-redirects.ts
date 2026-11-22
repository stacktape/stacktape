/**
 * The CloudFront Function that answers the site's old URLs with a 301. Astro's static build renders each redirect as a
 * meta-refresh page, which browsers follow but which search engines treat as a weaker signal; the CDN answers first.
 *
 * Keys match with or without the trailing slash, because Stacktape 3 docs served pages without one. The query string is
 * kept; browsers keep the fragment themselves.
 */

/** CloudFront rejects function code larger than 10 KB. */
export const CLOUDFRONT_FUNCTION_MAX_BYTES = 10 * 1024;

const withoutTrailingSlash = (path: string) => (path === '/' ? path : path.replace(/\/+$/, ''));

/** Browsers cache a 301 without expiry unless told otherwise; an hour keeps a wrong redirect correctable. */
const REDIRECT_CACHE_CONTROL = 'public, max-age=3600';

const HANDLER = `
function handler(event) {
  var request = event.request;
  var uri = request.uri.length > 1 ? request.uri.replace(/\\/+$/, '') : request.uri;
  var target = REDIRECTS[uri];
  if (target === undefined) return request;
  target += '/';
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
}`;

/** CloudFront Functions JavaScript (runtime `cloudfront-js-2.0`) for a viewer-request association. */
export const buildRedirectFunctionCode = (redirects: Record<string, string>): string => {
  // Every target ends with a slash; the handler adds it back, which keeps about one byte per redirect.
  const table = Object.fromEntries(
    Object.entries(redirects).map(([from, to]) => {
      if (!to.endsWith('/')) throw new Error(`Redirect target ${to} (from ${from}) must end with a slash.`);
      return [withoutTrailingSlash(from), to.slice(0, -1)];
    })
  );
  const code = `var REDIRECTS = ${JSON.stringify(table)};${HANDLER}\n`;
  const size = Buffer.byteLength(code);
  if (size > CLOUDFRONT_FUNCTION_MAX_BYTES) {
    throw new Error(
      `The redirect function is ${size} bytes; CloudFront allows ${CLOUDFRONT_FUNCTION_MAX_BYTES}. ` +
        'Move the table to a CloudFront KeyValueStore or drop old redirects.'
    );
  }
  return code;
};
