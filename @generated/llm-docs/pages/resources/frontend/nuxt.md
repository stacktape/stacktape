# Nuxt

A Stacktape Nuxt resource deploys a Nuxt app with SSR on AWS Lambda, static assets on S3, and a CloudFront CDN. Stacktape builds Nuxt using the Nitro `aws-lambda` preset and manages the SSR function, static asset hosting, and CDN routing. Custom domains and a CDN-scoped [web application firewall](/resources/security/web-application-firewall) can be attached when configured.

## When to use

A Stacktape Nuxt resource is the right choice when your frontend is a Nuxt app that needs server rendering or Nitro server features. Point `appDirectory` at the directory containing `nuxt.config.ts`, and Stacktape wires the SSR function, static asset bucket, and CDN.

Common use cases:

- **Server-rendered apps** — dashboards, portals, content sites, and product apps that need dynamic pages instead of only static files
- **Nuxt monorepos** — set `appDirectory` to the workspace containing `nuxt.config.ts`, rather than the repository root
- **Apps with Nitro server routes** — because the resource uses the Nitro `aws-lambda` preset, server routes and other Nitro capabilities supported by that preset are included in the deployed build output
- **Global apps** — CloudFront CDN is included by default, caching static assets at edge locations worldwide

## When NOT to use

- **Pure static sites** — use [static hosting](/resources/frontend/static-hosting) with `hostingContentType: 'nuxt-static-website'` when your Nuxt app is pre-rendered and does not need SSR or server routes.
- **Containerized custom servers** — use a [web-service](/resources/compute/web-service) when you need a custom Node server or long-lived HTTP process in a container.
- **Standalone APIs** — use a [Lambda function](/resources/compute/lambda-function) or [web-service](/resources/compute/web-service) for APIs that are not part of a Nuxt app.
- **Other frameworks** — each framework has a dedicated resource type ([Next.js](/resources/frontend/nextjs), [Astro](/resources/frontend/astro), [SvelteKit](/resources/frontend/sveltekit), [SolidStart](/resources/frontend/solidstart), [TanStack Start](/resources/frontend/tanstack-start), [Remix](/resources/frontend/remix)).

## Basic example

The smallest useful Nuxt config points Stacktape at the app directory containing `nuxt.config.ts`. In a single-app repository that is often the repository root (the default `"."`); in a monorepo it is the package or workspace directory for the Nuxt app.


Example (TypeScript):

```typescript
import { defineConfig, NuxtWeb } from 'stacktape';
export default defineConfig(() => {
  const web = new NuxtWeb({
    appDirectory: './apps/web'
  });

  return {
    resources: { web }
  };
});
```


`appDirectory` must point to the directory containing `nuxt.config.ts`. The default is `"."` (the repository root). Stacktape uses that directory for the Nuxt build and then deploys the SSR function, static assets, and CDN for the app.

## Build and dev

A Stacktape Nuxt resource runs the Nuxt build from `appDirectory`, and `buildCommand` lets teams replace the default build command when the repository has a custom script. The `dev` property configures the dev server for [`stacktape dev`](/local-development/dev-mode-overview), and the default command is `nuxt dev`.

Use `buildCommand` when your Nuxt app needs a workspace-aware command such as `pnpm --filter web build` or when the app must run a prebuild step. Leave `buildCommand` unset when a normal Nuxt build works from `appDirectory`; fewer custom commands make CI and local behavior easier to reason about.


Example (TypeScript):

```typescript
import { defineConfig, NuxtWeb } from 'stacktape';

export default defineConfig(() => {
  const web = new NuxtWeb({
    appDirectory: './apps/web',
    buildCommand: 'pnpm --filter web build',
    dev: {
      command: 'pnpm --filter web dev'
    }
  });

  return { resources: { web } };
});
```


`dev.command` only affects `stacktape dev`; it does not change the deployed build command. The `dev` property also accepts a `workingDirectory` for cases where the dev command needs to run from a different directory than `appDirectory`.

## Server Lambda

The Nuxt SSR function runs on AWS Lambda. The `serverLambda` property customizes that function — memory, timeout, VPC access, and logging. For the inherited Lambda specifics (memory range, CPU-per-memory ratio, and timeout limits when fronted by CloudFront), see the [Lambda function](/resources/compute/lambda-function) page.


