# TanStack Start

A Stacktape TanStack Start resource deploys a TanStack Start SSR app on AWS Lambda via the Nitro aws-lambda preset, stores static assets on S3, and serves everything through CloudFront. Stacktape handles the build output, CDN routing, custom domains, and Lambda infrastructure so you focus on building your TanStack Start application.

## When to use

The TanStack Start resource is the right choice when your frontend is a TanStack Start app that needs server rendering. The resource is designed around the TanStack Start build output: point `appDirectory` at the directory containing `app.config.ts`, and Stacktape wires the SSR function, static asset bucket, and CDN.

Common use cases:

- **Server-rendered TanStack Start apps** — dashboards, portals, and content sites that need SSR via Vinxi and Nitro
- **TanStack Start in a monorepo** — set `appDirectory` to the workspace containing `app.config.ts` rather than the repository root
- **SSR apps that need CDN, custom domains, or WAF protection** — configure all three on a single resource

## When NOT to use

- **Pure static websites** — use [static hosting](/resources/frontend/static-hosting) when your app is exported as static files and does not need SSR. Static hosting has fewer moving parts, no Lambda cold starts, and lower cost.
- **Containerized custom servers** — use a [web service](/resources/compute/web-service) when you want to run a custom Node server or another HTTP process in a container with full control over the runtime.
- **General backend APIs** — use a [Lambda function](/resources/compute/lambda-function) or [web service](/resources/compute/web-service) for standalone APIs that are not part of a TanStack Start app.
- **Other frameworks** — [Next.js](/resources/frontend/nextjs), [Nuxt](/resources/frontend/nuxt), [Astro](/resources/frontend/astro), [SvelteKit](/resources/frontend/sveltekit), [SolidStart](/resources/frontend/solidstart), and [Remix](/resources/frontend/remix) each have a dedicated Stacktape resource tuned for their build output and runtime behavior. Use the matching resource.

## Basic example

The smallest useful TanStack Start config points Stacktape at the app directory containing `app.config.ts`. In a single-app repository that directory is usually the repository root (the default `"."`); in a monorepo it is the package or workspace directory.


Example (TypeScript):

```typescript
import { defineConfig, TanStackWeb } from 'stacktape';
export default defineConfig(() => {
  const web = new TanStackWeb({
    appDirectory: './apps/web'
  });

  return {
    resources: { web }
  };
});
```


Stacktape runs `vinxi build` by default, deploys the server output as a Lambda function, uploads static assets to S3, and routes traffic through CloudFront.

## Build and dev

The `buildCommand` property overrides the default `vinxi build` command. Use it when your TanStack Start app needs a workspace-aware command such as `pnpm --filter web build` or when the app must run a prebuild step. Leave `buildCommand` unset when a normal Vinxi build works from `appDirectory` — fewer custom commands make CI and local behavior easier to reason about.


Example (TypeScript):

```typescript
import { defineConfig, TanStackWeb } from 'stacktape';
export default defineConfig(() => {
  const web = new TanStackWeb({
    appDirectory: './apps/web',
    buildCommand: 'pnpm --filter web build'
  });

  return { resources: { web } };
});
```


