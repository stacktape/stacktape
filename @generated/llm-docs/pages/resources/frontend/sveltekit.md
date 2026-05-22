# SvelteKit

A Stacktape SvelteKit resource deploys a SvelteKit SSR app with a Lambda-based server, S3-backed static assets, and a CloudFront CDN. Use `SvelteKitWeb` when you want to keep the SvelteKit app model while Stacktape manages the AWS hosting shape, including custom domains, environment variables, cache controls, and optional CDN-scoped firewall protection.

## When to use

Use a Stacktape SvelteKitWeb resource when your SvelteKit app needs server-side rendering, endpoint routes, form actions, or other runtime behavior that cannot be exported as static files. The resource is shaped around the standard SvelteKit project layout: Stacktape builds the app, uploads static assets, and runs SSR requests through a Lambda server function.

Common use cases:

- **SSR SvelteKit apps** — pages and endpoints that need request-time rendering or server-side data loading
- **Monorepos** — apps where the SvelteKit workspace lives below the Stacktape config and needs `appDirectory`
- **Custom domains** — public sites that need Route 53 DNS records and TLS certificates managed from Stacktape config
- **Protected frontends** — apps that should be protected at the CDN layer by a [web application firewall](/resources/security/web-application-firewall)
- **Apps using other stack resources** — frontends that need `connectTo` access to databases, buckets, queues, or auth pools

## When NOT to use

A Stacktape SvelteKitWeb resource is not the best fit when the app does not need a SvelteKit SSR runtime. Static-only SvelteKit sites should use [static hosting](/resources/frontend/static-hosting) with `hostingContentType: 'sveltekit-static-website'`, because an SSR Lambda function adds runtime behavior you are not using.

- **Static-only SvelteKit output** — use [static hosting](/resources/frontend/static-hosting) instead of deploying a server Lambda.
- **Non-Svelte frontend frameworks** — use the dedicated resource for [Next.js](/resources/frontend/nextjs), [Astro](/resources/frontend/astro), [Nuxt](/resources/frontend/nuxt), [SolidStart](/resources/frontend/solidstart), [TanStack Start](/resources/frontend/tanstack-start), or [Remix](/resources/frontend/remix).
- **Custom container servers** — use a [web-service](/resources/compute/web-service) when you want to run your own containerized HTTP server instead of the SvelteKit Lambda adapter path.
- **Backend APIs without a frontend app** — use a [Lambda function](/resources/compute/lambda-function), [web-service](/resources/compute/web-service), or [HTTP API Gateway](/resources/networking/http-api-gateway) depending on the runtime shape.

## Basic example

A minimal Stacktape SvelteKitWeb config points Stacktape at the directory containing `svelte.config.js`. If the Stacktape config file already lives at the SvelteKit app root, omit `appDirectory`; the default is `.`. In a monorepo, set `appDirectory` to the SvelteKit workspace directory.


Example (TypeScript):

```typescript
import { defineConfig, SvelteKitWeb } from 'stacktape';
export default defineConfig(() => {
  const frontend = new SvelteKitWeb({
    appDirectory: './apps/web'
  });

  return {
    resources: { frontend }
  };
});
```


The `frontend` resource builds the SvelteKit app from `./apps/web`, stores static assets in S3, serves them through CloudFront, and runs SSR requests through the generated server Lambda function.

## Project directory

The `appDirectory` property tells Stacktape where the SvelteKit project lives. Stacktape expects that directory to contain `svelte.config.js`; for monorepos, point `appDirectory` at the package or workspace that owns the SvelteKit app instead of the repository root.

Keep `appDirectory` boring. Most teams should set it once and leave it alone. If your repository has multiple frontend apps, define one frontend resource per app so each Stacktape resource has a clear build directory, custom domain set, and runtime configuration.

## Build commands

Stacktape uses `vite build` for SvelteKitWeb unless you override the build command. Set `buildCommand` when your package manager, workspace tooling, or build pipeline needs a different command, such as a workspace-scoped package script.


Example (TypeScript):

```typescript
import { defineConfig, SvelteKitWeb } from 'stacktape';

export default defineConfig(() => {
  const frontend = new SvelteKitWeb({
    appDirectory: './apps/web',
    buildCommand: 'pnpm build'
  });

  return { resources: { frontend } };
});
```


Use `buildCommand` for commands that must run from the SvelteKit app directory. For dev mode, the `dev` property customizes how `stacktape dev` starts the local SvelteKit dev server; when omitted, Stacktape uses `vite dev`.

## Domains

A Stacktape SvelteKitWeb resource can attach custom domains and let Stacktape manage the DNS record and TLS certificate. The domain must have a Route 53 hosted zone in the AWS account, and the domain name should be written without the `https://` protocol prefix.


Example (TypeScript):

```typescript
import { defineConfig, SvelteKitWeb } from 'stacktape';

export default defineConfig(() => {
  const frontend = new SvelteKitWeb({
    appDirectory: './apps/web',
    customDomains: [{ domainName: 'www.example.com' }]
  });

  return { resources: { frontend } };
});
```


