# HostingBucketProps API Reference

Resource type: `hosting-bucket`

## TypeScript definition

```typescript
import type { CdnRouteRewrite, DirectoryUploadFilter, DomainConfiguration, EdgeFunctionsConfig, EnvironmentVar, HostingBucketBuild } from 'stacktape';

type HostingBucketProps = {
  /** Path to the build output directory (e.g., dist, build, out). */
  uploadDirectoryPath: string;
  /** Build command that produces the files to upload (e.g., npm run build). */
  build?: HostingBucketBuild;
  /** Custom domains (e.g., www.example.com). Stacktape auto-creates DNS records and TLS certificates. */
  customDomains?: Array<DomainConfiguration>;
  /** Dev server command for local development (e.g., npm run dev, vite). */
  dev?: HostingBucketBuild;
  /** Disable clean URL normalization (e.g., /about → /about.html). */
  disableUrlNormalization?: boolean;
  /** Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing). */
  edgeFunctions?: EdgeFunctionsConfig;
  /** Page to show for 404 errors (e.g., /error.html). */
  errorDocument?: string;
  /** Glob patterns for files to skip during upload (relative to uploadDirectoryPath). */
  excludeFilesPatterns?: Array<string>;
  /** Set HTTP headers (e.g., Cache-Control) for files matching specific patterns. */
  fileOptions?: Array<DirectoryUploadFilter>;
  /** Optimizes caching and routing for your type of frontend app. */
  hostingContentType?: "astro-static-website" | "gatsby-static-website" | "nuxt-static-website" | "single-page-app" | "static-website" | "sveltekit-static-website";
  /** Page served for requests to /. */
  indexDocument?: string;
  /** Inject deploy-time values into HTML files as window.STP_INJECTED_ENV.VARIABLE_NAME. */
  injectEnvironment?: Array<EnvironmentVar>;
  /** Route specific URL patterns to different origins (e.g., /api/* → a Lambda function). */
  routeRewrites?: Array<CdnRouteRewrite>;
  /** Name of a web-app-firewall resource to protect this site. Must have scope: cdn. */
  useFirewall?: string;
  /** Write deploy-time values to a .env file in the specified directory. */
  writeDotenvFilesTo?: string;
};
```

## Property: `uploadDirectoryPath`

- Required: yes
- Type: `string`

Path to the build output directory (e.g., `dist`, `build`, `out`).

This folder's contents are uploaded to the bucket on every deploy.

### Example 1 (yaml)

```yaml
resources:
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: single-page-app
      build:
        command: npm run build
```

### Example 2 (typescript)

```typescript
import { HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const frontend = new HostingBucket({
    uploadDirectoryPath: './dist',
    hostingContentType: 'single-page-app',
    build: { command: 'npm run build' }
  });
  return { resources: { frontend } };
});
```

## Property: `build`

- Required: no
- Type: `HostingBucketBuild`

Build command that produces the files to upload (e.g., `npm run build`).

Runs during the packaging phase, in parallel with other resources. Bundle size is shown in deploy logs.

### Example 1 (yaml)

```yaml
resources:
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: single-page-app
      build:
        command: npm run build
        workingDirectory: .
```

### Example 2 (typescript)

```typescript
import { HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const frontend = new HostingBucket({
    uploadDirectoryPath: './dist',
    hostingContentType: 'single-page-app',
    build: {
      command: 'npm run build',
      workingDirectory: '.'
    }
  });
  return { resources: { frontend } };
});
```

## Property: `customDomains`

- Required: no
- Type: `Array<DomainConfiguration>`

Custom domains (e.g., `www.example.com`). Stacktape auto-creates DNS records and TLS certificates.

Your domain must be added as a Route53 hosted zone in your AWS account first.

### Example 1 (yaml)

```yaml
resources:
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: single-page-app
      build:
        command: npm run build
      customDomains:
        - domainName: www.example.com
```

### Example 2 (typescript)

```typescript
import { HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const frontend = new HostingBucket({
    uploadDirectoryPath: './dist',
    hostingContentType: 'single-page-app',
    build: { command: 'npm run build' },
    customDomains: [{ domainName: 'www.example.com' }]
  });
  return { resources: { frontend } };
});
```

## Property: `dev`

- Required: no
- Type: `HostingBucketBuild`

Dev server command for local development (e.g., `npm run dev`, `vite`).

Used by `stacktape dev`.

### Example 1 (yaml)

```yaml
resources:
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: single-page-app
      build:
        command: npm run build
      dev:
        command: npm run dev
```

### Example 2 (typescript)