The `dev` property configures the local development server used by [`stacktape dev`](/cli/dev). It defaults to `vinxi dev`. Override it when your repository needs a different local dev command — it does not affect the deployed build. See the [API Reference](#api-reference) for `dev` configuration options.

## Server Lambda

The TanStack Start SSR function runs on AWS Lambda. The `serverLambda` property customizes memory, timeout, VPC connectivity, and logging for that function. Most apps work well with the defaults — tune these settings when you observe slow renders, cold start issues, or need VPC connectivity.

The SSR function inherits memory, CPU allocation, timeout behavior, and VPC connectivity from [Lambda functions](/resources/compute/lambda-function); see that page for the underlying constraints and defaults.


Example (TypeScript):

```typescript
import { defineConfig, TanStackWeb } from 'stacktape';
export default defineConfig(() => {
  const web = new TanStackWeb({
    appDirectory: './apps/web',
    serverLambda: {
      memory: 2048,
      timeout: 25,
      logging: {
        retentionDays: 30
      }
    }
  });

  return { resources: { web } };
});
```


Increase `memory` when SSR is CPU-bound or the app initializes large dependencies — for example, apps that render charts or process large data sets during SSR benefit from `2048` MB or higher. Increasing memory also reduces cold start duration because AWS Lambda allocates CPU proportionally. Keep the default when pages render quickly and memory pressure is low.

The `timeout` of `25` seconds in the example leaves margin below the CDN origin response timeout. Setting the Lambda timeout below this ceiling avoids CDN-layer 504 errors when SSR renders run long — the Lambda returns its own timeout error instead. Raise or lower the value based on your SSR response times; see [Lambda functions](/resources/compute/lambda-function) for the full timeout constraints.

The `serverLambda.logging` sub-property controls CloudWatch log behavior. Lower `retentionDays` to reduce storage costs in development stages, or raise it for production audit requirements. Set `logging.disabled` to `true` to turn off CloudWatch logging entirely — only do this if you forward logs elsewhere.

View logs with [`stacktape logs`](/cli/logs) or in the [Stacktape Console](/stacktape-console/console-overview).

### VPC connectivity

Set `serverLambda.joinDefaultVpc` to `true` when the SSR function must access VPC-protected resources such as [relational databases](/resources/databases/relational-database) or [Redis clusters](/resources/databases/redis). The SSR function loses direct internet access when placed in a VPC, so plan accordingly if server code also calls external APIs. The database connection example in [Connecting resources](#connecting-resources) demonstrates this pattern.

## Connecting resources

The `connectTo` property gives the TanStack Start SSR function access to other Stacktape resources. Stacktape grants IAM permissions for supported resources, opens security group access for databases and Redis, and injects documented connection details as environment variables following the `STP_[RESOURCE_NAME]_[PARAM]` pattern. For the full list of injected variables by resource type, see [connecting resources](/configuration/connecting-resources).


Example (TypeScript):

```typescript
import { defineConfig, TanStackWeb, RelationalDatabase, RdsEnginePostgres } from 'stacktape';
export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    credentials: {
      masterUserPassword: "$Secret('database.password')"
    },
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    })
  });

  const web = new TanStackWeb({
    appDirectory: './apps/web',
    connectTo: ['mainDatabase'],
    serverLambda: {
      joinDefaultVpc: true
    }
  });

  return { resources: { mainDatabase, web } };
});
```


In the example above, a database named `mainDatabase` produces environment variables like `STP_MAIN_DATABASE_CONNECTION_STRING`, `STP_MAIN_DATABASE_HOST`, and `STP_MAIN_DATABASE_PORT` on the SSR function. The `serverLambda.joinDefaultVpc` setting is required because relational databases are VPC-protected resources. The `instanceSize: 'db.t4g.micro'` value controls the compute and memory capacity of the database instance — it is a tunable value, not a required literal. See [relational databases](/resources/databases/relational-database) for available instance sizes and guidance on choosing one.

Use `iamRoleStatements` for AWS permissions not covered by the `connectTo` model — for example, calling AWS Bedrock or Rekognition from server functions.

## Environment variables

The `environment` property sets explicit environment variables on the SSR function. Use these for application configuration, feature flags, public service URLs needed by server code, and values from [directives](/configuration/directives) such as `$ResourceParam()` or `$Secret()`.


Example (TypeScript):

```typescript
import { defineConfig, TanStackWeb } from 'stacktape';
export default defineConfig(() => {
  const web = new TanStackWeb({
    appDirectory: './apps/web',
    environment: [
      { name: 'APP_ENV', value: 'production' },
      { name: 'API_KEY', value: "$Secret('api.key')" }
    ]
  });

  return { resources: { web } };
});
```


Prefer `connectTo` for Stacktape-managed resources because it handles both environment variables and IAM permissions automatically. Use explicit `environment` entries for values that are not resource connections. For sensitive values, use the [`$Secret()` directive](/configuration/secrets) instead of hard-coding credentials in config.

## CDN and static assets

Stacktape uploads static assets to S3 and serves the entire app through CloudFront. The `fileOptions` property sets custom HTTP headers (such as `Cache-Control`) for uploaded files matching a glob pattern. A separate `cdn` property is available for configuring cache behavior on SSR routes; see the [API Reference](#api-reference) for its options.


Example (TypeScript):

```typescript
import { defineConfig, TanStackWeb } from 'stacktape';
export default defineConfig(() => {
  const web = new TanStackWeb({
    appDirectory: './apps/web',
    fileOptions: [
      {
        includePattern: 'assets/**',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
      }
    ]
  });

  return { resources: { web } };
});
```


The `fileOptions` example sets a one-year immutable cache header on hashed static assets — the right default for fingerprinted build output. Each `fileOptions` entry has an `includePattern` glob and optional `headers` as key-value pairs.

Leave `fileOptions` unset initially — TanStack Start and Stacktape already route static assets and SSR responses correctly. Add custom headers when you need explicit caching for fingerprinted assets. Configure `cdn` when SSR content changes infrequently enough to benefit from deliberate edge caching.

## Custom domains and firewall

The `customDomains` property attaches branded domain names to the app's CloudFront distribution. When the domain has a Route 53 hosted zone in your AWS account and the registrar's nameservers point to it, Stacktape creates the DNS record and provisions a free TLS certificate automatically. Set `customCertificateArn` to use your own ACM certificate when you have specific requirements (such as EV or OV certificates). Set `disableDnsRecordCreation` to `true` if you manage DNS records through an external provider like Cloudflare.

The `useFirewall` property references a [`web-app-firewall`](/resources/security/web-application-firewall) resource whose `scope` must be `cdn`. This protects the CloudFront distribution path for the TanStack Start app.


Example (TypeScript):

```typescript
import { defineConfig, TanStackWeb, WebAppFirewall } from 'stacktape';
export default defineConfig(() => {
  const firewall = new WebAppFirewall({
    scope: 'cdn'
  });

  const web = new TanStackWeb({
    appDirectory: './apps/web',
    customDomains: [{ domainName: 'www.example.com' }],
    useFirewall: 'firewall'
  });

  return { resources: { firewall, web } };
});
```


Use `customDomains` for production and shared staging apps where users need a stable branded URL. Skip it for throwaway review or development stages where the default CloudFront URL is sufficient.

Enable `useFirewall` when the public TanStack Start app needs CDN-level WAF protection — for example, a customer-facing portal exposed to the internet. Skip it for internal prototypes or early development stages where WAF rules add configuration work before there is a clear threat model. Load-balancer-scoped firewalls are a separate attachment path used by [compute resources](/resources/compute/web-service).

## FAQ

### What does Stacktape create for a TanStack Start app?

A Stacktape TanStack Start resource uses CloudFront CDN to serve the app. Its documented nested resources are an SSR Lambda function (using the Nitro aws-lambda preset) and an S3 bucket for static assets. You configure the TanStack Start resource, and Stacktape manages the underlying infrastructure. See [resources overview](/configuration/resources) for how Stacktape resources map to AWS.

### Where should `appDirectory` point?

Set `appDirectory` to the directory containing your `app.config.ts` file. The default is `"."` (the repository root). In a monorepo, point it to the TanStack Start workspace — for example, `./apps/web` or `./packages/frontend`. Stacktape runs `vinxi build` from this directory unless you override `buildCommand`.

### How do I connect a database to a TanStack Start app?

Use `connectTo` to reference the database resource by name, and also set `serverLambda.joinDefaultVpc` to `true` — without it the SSR Lambda cannot reach VPC-protected resources like relational databases or Redis, and connections time out. `connectTo` injects connection details as environment variables automatically, for example `STP_MY_DB_CONNECTION_STRING` for a resource named `myDb`. Note the SSR function loses direct internet access once it joins the VPC, so plan accordingly if server code also calls external APIs. See [connecting resources](/configuration/connecting-resources) for the full list of injected variables per resource type.

### How much does hosting TanStack Start on Lambda and CloudFront cost?

AWS bills the underlying services separately: Lambda invocations and duration for SSR, S3 storage and requests for static assets, and CloudFront data transfer and requests for CDN traffic. Both Lambda and CloudFront include free tiers that cover light workloads. Use [cost dashboards](/managing-costs/dashboards) after deployment to inspect real spend.

### How do Lambda cold starts affect TanStack Start SSR?

The SSR function runs on AWS Lambda, so the first request after a period of inactivity incurs a cold start. Cold start duration depends on bundle size and memory allocation. Increasing `serverLambda.memory` reduces initialization time because AWS Lambda allocates CPU proportionally. CloudFront caching also reduces cold start frequency by serving cached SSR responses from the edge instead of invoking the Lambda. See [Lambda functions](/resources/compute/lambda-function) for more on cold start behavior.

### When should I use static hosting instead of TanStack Start?

Use [static hosting](/resources/frontend/static-hosting) when the site can be fully built into static files at deploy time and does not need runtime server rendering or server functions. Static hosting has fewer moving parts, no Lambda cold starts, and lower cost. Use the TanStack Start resource when server-rendered pages, server functions, or runtime data loading are part of the product.

## API Reference


### Definition: `TanStackWebProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/tanstack-web` with definition name `TanStackWebProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `appDirectory` | no | `string` | `.` |
| `buildCommand` | no | `string` | - |
| `cdn` | no | `SsrWebCdnConfig` | - |
| `connectTo` | no | `Array<string>` | - |
| `customDomains` | no | `Array<DomainConfiguration>` | - |
| `dev` | no | `SsrWebDevConfig` | - |
| `environment` | no | `Array<EnvironmentVar>` | - |
| `fileOptions` | no | `Array<DirectoryUploadFilter>` | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | - |
| `serverLambda` | no | `SsrWebServerLambdaConfig` | - |
| `useFirewall` | no | `string` | - |