Example (TypeScript):

```typescript
import { defineConfig, NuxtWeb } from 'stacktape';

export default defineConfig(() => {
  const web = new NuxtWeb({
    appDirectory: './apps/web',
    serverLambda: {
      memory: 2048
    }
  });

  return { resources: { web } };
});
```


Increase `memory` when SSR is CPU-bound or the app initializes large dependencies — Lambda CPU scales proportionally with memory. Keep the default when pages render quickly and memory pressure is low.

When the SSR function needs to reach VPC-protected resources such as [relational databases](/resources/databases/relational-database) or [Redis clusters](/resources/databases/redis), set `joinDefaultVpc: true` in `serverLambda`. Joining a VPC can affect the SSR function's direct internet access; see the [Lambda function](/resources/compute/lambda-function) page for VPC tradeoffs.

## Domains and firewall

A Stacktape Nuxt resource can attach custom domains to the app's CDN and associate a Web Application Firewall with that CDN. `customDomains` configures DNS records and TLS certificates, while `useFirewall` references a [web application firewall](/resources/security/web-application-firewall) resource whose `scope` must be `cdn`.

Use `customDomains` for production and shared staging apps where users need a stable branded URL. A Route 53 hosted zone for the domain must exist in your AWS account. Stacktape automatically creates a DNS record and provisions and renews a free TLS certificate. `customCertificateArn` is only needed for specific certificate requirements (such as EV/OV certs), and `disableDnsRecordCreation` is for teams managing DNS through another provider like Cloudflare.


Example (TypeScript):

```typescript
import { defineConfig, NuxtWeb, WebAppFirewall } from 'stacktape';

export default defineConfig(() => {
  const firewall = new WebAppFirewall({
    scope: 'cdn'
  });

  const web = new NuxtWeb({
    appDirectory: './apps/web',
    customDomains: [{ domainName: 'www.example.com' }],
    useFirewall: 'firewall'
  });

  return { resources: { firewall, web } };
});
```


Enable `useFirewall` when the public Nuxt app needs CDN-level WAF protection — for example, apps handling user data or payment flows. Skip it for internal prototypes or early development stages where WAF rules would add configuration work before there is a clear threat model. This property protects the Nuxt CDN path and requires a firewall resource with `scope: 'cdn'`.

## Static files and CDN

Stacktape uploads Nuxt static assets to S3 and serves the entire app through CloudFront. The `fileOptions` property sets custom HTTP headers for static files matching a glob pattern. The `cdn` property controls caching behavior for SSR routes and specific path patterns. Both are optional — Stacktape provides sensible defaults for the split between static assets and SSR routes.

### File options

Use `fileOptions` when static files need explicit cache or metadata headers that differ from the generated defaults. Each entry requires `includePattern` (a glob like `_nuxt/**`) and accepts `headers` as key-value pairs.


Example (TypeScript):

```typescript
import { defineConfig, NuxtWeb } from 'stacktape';

export default defineConfig(() => {
  const web = new NuxtWeb({
    appDirectory: './apps/web',
    fileOptions: [
      {
        includePattern: '_nuxt/**',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
      }
    ]
  });

  return { resources: { web } };
});
```


The `includePattern` above matches all files under `_nuxt/` — Nuxt's hashed build output directory. Because these files are content-hashed, they can be cached indefinitely. You can also use `excludePattern` within the same rule to skip specific files that match the include glob.

### CDN caching

The `cdn` property controls cache behavior for SSR routes and specific path patterns. Use it when default caching behavior is not appropriate — for example, when API-style routes returned by the SSR function should not be cached, or when specific path patterns need different caching rules than the rest of the app. See the API reference for the full set of cache controls.


Example (TypeScript):

```typescript
import { defineConfig, NuxtWeb } from 'stacktape';

export default defineConfig(() => {
  const web = new NuxtWeb({
    appDirectory: './apps/web',
    cdn: {
      pathCachingOverrides: [
        {
          path: '/api/*',
          cachingOptions: {
            defaultTTL: 0,
            maxTTL: 0
          }
        }
      ]
    }
  });

  return { resources: { web } };
});
```