```typescript
import { HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const frontend = new HostingBucket({
    uploadDirectoryPath: './dist',
    hostingContentType: 'single-page-app',
    build: { command: 'npm run build' },
    dev: { command: 'npm run dev' }
  });
  return { resources: { frontend } };
});
```

## Property: `disableUrlNormalization`

- Required: no
- Type: `boolean`
- Default: `false`

Disable clean URL normalization (e.g., `/about` → `/about.html`).

### Example 1 (yaml)

```yaml
resources:
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./public
      hostingContentType: static-website
      build:
        command: npm run build
      disableUrlNormalization: true
```

### Example 2 (typescript)

```typescript
import { HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const frontend = new HostingBucket({
    uploadDirectoryPath: './public',
    hostingContentType: 'static-website',
    build: { command: 'npm run build' },
    disableUrlNormalization: true
  });
  return { resources: { frontend } };
});
```

## Property: `edgeFunctions`

- Required: no
- Type: `EdgeFunctionsConfig`

Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing).

`onRequest`: Before cache lookup and before forwarding to the bucket.
`onResponse`: Before returning the response to the client.

### Example 1 (yaml)

```yaml
resources:
  authChecker:
    type: edge-lambda-function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./edge/auth.ts
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: single-page-app
      build:
        command: npm run build
      edgeFunctions:
        onRequest: authChecker
```

### Example 2 (typescript)

```typescript
import { HostingBucket, EdgeLambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const authChecker = new EdgeLambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: './edge/auth.ts' }
    }
  });
  const frontend = new HostingBucket({
    uploadDirectoryPath: './dist',
    hostingContentType: 'single-page-app',
    build: { command: 'npm run build' },
    edgeFunctions: { onRequest: 'authChecker' }
  });
  return { resources: { authChecker, frontend } };
});
```

## Property: `errorDocument`

- Required: no
- Type: `string`

Page to show for 404 errors (e.g., `/error.html`).

### Example 1 (yaml)

```yaml
resources:
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: static-website
      build:
        command: npm run build
      errorDocument: /error.html
```

### Example 2 (typescript)

```typescript
import { HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const frontend = new HostingBucket({
    uploadDirectoryPath: './dist',
    hostingContentType: 'static-website',
    build: { command: 'npm run build' },
    errorDocument: '/error.html'
  });
  return { resources: { frontend } };
});
```

## Property: `excludeFilesPatterns`

- Required: no
- Type: `Array<string>`

Glob patterns for files to skip during upload (relative to `uploadDirectoryPath`).

### Example 1 (yaml)

```yaml
resources:
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: static-website
      build:
        command: npm run build
      excludeFilesPatterns:
        - '**/*.map'
        - 'stats.html'
```

### Example 2 (typescript)

```typescript
import { HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const frontend = new HostingBucket({
    uploadDirectoryPath: './dist',
    hostingContentType: 'static-website',
    build: { command: 'npm run build' },
    excludeFilesPatterns: ['**/*.map', 'stats.html']
  });
  return { resources: { frontend } };
});
```

## Property: `fileOptions`

- Required: no
- Type: `Array<DirectoryUploadFilter>`

Set HTTP headers (e.g., `Cache-Control`) for files matching specific patterns.

### Example 1 (yaml)

```yaml
resources:
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: single-page-app
      build:
        command: npm run build
      fileOptions:
        - includePattern: 'assets/**'
          headers:
            - key: Cache-Control
              value: 'public, max-age=31536000, immutable'
```

### Example 2 (typescript)

```typescript
import { HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const frontend = new HostingBucket({
    uploadDirectoryPath: './dist',
    hostingContentType: 'single-page-app',
    build: { command: 'npm run build' },
    fileOptions: [
      {
        includePattern: 'assets/**',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
      }
    ]
  });
  return { resources: { frontend } };
});
```

## Property: `hostingContentType`

- Required: no
- Type: `string: "astro-static-website" | "gatsby-static-website" | "nuxt-static-website" | "single-page-app" | "static-website" | "sveltekit-static-website"`
- Default: `static-website`

Optimizes caching and routing for your type of frontend app.

**`single-page-app`**: For React, Vue, Angular, or any SPA built with Vite/Webpack.
Enables client-side routing (e.g., `/about` serves `index.html`). HTML is never browser-cached;
hashed assets (`.js`, `.css`) are cached forever.

**`static-website`** (default): For multi-page static sites. All files are CDN-cached
but never browser-cached, so users always see the latest content after a deploy.

**`astro-static-website`** / **`sveltekit-static-website`** / **`nuxt-static-website`**:
Framework-specific presets that cache hashed build assets (`_astro/`, `_app/`, `_nuxt/`)
indefinitely while keeping HTML fresh.

