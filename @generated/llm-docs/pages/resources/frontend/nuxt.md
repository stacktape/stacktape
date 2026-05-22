# Nuxt

A Stacktape Nuxt resource deploys a Nuxt app with SSR on AWS Lambda (using the Nitro `aws-lambda` preset), static assets on S3, and a CloudFront CDN. Use it when you want server-rendered Nuxt on AWS while keeping Stacktape responsible for the SSR function, static asset hosting, CDN routing, custom domains, and firewall.

## When to use

A Stacktape Nuxt resource is the right choice when your frontend is a Nuxt app that needs server rendering, API routes, or Nitro server features. The resource is designed around the Nuxt build output: point `appDirectory` at the directory containing `nuxt.config.ts`, and Stacktape wires the SSR function, static asset bucket, and CDN.

Common use cases:

- **Server-rendered apps** — dashboards, portals, content sites, and product apps that need dynamic pages instead of only static files
- **Nuxt monorepos** — set `appDirectory` to the workspace containing `nuxt.config.ts`, rather than the repository root
- **Nuxt API routes** — Nitro server routes deploy alongside SSR on the same Lambda function
- **Global apps** — CloudFront CDN is included by default, caching static assets at edge locations worldwide

## When NOT to use

- **Pure static websites** — use [static hosting](/resources/frontend/static-hosting) with `hostingContentType: 'nuxt-static-website'` when your Nuxt app is pre-rendered and does not need SSR or server routes.
- **Containerized custom servers** — use a [web-service](/resources/compute/web-service) when you want to run a custom Node server or another HTTP process in a container.
- **General backend APIs** — use a [Lambda function](/resources/compute/lambda-function) or [web-service](/resources/compute/web-service) for standalone APIs that are not part of a Nuxt app.
- **Next.js or other frameworks** — each framework has a dedicated resource type ([Next.js](/resources/frontend/nextjs), [Astro](/resources/frontend/astro), [SvelteKit](/resources/frontend/sveltekit), [SolidStart](/resources/frontend/solidstart), [TanStack Start](/resources/frontend/tanstack-start), [Remix](/resources/frontend/remix)).

## Basic example

The smallest useful Nuxt config points Stacktape at the app directory containing `nuxt.config.ts`. In a single-app repository that is often the repository root (the default); in a monorepo it is usually the package or workspace directory for the Nuxt app.


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


`appDirectory` must point to the directory containing `nuxt.config.ts`. The default is `"."` (the repository root). Stacktape uses that directory for the Nuxt build and then deploys SSR, static assets, and CDN routing for the app.

## Build and dev

A Stacktape Nuxt resource runs the Nuxt build from `appDirectory`, and `buildCommand` lets teams replace the default build command when their repository has a custom script. Dev mode also has a small override surface: `dev.command` defaults to `nuxt dev`, but can be changed when a package manager script is the canonical way to run the app locally.

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


`dev.command` only affects `stacktape dev`; it does not change the deployed build command. `dev.workingDirectory` can be set when the dev command should run from a directory other than the project root. Use the local command override when your repository expects a package-manager script, a monorepo filter, or another wrapper around `nuxt dev`.

## Server Lambda

A Stacktape Nuxt resource serves SSR through a Lambda function using the Nitro `aws-lambda` preset. `serverLambda` customizes that SSR function: memory, timeout, logging, and whether the function joins the stack's default VPC to reach VPC resources such as databases or Redis.

The default `serverLambda.memory` is `1024` MB, and the allowed memory range is `128`–`10240` MB. Lambda CPU scales with memory, with `1769` MB corresponding to 1 vCPU. The default `serverLambda.timeout` is `30` seconds, and the maximum is `30` seconds.


Example (TypeScript):

```typescript
import { defineConfig, NuxtWeb } from 'stacktape';

export default defineConfig(() => {
  const web = new NuxtWeb({
    appDirectory: './apps/web',
    serverLambda: {
      memory: 2048,
      timeout: 30
    }
  });

  return { resources: { web } };
});
```