For most teams, Stacktape-managed certificates are the right default. Use `customCertificateArn` only when you already need a specific ACM certificate, and use `disableDnsRecordCreation` only when another DNS provider or process owns the DNS record.


> **Info:** Custom domains for SvelteKitWeb require a Route 53 hosted zone in the AWS account. If your registrar is not Route 53, the registrar still needs to point the domain to the Route 53 hosted zone nameservers.


## Caching and headers

SvelteKitWeb uses a CloudFront CDN in front of the SvelteKit app. The `cdn` property controls cache behavior for SSR routes and specific path patterns, while `fileOptions` sets headers such as `Cache-Control` for static files that match a pattern.

| Concern | Property | Use it when |
|---|---|---|
| SSR route caching | `cdn` | You need explicit cache controls for rendered routes or path patterns. |
| Static file headers | `fileOptions` | You need custom headers for uploaded static files, such as `Cache-Control`. |

Most SvelteKit apps should start with the default CDN behavior and add cache rules only after deciding which routes are safe to cache. Be careful with pages that depend on cookies, authorization headers, or user-specific data; caching those responses broadly can expose stale or incorrect content.

## Environment and access

SvelteKitWeb environment variables are passed to the SSR Lambda function. Use `environment` for explicit runtime configuration, and use `connectTo` when the SvelteKit server needs access to other Stacktape resources such as databases, buckets, queues, topics, or auth pools.


Example (TypeScript):

```typescript
import { defineConfig, SvelteKitWeb } from 'stacktape';

export default defineConfig(() => {
  const frontend = new SvelteKitWeb({
    appDirectory: './apps/web',
    environment: [
      { name: 'INTERNAL_API_BASE_URL', value: 'https://api.example.com' },
      { name: 'FEATURE_SEARCH_ENABLED', value: true }
    ]
  });

  return { resources: { frontend } };
});
```


When `connectTo` references another resource, Stacktape grants the needed IAM permissions, opens supported network access for databases and Redis, and injects connection variables using the `STP_[RESOURCE_NAME]_[PARAM]` pattern. For example, a connected relational database named `mainDatabase` injects `STP_MAIN_DATABASE_CONNECTION_STRING`, `STP_MAIN_DATABASE_HOST`, and `STP_MAIN_DATABASE_PORT`; see [connecting resources](/configuration/connecting-resources) for the full matrix.

## Server Lambda

The `serverLambda` property customizes the Lambda function that handles SvelteKit SSR requests. Use it when the server side of the app needs different memory, timeout, VPC, or logging configuration than the default generated function.

Reach for `serverLambda` only when you have a concrete runtime reason: slow SSR routes, larger server-side dependencies, VPC-only dependencies, or logging requirements. Keep the default for small sites and early stages, because changing Lambda runtime settings adds operational surface without changing the SvelteKit programming model.

## Security

SvelteKitWeb can attach a [web application firewall](/resources/security/web-application-firewall) at the CDN layer with `useFirewall`. The referenced firewall must be a `web-app-firewall` resource with `scope: 'cdn'`, because SvelteKitWeb traffic is protected through CloudFront rather than an Application Load Balancer.

Use a CDN-scoped firewall for public production apps that need request filtering before traffic reaches the SSR Lambda function. Skip it for internal previews, low-risk prototypes, or apps already protected by another access layer; firewall rules add configuration and can block legitimate requests if they are too broad.

## How it works

A Stacktape SvelteKitWeb deployment separates static assets from server-rendered traffic. Static assets are stored in S3 and served through CloudFront, while the SvelteKit SSR runtime runs as a Lambda function configured through the `serverLambda` subtree.

That split explains the main configuration levers. Use `fileOptions` for static file headers, `cdn` for CDN cache behavior, `customDomains` for CloudFront-facing domains, and `serverLambda` for the Lambda runtime that handles SSR requests.

## FAQ

### Does SvelteKitWeb deploy SSR or static SvelteKit apps?

SvelteKitWeb is for SvelteKit SSR apps. The source definition describes a Lambda-based SvelteKit server, S3 static assets, and a CloudFront CDN. For static-only SvelteKit output, use [static hosting](/resources/frontend/static-hosting) with `hostingContentType: 'sveltekit-static-website'`.

### When should I use static hosting instead of SvelteKitWeb?

Use [static hosting](/resources/frontend/static-hosting) when your SvelteKit app can be exported as static files and does not need server-side rendering or runtime endpoint handling. Static hosting avoids deploying a server Lambda function for behavior the site does not use.

### Can I use a custom domain with SvelteKitWeb?

Yes. Add `customDomains` with a `domainName`, and Stacktape can create the DNS record and provision a TLS certificate. The domain needs a Route 53 hosted zone in the AWS account; see [custom domains](/resources/networking/custom-domains) for the broader domain model.

### How do SvelteKit environment variables and database access work?

Use `environment` for explicit variables passed to the SSR Lambda function. Use `connectTo` when the SvelteKit server needs access to another Stacktape resource; a database named `mainDatabase` gets variables such as `STP_MAIN_DATABASE_CONNECTION_STRING`. See [connecting resources](/configuration/connecting-resources) for the injected variable pattern.

