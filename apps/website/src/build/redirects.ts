import redirects from './site-redirects.json' with { type: 'json' };

const MAX_FUNCTION_BYTES = 10 * 1024;

export const redirectFunctionCode = () => {
  const code = `var redirects = ${JSON.stringify(redirects)};
function handler(event) {
  var request = event.request;
  var key = request.uri.replace(/\\/+$/, '') || '/';
  var destination = Object.prototype.hasOwnProperty.call(redirects, key) && redirects[key];
  if (!destination) return request;

  var query = [];
  Object.keys(request.querystring).forEach(function (name) {
    var parameter = request.querystring[name];
    (parameter.multiValue || [parameter]).forEach(function (item) {
      query.push(item.value ? name + '=' + item.value : name);
    });
  });
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      location: { value: destination + (query.length ? '?' + query.join('&') : '') },
      'cache-control': { value: 'public, max-age=3600' }
    }
  };
}`;
  if (Buffer.byteLength(code) > MAX_FUNCTION_BYTES)
    throw new Error('Website redirects exceed the CloudFront size limit.');
  return code;
};