The example above disables CDN caching for all `/api/*` routes, ensuring API responses are always fetched from the SSR function. Leave `cdn` unset when the default caching behavior is acceptable, and add overrides when cache-hit ratios or page-load timing show a real need.

## Connecting resources

`connectTo` gives the Nuxt SSR function access to other Stacktape resources. Stacktape automatically grants supported IAM permissions, opens supported resource-side network access, and injects connection variables named `STP_[RESOURCE_NAME]_[PARAM]`. Use `connectTo` for resources such as relational databases, buckets, queues, and auth pools; use `iamRoleStatements` only for AWS permissions not covered by the resource connection model. For the full connection model and injected variables by resource type, see [connecting resources](/configuration/connecting-resources).


Example (TypeScript):

```typescript
import { defineConfig, NuxtWeb, Bucket } from 'stacktape';

export default defineConfig(() => {
  const uploads = new Bucket({});

  const web = new NuxtWeb({
    appDirectory: './apps/web',
    connectTo: [uploads]
  });

  return { resources: { uploads, web } };
});
```


The example creates an [S3 bucket](/resources/storage/s3-bucket) for user uploads. With the resource name `uploads`, the SSR function receives `STP_UPLOADS_NAME` and `STP_UPLOADS_ARN`, along with IAM permissions to read, write, and delete objects in the bucket. The same pattern works for other supported resources — for example, connecting to a relational database injects connection details and opens network access. When connecting to VPC-protected resources such as relational databases or Redis clusters, set `joinDefaultVpc: true` in `serverLambda` so the SSR function can reach them.

## Environment variables

A Stacktape Nuxt resource can set explicit `environment` variables for the SSR function. Use these for application configuration, feature flags, public service URLs needed by server code, and values produced by directives such as `$ResourceParam()` or `$Secret()`.


Example (TypeScript):

```typescript
import { defineConfig, NuxtWeb, $Secret } from 'stacktape';

export default defineConfig(() => {
  const web = new NuxtWeb({
    appDirectory: './apps/web',
    environment: {
      APP_ENV: 'production',
      STRIPE_KEY: $Secret('stripe-key')
    }
  });

  return { resources: { web } };
});
```


Prefer `connectTo` for Stacktape-managed resources because it grants supported IAM permissions, opens supported resource-side network access, and injects connection variables. For VPC-protected resources, also configure the SSR Lambda's VPC access through `joinDefaultVpc` in `serverLambda` when needed. Use explicit `environment` entries for values that are not resource connections — API keys for external services, feature flags, or application mode settings. For sensitive values, reference secrets through the [secrets](/configuration/secrets) and [directives](/configuration/directives) flow instead of hard-coding credentials in config.

## Logging

The Nuxt SSR function has logging settings under `serverLambda`. Use [`stacktape logs`](/cli/logs) or the [Stacktape Console](/stacktape-console/console-overview) to inspect deployed resource logs, initialization failures, and runtime exceptions.

Use the `serverLambda` logging settings when retention, cost, or compliance requirements require a specific log configuration. See the API reference for the available logging sub-properties.

## FAQ

### What does Stacktape create for a Nuxt app, and how does SSR run?

Stacktape builds the Nuxt app with the Nitro `aws-lambda` preset and splits the output into server and static parts. SSR runs as a Lambda function, static assets go to an S3 bucket, and a CloudFront CDN sits in front of both origins and routes each request to the correct one. The `serverLambda` property customizes the SSR function's memory, timeout, VPC access, and logging; the underlying Lambda specifics are covered on the [Lambda function](/resources/compute/lambda-function) page.

### Where should `appDirectory` point?

`appDirectory` should point to the directory containing `nuxt.config.ts`. The default is `"."`, which works for single-app repositories. In a monorepo, set it to the Nuxt workspace rather than the repository root. The basic example on this page uses `./apps/web` to show the monorepo shape.

### Can I use a custom domain with Nuxt?

Yes. Configure `customDomains` on the Nuxt resource, and make sure a Route 53 hosted zone for the domain exists in your AWS account. Stacktape automatically creates the DNS record and provisions a free TLS certificate unless you provide `customCertificateArn` or set `disableDnsRecordCreation`. See [custom domains](/resources/networking/custom-domains) for the broader domain model.

### Can I use Nuxt API routes (Nitro server routes)?

