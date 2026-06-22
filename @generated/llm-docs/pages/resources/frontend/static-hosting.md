# Static Hosting

A Stacktape hosting-bucket deploys static frontend files to S3 and serves them through a CloudFront CDN. Use it for static sites, SPAs, and pre-rendered framework outputs where the deploy artifact is a directory of HTML, CSS, JavaScript, images, and other assets rather than a server process.

## When to use

A hosting-bucket is the best fit when your frontend build produces static files that can be uploaded as-is. Stacktape runs the optional build command, uploads the configured output directory on every deploy, and applies content presets for browser caching, CDN caching, and routing behavior.

- **Vite, React, Vue, Angular, or similar SPAs** — use the `single-page-app` preset so client-side routes like `/about` serve `index.html`.
- **Static marketing sites or documentation** — use the default `static-website` preset for multi-page sites where HTML should stay fresh after each deploy.
- **Static Astro, SvelteKit, Nuxt, or Gatsby output** — use the framework-specific preset so hashed build assets can be cached longer while HTML remains fresh.
- **Frontend-only apps that need deploy-time values** — use `injectEnvironment` or `writeDotenvFilesTo` to pass values such as API URLs or User Pool IDs without rebuilding after deployment.

## When NOT to use

- **Server-rendered frontend apps** — use [Next.js](/resources/frontend/nextjs), [Astro](/resources/frontend/astro), [Nuxt](/resources/frontend/nuxt), [SvelteKit](/resources/frontend/sveltekit), [SolidStart](/resources/frontend/solidstart), [TanStack Start](/resources/frontend/tanstack-start), or [Remix](/resources/frontend/remix) when the app needs a server runtime.
- **Public APIs or backend services** — use a [web-service](/resources/compute/web-service), [Lambda function](/resources/compute/lambda-function), or [HTTP API Gateway](/resources/networking/http-api-gateway) instead of trying to serve dynamic responses from static hosting.
- **Large object storage without a website** — use an [S3 bucket](/resources/storage/s3-bucket) when you need object storage rather than a CDN-backed website.
- **Advanced CDN-only routing** — use a dedicated [CDN](/resources/networking/cdn) when the primary concern is routing multiple origins rather than hosting one static site with optional rewrites.

## Basic example

This example builds a Vite-style frontend, uploads the `dist` directory, and uses the `single-page-app` preset so browser routes are handled by the frontend app.


Example (TypeScript):

```typescript
import { defineConfig, HostingBucket } from 'stacktape';
export default defineConfig(() => {
  const website = new HostingBucket({
    uploadDirectoryPath: './dist',
    build: {
      command: 'npm run build'
    },
    dev: {
      command: 'npm run dev'
    },
    hostingContentType: 'single-page-app'
  });

  return {
    resources: { website }
  };
});
```


`uploadDirectoryPath` points at the directory Stacktape uploads on every deploy. The optional `build.command` runs during packaging, and the optional `dev.command` is used by `stacktape dev`. The `single-page-app` preset is the important choice for React, Vue, Angular, and other client-routed apps.

## Build and dev

A hosting-bucket can run one command for deployment builds and a separate command for dev mode. Both commands use the same `HostingBucketBuild` shape: a required `command` and an optional `workingDirectory`, which defaults to the project root when omitted.

Use `build` when your static files are generated from source code. Skip `build` when `uploadDirectoryPath` already contains the files you want to upload, such as a directory produced by an external CI job. Use `dev` to tell `stacktape dev` which frontend development server command to run.


Example (TypeScript):

```typescript
import { defineConfig, HostingBucket } from 'stacktape';

export default defineConfig(() => {
  const website = new HostingBucket({
    uploadDirectoryPath: './apps/site/dist',
    build: {
      command: 'npm run build',
      workingDirectory: './apps/site'
    },
    dev: {
      command: 'npm run dev',
      workingDirectory: './apps/site'
    }
  });

  return { resources: { website } };
});
```


`workingDirectory` is useful in monorepos where the frontend package is not at the Stacktape project root. Keep the build output path aligned with the command: `uploadDirectoryPath` should point to the directory produced by the build command, not the source directory.

## Content presets

`hostingContentType` selects the caching and routing preset for the static site. The default is `static-website`; other supported presets are `single-page-app`, `astro-static-website`, `sveltekit-static-website`, `nuxt-static-website`, and `gatsby-static-website`.