Increase `memory` when SSR is CPU-bound or the app initializes large dependencies. Keep the default when pages render quickly and memory pressure is low. Set `joinDefaultVpc: true` only when the SSR function must access VPC-protected resources; the source warns that the function loses direct internet access when joining a VPC, while S3 and DynamoDB remain accessible through auto-created VPC endpoints.

## Domains and firewall

A Stacktape Nuxt resource can attach custom domains to the app's CDN and can associate a Web Application Firewall with that CDN. `customDomains` configures DNS records and TLS certificates, while `useFirewall` references a `web-app-firewall` resource whose `scope` must be `cdn`.

Use `customDomains` for production and shared staging apps where users need a stable branded URL. The source requires an existing Route 53 hosted zone in the AWS account. Stacktape can create DNS records and provision free TLS certificates automatically; `customCertificateArn` is only needed for specific certificate requirements, and `disableDnsRecordCreation` is for teams managing DNS elsewhere.


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


Enable `useFirewall` when the public Nuxt app needs CDN-level WAF protection. Skip it for internal prototypes or early development stages where WAF rules would add configuration work before there is a clear threat model. Keep the scope precise: this property protects the Nuxt CDN path and requires a firewall with `scope: 'cdn'`.

## Static files and CDN

A Stacktape Nuxt resource uploads static assets to S3 and serves the app through CloudFront. `fileOptions` lets teams set custom headers such as `Cache-Control` for uploaded files matching a pattern, and `cdn` configures cache behavior for SSR routes and specific path patterns.

By default, all cached CDN content is flushed on every deploy so users see the latest version. Set `cdn.disableInvalidationAfterDeploy` to `true` if you manage cache invalidation yourself or want to keep cached content between deploys. Use `cdn.defaultCachingOptions` when SSR responses need different cache durations than the framework defaults, and `cdn.pathCachingOverrides` when specific URL path patterns need their own caching rules.

Use `fileOptions` when static files need explicit cache or metadata headers that differ from the generated defaults. Leave both `fileOptions` and `cdn` unset first; Nuxt and Stacktape already provide a standard split between static assets and SSR routes.

## Connecting resources

`connectTo` gives the Nuxt SSR function access to other Stacktape resources and injects connection details as environment variables named `STP_[RESOURCE_NAME]_[PARAM]`. Use `connectTo` for resources such as relational databases, buckets, queues, and auth pools; use `iamRoleStatements` only for AWS permissions that are not covered by the resource connection model.


Example (TypeScript):

```typescript
import { defineConfig, NuxtWeb, RelationalDatabase } from 'stacktape';

export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    engine: 'postgres-16',
    instanceClass: 'db.t4g.micro'
  });

  const web = new NuxtWeb({
    appDirectory: './apps/web',
    connectTo: ['mainDatabase'],
    serverLambda: {
      joinDefaultVpc: true
    }
  });

  return { resources: { mainDatabase, web } };
});
```


With the resource name `mainDatabase`, the Nuxt app receives variables such as `STP_MAIN_DATABASE_CONNECTION_STRING`, `STP_MAIN_DATABASE_HOST`, and `STP_MAIN_DATABASE_PORT`. For the full connection model and injected variables by resource type, see [connecting resources](/configuration/connecting-resources).

## Environment variables

A Stacktape Nuxt resource can set explicit `environment` variables for the SSR function. Use these for application configuration, feature flags, public service URLs needed by server code, and values produced by directives such as `$ResourceParam()` or `$Secret()`.

Prefer `connectTo` for Stacktape-managed resources because it also handles permissions and, where needed, network access. Use explicit `environment` entries for values that are not resource connections. For sensitive values, reference secrets through the [secrets](/configuration/secrets) and [directives](/configuration/directives) flow instead of hard-coding credentials in config.

## Logging

