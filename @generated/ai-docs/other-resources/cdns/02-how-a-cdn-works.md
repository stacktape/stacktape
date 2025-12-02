# How a CDN works

A _CDN_ acts as a layer between your application (the origin) and your clients.

- Instead of sending requests directly to your application, clients send them to the _CDN_.
- The _CDN_ routes the request to the nearest PoP.
- The PoP retrieves the response from your application (the origin).
- The PoP sends the response to the client and caches it for future requests.
- Subsequent requests for the same content can be served directly from the cache (a cache hit), which is much faster.

You can control which responses are cached and for how long. See the section on [cache control](./09-cache-control.md) for more information.