### Can I protect a SvelteKit app with AWS WAF?

Yes. Set `useFirewall` to the name of a [web application firewall](/resources/security/web-application-firewall) resource whose scope is `cdn`. That scopes protection to the CloudFront CDN path used by SvelteKitWeb.

### How much does SvelteKit hosting on AWS cost?

A SvelteKitWeb app uses Lambda for SSR execution, S3 for static asset storage, and CloudFront for CDN delivery. AWS billing therefore depends on server invocation volume and duration, stored assets, request counts, and data transfer. Use [managing costs](/managing-costs/overview) to track deployed stack spend.

### Does CloudFront cache SvelteKit responses?

SvelteKitWeb includes a CloudFront CDN, and the `cdn` property configures cache controls for SSR routes and specific path patterns. Cache only responses that are safe to share across users; dynamic pages that depend on cookies or authorization usually need conservative caching. See [CDN](/resources/networking/cdn) for CloudFront-oriented decisions.

### Should I use SvelteKitWeb or NextjsWeb?

Use SvelteKitWeb for SvelteKit applications and [NextjsWeb](/resources/frontend/nextjs) for Next.js applications. The resources are framework-specific because each framework has its own build output and server runtime expectations. Pick the resource that matches the framework already used by your frontend.

### Should I use SvelteKitWeb or a web-service?

Use SvelteKitWeb when you want Stacktape to deploy the SvelteKit SSR app through the Lambda, S3, and CloudFront path described by the resource. Use a [web-service](/resources/compute/web-service) when you want to run a custom containerized HTTP server and control the server process directly.

### How do I configure SvelteKitWeb in a monorepo?

Set `appDirectory` to the directory containing the SvelteKit app's `svelte.config.js`, such as `./apps/web`. Keep framework-specific build scripts inside that workspace, then override `buildCommand` only when the default `vite build` command is not the right command for that workspace.

## API Reference


## API Reference: `SvelteKitWebProps`
```typescript
import type { DirectoryUploadFilter, DomainConfiguration, EnvironmentVar, SsrWebCdnConfig, SsrWebDevConfig, SsrWebServerLambdaConfig, StpIamRoleStatement } from 'stacktape';

type SvelteKitWebProps = {
  /** Directory containing your svelte.config.js. For monorepos, point to the SvelteKit workspace. */
  appDirectory?: string;
  /** Override the default vite build command. */
  buildCommand?: string;
  /** CDN cache controls for SSR routes and specific path patterns. */
  cdn?: SsrWebCdnConfig;
  /** Give this resource access to other resources in your stack. */
  connectTo?: Array<string>;
  /** Attach custom domains with auto-managed DNS records and TLS certificates. */
  customDomains?: Array<DomainConfiguration>;
  /** Dev server config for stacktape dev. Defaults to vite dev. */
  dev?: SsrWebDevConfig;
  /** Environment variables for the SSR function. Use $ResourceParam() or $Secret() for dynamic values. */
  environment?: Array<EnvironmentVar>;
  /** Set custom headers (e.g., Cache-Control) for static files matching a pattern. */
  fileOptions?: Array<DirectoryUploadFilter>;
  /** Raw IAM policy statements for permissions not covered by connectTo. */
  iamRoleStatements?: Array<StpIamRoleStatement>;
  /** Customize the SSR Lambda function (memory, timeout, VPC, logging). */
  serverLambda?: SsrWebServerLambdaConfig;
  /** Name of a web-app-firewall resource to protect this app. Firewall scope must be cdn. */
  useFirewall?: string;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `appDirectory` | no | `string` | Directory containing your `svelte.config.js`. For monorepos, point to the SvelteKit workspace. | `.` |
| `buildCommand` | no | `string` | Override the default `vite build` command. | - |
| `cdn` | no | `SsrWebCdnConfig` | CDN cache controls for SSR routes and specific path patterns. | - |
| `connectTo` | no | `Array<string>` | Give this resource access to other resources in your stack. List the names of resources this workload needs to communicate with. Stacktape automatically:

**Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)
**Opens network access** (security group rules for databases, Redis)
**Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`

Example: `connectTo: ["myDatabase", "myBucket"]` gives this workload full access to both
resources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc. | - |
| `customDomains` | no | `Array<DomainConfiguration>` | Attach custom domains with auto-managed DNS records and TLS certificates. **Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account. | - |
| `dev` | no | `SsrWebDevConfig` | Dev server config for `stacktape dev`. Defaults to `vite dev`. | - |
| `environment` | no | `Array<EnvironmentVar>` | Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values. | - |
| `fileOptions` | no | `Array<DirectoryUploadFilter>` | Set custom headers (e.g., `Cache-Control`) for static files matching a pattern. | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | Raw IAM policy statements for permissions not covered by `connectTo`. Added as a separate policy alongside auto-generated permissions. Use this for
accessing AWS services directly (e.g., Rekognition, Textract, Bedrock). | - |
| `serverLambda` | no | `SsrWebServerLambdaConfig` | Customize the SSR Lambda function (memory, timeout, VPC, logging). | - |
| `useFirewall` | no | `string` | Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`. | - |