| Preset | Best fit | Source-grounded behavior |
|--------|----------|--------------------------|
| `static-website` | Multi-page static sites | CDN-caches files but avoids browser-caching so users see current content after deploys. |
| `single-page-app` | React, Vue, Angular, Vite, Webpack SPAs | Serves `index.html` for client-side routes and caches hashed `.js` and `.css` assets indefinitely. |
| `astro-static-website` | Static Astro output | Caches hashed `_astro/` assets indefinitely while keeping HTML fresh. |
| `sveltekit-static-website` | Static SvelteKit output | Caches hashed `_app/` assets indefinitely while keeping HTML fresh. |
| `nuxt-static-website` | Static Nuxt output | Caches hashed `_nuxt/` assets indefinitely while keeping HTML fresh. |
| `gatsby-static-website` | Gatsby static output | Uses Gatsby-specific caching behavior following Gatsby recommendations. |

Use `fileOptions` when a preset is close but not exact. The source exposes `fileOptions` for setting HTTP headers such as `Cache-Control` on files matching specific patterns, so keep custom rules narrow and let the preset handle the rest.


Example (TypeScript):

```typescript
import { defineConfig, HostingBucket } from 'stacktape';

export default defineConfig(() => {
  const docs = new HostingBucket({
    uploadDirectoryPath: './public',
    hostingContentType: 'static-website',
    indexDocument: '/index.html',
    errorDocument: '/404.html'
  });

  return { resources: { docs } };
});
```


`indexDocument` controls the page served for `/` and defaults to `/index.html`. `errorDocument` sets the page shown for 404 errors — `/404.html` in the example above is only an example; set `errorDocument` to the path of the error page in your uploaded output directory. `disableUrlNormalization` is available when you do not want clean URL normalization such as `/about` resolving to `/about.html`.

## Custom domains

A hosting-bucket can serve static content from custom domains such as `www.example.com`. By default, Stacktape creates DNS records and provisions TLS certificates for configured domains; set `disableDnsRecordCreation` when DNS is managed elsewhere. The domain must already be added as a Route53 hosted zone in the AWS account.


Example (TypeScript):

```typescript
import { defineConfig, HostingBucket } from 'stacktape';

export default defineConfig(() => {
  const website = new HostingBucket({
    uploadDirectoryPath: './dist',
    customDomains: [
      {
        domainName: 'www.example.com'
      }
    ]
  });

  return { resources: { website } };
});
```


For most sites, prefer the default DNS-record and certificate behavior because it keeps the Stacktape config small. Set `customCertificateArn` only when you need to use a specific ACM certificate, and set `disableDnsRecordCreation` when DNS records are managed outside Stacktape, such as through another DNS provider.

## Environment injection

A hosting-bucket can expose deploy-time values to frontend code without requiring another frontend build. `injectEnvironment` writes values into HTML files as `window.STP_INJECTED_ENV.VARIABLE_NAME`, while `writeDotenvFilesTo` writes deploy-time values into a `.env` file in the specified directory.


Example (TypeScript):

```typescript
import { defineConfig, HostingBucket } from 'stacktape';

export default defineConfig(() => {
  const website = new HostingBucket({
    uploadDirectoryPath: './dist',
    injectEnvironment: {
      PUBLIC_API_URL: 'https://api.example.com'
    },
    writeDotenvFilesTo: './dist'
  });

  return { resources: { website } };
});
```


Use `injectEnvironment` for values that the browser reads at runtime from HTML. Use `writeDotenvFilesTo` when you want Stacktape to write deploy-time values to a `.env` file in the specified directory; existing `.env` content is merged if present.

## Routing