The Nuxt server Lambda supports Lambda logging configuration through `serverLambda.logging`, and logs are sent to CloudWatch. For Stacktape log viewing, use [`stacktape debug:logs`](/cli/debug-logs) or the [Stacktape Console](/stacktape-console/console-overview); the lower-level Lambda logging options are documented in the API reference.

Most teams should keep logging enabled for deployed Nuxt apps because SSR errors, initialization failures, and runtime exceptions need CloudWatch logs for diagnosis. Tune logging only when retention, cost, or compliance requirements justify changing the default behavior exposed by the Lambda logging configuration.

## FAQ

### What does Stacktape create for a Nuxt app?

A Stacktape Nuxt resource deploys SSR on Lambda (using the Nitro `aws-lambda` preset), static assets on S3, and a CloudFront CDN. The internal resource shape includes a nested bucket for static assets and a server Lambda function for SSR. See the [resources overview](/configuration/resources) for how Stacktape resources map to AWS.

### Where should `appDirectory` point?

`appDirectory` should point to the directory containing `nuxt.config.ts`. The default is `"."`, which works for single-app repositories. In a monorepo, set it to the Nuxt workspace rather than the repository root. The basic example on this page uses `./apps/web` to make that monorepo shape explicit.

### Can I use a custom domain with Nuxt?

Yes. Configure `customDomains` on the Nuxt resource, and make sure a Route 53 hosted zone for the domain exists in your AWS account. Stacktape can create the DNS record and manage the TLS certificate unless you provide `customCertificateArn` or set `disableDnsRecordCreation`. See [custom domains](/resources/networking/custom-domains) for the broader domain model.

### Can I protect a Nuxt app with AWS WAF?

Yes. Set `useFirewall` to the name of a [web application firewall](/resources/security/web-application-firewall) resource whose `scope` is `cdn`. This protects the CDN path for the Nuxt app; it is separate from load-balancer firewall attachment paths used by compute resources.

### How does Nuxt SSR run on Lambda?

Stacktape uses the Nitro `aws-lambda` preset to build the Nuxt app for Lambda execution. The Nuxt build output is split into a server Lambda function for SSR and API routes, and an S3 bucket for static assets. CloudFront routes requests to the appropriate origin based on the path.

### Should I use a VPC for my Nuxt SSR function?

Set `serverLambda.joinDefaultVpc` to `true` only when the SSR function must reach VPC-protected resources such as relational databases or Redis clusters. Joining a VPC means the function loses direct internet access, though S3 and DynamoDB remain accessible through auto-created VPC endpoints. Most Nuxt apps that do not connect to VPC resources should skip this setting.

### How much does hosting Nuxt on Lambda and CloudFront cost?

AWS bills the underlying services separately: Lambda invocations and duration for SSR, S3 storage and requests for static assets, and CloudFront data transfer and requests for CDN traffic. The provided Stacktape source does not include concrete Nuxt pricing, so this page avoids quoting list prices. Use [cost dashboards](/managing-costs/dashboards) after deployment to inspect real spend by stack.

### When should I use static hosting instead of the Nuxt resource?

Use [static hosting](/resources/frontend/static-hosting) with `hostingContentType: 'nuxt-static-website'` when the Nuxt site can be fully pre-rendered and does not need SSR, server routes, or Nitro server features at runtime. Use the Nuxt resource when runtime server rendering is part of the product. Static hosting is simpler and has fewer moving parts.

### When should I use a web service instead of the Nuxt resource?

Use a [web-service](/resources/compute/web-service) when you want to run a custom HTTP server in a container, control the server process directly, or deploy a framework that is not modeled by the frontend resources. Use the Nuxt resource when the deployment unit is a standard Nuxt app and you want Stacktape to manage SSR, static assets, and CDN routing.

### Can I use Nuxt API routes (Nitro server routes)?

Yes. Nitro server routes are part of the Nuxt build output and deploy alongside SSR on the same Lambda function. They are accessible through the same CloudFront CDN. No additional configuration is needed beyond the standard Nuxt resource setup.

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