Yes. Because Stacktape uses the Nitro `aws-lambda` preset, the build output includes Nitro server routes, and both SSR pages and server routes are served through the same server Lambda and CloudFront CDN. No configuration beyond the Nuxt resource is needed for routes Nitro supports in that preset. If you want API responses fetched fresh on every request rather than cached, disable CDN caching for those paths via `cdn.pathCachingOverrides` (see the CDN caching section above).

### How much does hosting Nuxt on Lambda and CloudFront cost?

AWS bills the underlying services separately: Lambda invocations and duration for SSR, S3 storage and requests for static assets, and CloudFront data transfer and requests for CDN traffic. Lambda pricing is pay-per-use with a generous free tier; CloudFront charges depend on traffic volume and geographic distribution. Use [cost dashboards](/managing-costs/dashboards) after deployment to inspect real spend by stack.

### When should I use static hosting instead of the Nuxt resource?

Use [static hosting](/resources/frontend/static-hosting) with `hostingContentType: 'nuxt-static-website'` when the Nuxt site can be fully pre-rendered and does not need SSR, server routes, or Nitro server features at runtime. Static hosting is simpler and has fewer moving parts. Use the Nuxt resource when runtime server rendering is part of the product.

### Why can't the SSR function reach my database or Redis cluster?

By default the Nuxt SSR Lambda is not in your VPC, so it cannot reach VPC-protected resources such as [relational databases](/resources/databases/relational-database) or [Redis clusters](/resources/databases/redis). Set `joinDefaultVpc: true` in `serverLambda` to let it connect (use `connectTo` to also grant IAM permissions and open resource-side access). Note that joining a VPC can affect the function's direct internet access — see the [Lambda function](/resources/compute/lambda-function) page for the tradeoffs.

## API Reference


## API Reference: `NuxtWebProps`
```typescript
import type { DirectoryUploadFilter, DomainConfiguration, EnvironmentVar, SsrWebCdnConfig, SsrWebDevConfig, SsrWebServerLambdaConfig, StpIamRoleStatement } from 'stacktape';

type NuxtWebProps = {
  /** Directory containing your nuxt.config.ts. For monorepos, point to the Nuxt workspace. */
  appDirectory?: string;
  /** Override the default nuxt build command. */
  buildCommand?: string;
  /** CDN cache controls for SSR routes and specific path patterns. */
  cdn?: SsrWebCdnConfig;
  /** Give this resource access to other resources in your stack. */
  connectTo?: Array<string>;
  /** Attach custom domains with auto-managed DNS records and TLS certificates. */
  customDomains?: Array<DomainConfiguration>;
  /** Dev server config for stacktape dev. Defaults to nuxt dev. */
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
| `appDirectory` | no | `string` | Directory containing your `nuxt.config.ts`. For monorepos, point to the Nuxt workspace. | `.` |
| `buildCommand` | no | `string` | Override the default `nuxt build` command. | - |
| `cdn` | no | `SsrWebCdnConfig` | CDN cache controls for SSR routes and specific path patterns. | - |
| `connectTo` | no | `Array<string>` | Give this resource access to other resources in your stack. List the names of resources this workload needs to communicate with. Stacktape automatically:

**Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)
**Opens network access** (security group rules for databases, Redis)
**Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`

Example: `connectTo: ["myDatabase", "myBucket"]` gives this workload full access to both
resources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc. | - |
| `customDomains` | no | `Array<DomainConfiguration>` | Attach custom domains with auto-managed DNS records and TLS certificates. **Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account. | - |
| `dev` | no | `SsrWebDevConfig` | Dev server config for `stacktape dev`. Defaults to `nuxt dev`. | - |
| `environment` | no | `Array<EnvironmentVar>` | Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values. | - |
| `fileOptions` | no | `Array<DirectoryUploadFilter>` | Set custom headers (e.g., `Cache-Control`) for static files matching a pattern. | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | Raw IAM policy statements for permissions not covered by `connectTo`. Added as a separate policy alongside auto-generated permissions. Use this for
accessing AWS services directly (e.g., Rekognition, Textract, Bedrock). | - |
| `serverLambda` | no | `SsrWebServerLambdaConfig` | Customize the SSR Lambda function (memory, timeout, VPC, logging). | - |
| `useFirewall` | no | `string` | Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`. | - |
