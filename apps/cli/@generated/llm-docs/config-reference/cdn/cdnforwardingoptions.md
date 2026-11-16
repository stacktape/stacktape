# CdnForwardingOptions API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
import type { CdnCustomRequestHeader, ForwardCookiesAll, ForwardCookiesNone, ForwardCookiesWhitelist, ForwardHeadersAllExcept, ForwardHeadersAllViewer, ForwardHeadersAllViewerAndWhitelistCloudFront, ForwardHeadersNone, ForwardHeadersWhitelist, ForwardQueryStringAll, ForwardQueryStringNone, ForwardQueryStringWhitelist } from 'stacktape';

type CdnForwardingOptions = {
  /** HTTP methods forwarded to the origin. Default: all methods. */
  allowedMethods?: Array<"DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT">;
  /** Which cookies to forward to the origin. Default: all cookies. */
  cookies?: CdnForwardingOptionsCookies;
  /** Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers). */
  customRequestHeaders?: Array<CdnCustomRequestHeader>;
  /** Which headers to forward to the origin. Default: all headers. */
  headers?: CdnForwardingOptionsHeaders;
  /** Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here. */
  originRequestPolicyId?: string;
  /** Which query params to forward to the origin. Default: all query params. */
  queryString?: CdnForwardingOptionsQueryString;
};

/** Union choices used by the properties above. */
type CdnForwardingOptionsCookies =
  | ForwardCookiesNone
  | ForwardCookiesWhitelist
  | ForwardCookiesAll;

type CdnForwardingOptionsHeaders =
  | ForwardHeadersNone
  | ForwardHeadersWhitelist
  | ForwardHeadersAllViewer
  | ForwardHeadersAllViewerAndWhitelistCloudFront
  | ForwardHeadersAllExcept;

type CdnForwardingOptionsQueryString =
  | ForwardQueryStringAll
  | ForwardQueryStringNone
  | ForwardQueryStringWhitelist;
```

## Property: `allowedMethods`

- Required: no
- Type: `Array<string: "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT">`

HTTP methods forwarded to the origin. Default: all methods.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      forwardingOptions:
        allowedMethods:
          - GET
          - HEAD
          - OPTIONS
          - POST
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    forwardingOptions: {
      allowedMethods: ['GET', 'HEAD', 'OPTIONS', 'POST']
    }
  }
});
return { resources: { api } };
});
```

## Property: `cookies`

- Required: no
- Type: `ForwardCookiesNone | ForwardCookiesWhitelist | ForwardCookiesAll`

Which cookies to forward to the origin. Default: all cookies.

Cookies in the cache key (see `cachingOptions`) are always forwarded regardless of this setting.

Choices:
- `ForwardCookiesNone` (`ForwardCookiesNone`). Properties: `none: boolean = true`.
- `ForwardCookiesWhitelist` (`ForwardCookiesWhitelist`). Properties: `whitelist: Array<string>`.
- `ForwardCookiesAll` (`ForwardCookiesAll`). Properties: `all: boolean = true`.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      forwardingOptions:
        cookies:
          whitelist:
            - sessionId
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    forwardingOptions: {
      cookies: { whitelist: ['sessionId'] }
    }
  }
});
return { resources: { api } };
});
```

## Property: `customRequestHeaders`

- Required: no
- Type: `Array<CdnCustomRequestHeader>`

Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers).

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      forwardingOptions:
        customRequestHeaders:
          - headerName: X-Forwarded-By
            value: stacktape-cdn
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    forwardingOptions: {
      customRequestHeaders: [{ headerName: 'X-Forwarded-By', value: 'stacktape-cdn' }]
    }
  }
});
return { resources: { api } };
});
```

## Property: `headers`

- Required: no
- Type: `ForwardHeadersNone | ForwardHeadersWhitelist | ForwardHeadersAllViewer | ForwardHeadersAllViewerAndWhitelistCloudFront | ForwardHeadersAllExcept`

Which headers to forward to the origin. Default: all headers.

The `Authorization` header must be added to `cachingOptions.cacheKeyParameters` to be forwarded.

Choices:
- `ForwardHeadersNone` (`ForwardHeadersNone`). Properties: `none: boolean = true`.
- `ForwardHeadersWhitelist` (`ForwardHeadersWhitelist`). Properties: `whitelist: Array<string>`.
- `ForwardHeadersAllViewer` (`ForwardHeadersAllViewer`). Properties: `allViewer: boolean = true`.
- `ForwardHeadersAllViewerAndWhitelistCloudFront` (`ForwardHeadersAllViewerAndWhitelistCloudFront`). Properties: `allViewerAndWhitelistCloudFront: Array<string>`.
- `ForwardHeadersAllExcept` (`ForwardHeadersAllExcept`). Properties: `allExcept: Array<string>`.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      forwardingOptions:
        headers:
          whitelist:
            - User-Agent
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    forwardingOptions: {
      headers: { whitelist: ['User-Agent'] }
    }
  }
});
return { resources: { api } };
});
```

## Property: `originRequestPolicyId`

- Required: no
- Type: `string`

Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      forwardingOptions:
        originRequestPolicyId: 88a5eaf4-2fd4-4709-b370-b4c650ea3fcf
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    forwardingOptions: {
      originRequestPolicyId: '88a5eaf4-2fd4-4709-b370-b4c650ea3fcf'
    }
  }
});
return { resources: { api } };
});
```

## Property: `queryString`

- Required: no
- Type: `ForwardQueryStringAll | ForwardQueryStringNone | ForwardQueryStringWhitelist`

Which query params to forward to the origin. Default: all query params.

Choices:
- `ForwardQueryStringAll` (`ForwardQueryStringAll`). Properties: `all: boolean = true`.
- `ForwardQueryStringNone` (`ForwardQueryStringNone`). Properties: `none: boolean = true`.
- `ForwardQueryStringWhitelist` (`ForwardQueryStringWhitelist`). Properties: `whitelist: Array<string>`.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      forwardingOptions:
        queryString:
          whitelist:
            - page
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    forwardingOptions: {
      queryString: { whitelist: ['page'] }
    }
  }
});
return { resources: { api } };
});
```