`routeRewrites` routes specific URL patterns to different origins, for example `/api/*` to a Lambda function. Rewrites are evaluated in order; unmatched requests go to the bucket. See the [API reference](#api-reference) for the exact `CdnRouteRewrite` fields.

Use route rewrites when a mostly static frontend needs a small number of backend paths under the same site hostname. Skip rewrites when the backend deserves its own API domain or when you are already using a server-rendered frontend resource that owns routing.

## Edge functions

A hosting-bucket can attach edge functions to CDN requests and responses for URL rewrites, authentication checks, A/B testing, or response changes. `onRequest` runs before the CDN cache lookup and before forwarding to the bucket; `onResponse` runs before returning the response to the client.

Use edge functions for small request or response decisions that must happen at the CDN layer. Keep application logic in a [Lambda function](/resources/compute/lambda-function) or backend service when the code needs normal backend dependencies, persistent state, or easier debugging. Edge code changes can make caching and routing harder to reason about, so most static sites should start without edge functions. The exact `EdgeFunctionsConfig` shape — including `onRequest` and `onResponse` sub-properties — is in the [API reference](#api-reference) below.

## Firewall

A hosting-bucket can reference a [web application firewall](/resources/security/web-application-firewall) by name through `useFirewall`. The referenced firewall must be a `web-app-firewall` resource with `scope: cdn`, because the hosting-bucket is protected at the CDN layer.

Enable a firewall for public static sites that need request filtering at the edge, especially when the same CDN hostname also routes API paths through `routeRewrites`. Skip it for low-risk internal previews and simple static pages where the default CDN behavior is enough. Keep the constraint scoped: `hosting-bucket.useFirewall` attaches a CDN-scoped firewall to this static site.

## File uploads

A hosting-bucket uploads the configured output directory on every deploy, and `excludeFilesPatterns` can skip files relative to `uploadDirectoryPath`. Use exclusion patterns for sourcemaps, local-only files, or generated artifacts that should not become public website objects.


Example (TypeScript):

```typescript
import { defineConfig, HostingBucket } from 'stacktape';

export default defineConfig(() => {
  const website = new HostingBucket({
    uploadDirectoryPath: './dist',
    excludeFilesPatterns: ['**/*.map', '**/.DS_Store']
  });

  return { resources: { website } };
});
```


Because static hosting publishes uploaded files through the CDN, use `excludeFilesPatterns` to avoid uploading known unwanted files; do not rely on a static-site output directory as a place to hold secrets.

## FAQ

### Which build output directory should I upload?

Set `uploadDirectoryPath` to the directory produced by your frontend build, such as `dist`, `build`, or `out`. Stacktape uploads that directory's contents on every deploy. If your build runs in a subdirectory, set `build.workingDirectory` and keep `uploadDirectoryPath` pointed at the resulting output folder.

### Which hostingContentType should I choose?

Use `single-page-app` for React, Vue, Angular, Vite, or Webpack apps with client-side routing — it serves `index.html` for routes like `/about` so browser refreshes and direct links work, and caches hashed assets indefinitely. Use the default `static-website` for ordinary multi-page sites, and use the framework-specific presets for static Astro, SvelteKit, Nuxt, or Gatsby outputs.

### Why does my custom domain fail to provision?

`customDomains` only works if the domain already exists as a Route53 hosted zone in the AWS account — Stacktape creates the DNS records and TLS certificate but does not register the zone for you. If DNS is managed elsewhere, set `disableDnsRecordCreation`, and set `customCertificateArn` to use a specific ACM certificate. For broader domain concepts, see [custom domains](/resources/networking/custom-domains).

### Can static hosting inject environment variables without rebuilding?

Yes. `injectEnvironment` exposes deploy-time values in HTML files as `window.STP_INJECTED_ENV.VARIABLE_NAME`, and `writeDotenvFilesTo` writes values to a `.env` file in a target directory (merging existing content) — both without a second frontend build. Use this for public frontend configuration such as API URLs, not for browser-inaccessible secrets. See [secrets](/configuration/secrets) for secret management.

### How much does S3 and CloudFront static hosting cost?

A hosting-bucket bills through the underlying AWS services it provisions — S3 storage and requests, plus CloudFront data transfer and CDN features — so cost scales with traffic and stored assets rather than a fixed price. Use [cost dashboards](/managing-costs/dashboards) after deployment to inspect actual stack spend.

### Static hosting vs S3 bucket: which should I use?

Use [static hosting](/resources/frontend/static-hosting) when you want a website: build command, upload directory, CDN behavior, content presets, custom domains, and frontend environment injection. Use an [S3 bucket](/resources/storage/s3-bucket) when you need general object storage for application data, uploads, backups, or private files.

### Can I route API requests from a static site?

Yes, `routeRewrites` routes specific URL patterns to different origins — for example, `/api/*` to a Lambda function — while unmatched requests go to the bucket. Rewrites are evaluated in order. See the [API reference](#api-reference) for the exact `CdnRouteRewrite` fields. For larger APIs, define the backend explicitly with [HTTP API Gateway](/resources/networking/http-api-gateway), [Lambda functions](/resources/compute/lambda-function), or [web services](/resources/compute/web-service).

## API Reference


## API Reference: `HostingBucketProps`
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

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `uploadDirectoryPath` | yes | `string` | Path to the build output directory (e.g., `dist`, `build`, `out`). This folder&#39;s contents are uploaded to the bucket on every deploy. | - |
| `build` | no | `HostingBucketBuild` | Build command that produces the files to upload (e.g., `npm run build`). Runs during the packaging phase, in parallel with other resources. Bundle size is shown in deploy logs. | - |
| `customDomains` | no | `Array<DomainConfiguration>` | Custom domains (e.g., `www.example.com`). Stacktape auto-creates DNS records and TLS certificates. Your domain must be added as a Route53 hosted zone in your AWS account first. | - |
| `dev` | no | `HostingBucketBuild` | Dev server command for local development (e.g., `npm run dev`, `vite`). Used by `stacktape dev`. | - |
| `disableUrlNormalization` | no | `boolean` | Disable clean URL normalization (e.g., `/about` → `/about.html`). | `false` |
| `edgeFunctions` | no | `EdgeFunctionsConfig` | Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing). `onRequest`: Before cache lookup and before forwarding to the bucket.
`onResponse`: Before returning the response to the client. | - |
| `errorDocument` | no | `string` | Page to show for 404 errors (e.g., `/error.html`). | - |
| `excludeFilesPatterns` | no | `Array<string>` | Glob patterns for files to skip during upload (relative to `uploadDirectoryPath`). | - |
| `fileOptions` | no | `Array<DirectoryUploadFilter>` | Set HTTP headers (e.g., `Cache-Control`) for files matching specific patterns. | - |
| `hostingContentType` | no | `string: "astro-static-website" \| "gatsby-static-website" \| "nuxt-static-website" \| "single-page-app" \| "static-website" \| "sveltekit-static-website"` | Optimizes caching and routing for your type of frontend app. **`single-page-app`**: For React, Vue, Angular, or any SPA built with Vite/Webpack.
Enables client-side routing (e.g., `/about` serves `index.html`). HTML is never browser-cached;
hashed assets (`.js`, `.css`) are cached forever.

**`static-website`** (default): For multi-page static sites. All files are CDN-cached
but never browser-cached, so users always see the latest content after a deploy.

**`astro-static-website`** / **`sveltekit-static-website`** / **`nuxt-static-website`**:
Framework-specific presets that cache hashed build assets (`_astro/`, `_app/`, `_nuxt/`)
indefinitely while keeping HTML fresh.

**`gatsby-static-website`**: Gatsby-specific caching following their recommendations.

You can override any preset&#39;s behavior using `fileOptions`. | `static-website` |
| `indexDocument` | no | `string` | Page served for requests to `/`. | `/index.html` |
| `injectEnvironment` | no | `Array<EnvironmentVar>` | Inject deploy-time values into HTML files as `window.STP_INJECTED_ENV.VARIABLE_NAME`. Useful for making API URLs, User Pool IDs, and other dynamic values
available to your frontend JavaScript without rebuilding. | - |
| `routeRewrites` | no | `Array<CdnRouteRewrite>` | Route specific URL patterns to different origins (e.g., `/api/*` → a Lambda function). Evaluated in order; first match wins. Unmatched requests go to the bucket. | - |
| `useFirewall` | no | `string` | Name of a `web-app-firewall` resource to protect this site. Must have `scope: cdn`. | - |
| `writeDotenvFilesTo` | no | `string` | Write deploy-time values to a `.env` file in the specified directory. Merges with existing `.env` content if the file already exists. | - |


## Referenceable parameters


## Referenceable Parameters: `hosting-bucket`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `name` | AWS (physical) name of the bucket | `$ResourceParam("<<resource-name>>", "name")` |
| `arn` | Arn of the bucket | `$ResourceParam("<<resource-name>>", "arn")` |
| `cdnDomain` | Default domain of the [CDN distribution](#cdn) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnDomain")` |
| `cdnUrl` | Default url of the [CDN distribution](#cdn) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnUrl")` |
| `cdnCustomDomains` | Comma-separated list of custom domain names assigned to the [CDN](#cdn)
(only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomains")` |
| `cdnCustomDomainUrls` | Comma-separated list of custom domain name URLs of the [CDN](#cdn)
(only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomainUrls")` |