**`gatsby-static-website`**: Gatsby-specific caching following their recommendations.

You can override any preset's behavior using `fileOptions`.

### Example 1 (yaml)

```yaml
resources:
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: single-page-app
      build:
        command: npm run build
```

### Example 2 (typescript)

```typescript
import { HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const frontend = new HostingBucket({
    uploadDirectoryPath: './dist',
    hostingContentType: 'single-page-app',
    build: { command: 'npm run build' }
  });
  return { resources: { frontend } };
});
```

## Property: `indexDocument`

- Required: no
- Type: `string`
- Default: `/index.html`

Page served for requests to `/`.

### Example 1 (yaml)

```yaml
resources:
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: static-website
      build:
        command: npm run build
      indexDocument: /index.html
```

### Example 2 (typescript)

```typescript
import { HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const frontend = new HostingBucket({
    uploadDirectoryPath: './dist',
    hostingContentType: 'static-website',
    build: { command: 'npm run build' },
    indexDocument: '/index.html'
  });
  return { resources: { frontend } };
});
```

## Property: `injectEnvironment`

- Required: no
- Type: `Array<EnvironmentVar>`

Inject deploy-time values into HTML files as `window.STP_INJECTED_ENV.VARIABLE_NAME`.

Useful for making API URLs, User Pool IDs, and other dynamic values
available to your frontend JavaScript without rebuilding.

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: single-page-app
      build:
        command: npm run build
      injectEnvironment:
        - name: API_URL
          value: $ResourceParam('apiGateway', 'url')
```

### Example 2 (typescript)

```typescript
import { HostingBucket, HttpApiGateway, defineConfig, $ResourceParam } from 'stacktape';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({});
  const frontend = new HostingBucket({
    uploadDirectoryPath: './dist',
    hostingContentType: 'single-page-app',
    build: { command: 'npm run build' },
    injectEnvironment: { API_URL: $ResourceParam('apiGateway', 'url') }
  });
  return { resources: { apiGateway, frontend } };
});
```

## Property: `routeRewrites`

- Required: no
- Type: `Array<CdnRouteRewrite>`

Route specific URL patterns to different origins (e.g., `/api/*` → a Lambda function).

Evaluated in order; first match wins. Unmatched requests go to the bucket.

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: single-page-app
      build:
        command: npm run build
      routeRewrites:
        - path: /api/*
          routeTo:
            type: http-api-gateway
            properties:
              httpApiGatewayName: apiGateway
```

### Example 2 (typescript)

```typescript
import { HostingBucket, HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({});
  const frontend = new HostingBucket({
    uploadDirectoryPath: './dist',
    hostingContentType: 'single-page-app',
    build: { command: 'npm run build' },
    routeRewrites: [
      {
        path: '/api/*',
        routeTo: {
          type: 'http-api-gateway',
          properties: { httpApiGatewayName: 'apiGateway' }
        }
      }
    ]
  });
  return { resources: { apiGateway, frontend } };
});
```

## Property: `useFirewall`

- Required: no
- Type: `string`

Name of a `web-app-firewall` resource to protect this site. Must have `scope: cdn`.

### Example 1 (yaml)

```yaml
resources:
  siteFirewall:
    type: web-app-firewall
    properties:
      scope: cdn
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: single-page-app
      build:
        command: npm run build
      useFirewall: siteFirewall
```

### Example 2 (typescript)

```typescript
import { HostingBucket, WebAppFirewall, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const siteFirewall = new WebAppFirewall({ scope: 'cdn' });
  const frontend = new HostingBucket({
    uploadDirectoryPath: './dist',
    hostingContentType: 'single-page-app',
    build: { command: 'npm run build' },
    useFirewall: 'siteFirewall'
  });
  return { resources: { siteFirewall, frontend } };
});
```

## Property: `writeDotenvFilesTo`

- Required: no
- Type: `string`

Write deploy-time values to a `.env` file in the specified directory.

Merges with existing `.env` content if the file already exists.

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: single-page-app
      build:
        command: npm run build
      injectEnvironment:
        - name: API_URL
          value: $ResourceParam('apiGateway', 'url')
      writeDotenvFilesTo: ./
```

### Example 2 (typescript)

```typescript
import { HostingBucket, HttpApiGateway, defineConfig, $ResourceParam } from 'stacktape';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({});
  const frontend = new HostingBucket({
    uploadDirectoryPath: './dist',
    hostingContentType: 'single-page-app',
    build: { command: 'npm run build' },
    injectEnvironment: { API_URL: $ResourceParam('apiGateway', 'url') },
    writeDotenvFilesTo: './'
  });
  return { resources: { apiGateway, frontend } };
});
```
