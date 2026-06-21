# Remix

A Stacktape Remix resource deploys a Remix app with SSR on AWS Lambda, static assets on S3, and a CloudFront CDN. Use it when you want server-rendered Remix on AWS while keeping Stacktape responsible for the supporting infrastructure — Vite-based builds, custom domains, CDN cache control, and optional WAF protection.

## When to use

Use the Remix resource for standard Remix apps that rely on Remix loaders, actions, and routing. The resource is designed around the Remix build output: point `appDirectory` at the directory containing `vite.config.ts` (or `remix.config.js`), and Stacktape wires the SSR function, static asset bucket, CDN, and supporting resources.

Common use cases:

- **Server-rendered product apps** — dashboards, e-commerce, portals, and content sites that use Remix loaders and actions for data fetching and mutations
- **Remix monorepos** — set `appDirectory` to the workspace containing `vite.config.ts`, rather than the repository root
- **Global apps** — the CDN serves static assets from edge locations and routes SSR requests to the regional Lambda function

## When NOT to use

- **Pure static websites** — use [static hosting](/resources/frontend/static-hosting) when your app can be exported as static files and does not need SSR, loaders, or actions.
- **Containerized custom servers** — use a [web-service](/resources/compute/web-service) when you want to run a custom Node server or another HTTP process in a container.
- **General backend APIs** — use a [Lambda function](/resources/compute/lambda-function) or [web-service](/resources/compute/web-service) for standalone APIs that are not part of a Remix app.
- **Apps that need direct control over the SSR server process** — the Remix resource is documented as Lambda-based SSR behind CloudFront. Use a [web-service](/resources/compute/web-service) with a container if you need to run and control a custom server process directly.

## Basic example

The smallest useful Remix config points Stacktape at the app directory containing `vite.config.ts` (or `remix.config.js`). In a single-app repository that is often the repository root (`"."`); in a monorepo it is usually the package or workspace directory for the Remix app.


Example (TypeScript):

```typescript
import { defineConfig, RemixWeb } from 'stacktape';
export default defineConfig(() => {
  const web = new RemixWeb({
    appDirectory: './apps/web'
  });

  return {
    resources: { web }
  };
});
```


`appDirectory` identifies the directory containing `vite.config.ts` (or `remix.config.js`). The default is `"."` (the repository root). Stacktape uses that directory for the Remix build and then deploys SSR on Lambda, static assets on S3, and a CloudFront CDN for the app.

## Build and dev

Point `appDirectory` at the Remix workspace, and use `buildCommand` to override the default `remix vite:build` command when your repository needs a custom script — for example, a workspace-aware command such as `pnpm --filter web build` or a prebuild step.

Leave `buildCommand` unset when a standard Remix Vite build works from `appDirectory`. Fewer custom commands make CI and local behavior easier to reason about.


Example (TypeScript):

```typescript
import { defineConfig, RemixWeb } from 'stacktape';

export default defineConfig(() => {
  const web = new RemixWeb({
    appDirectory: './apps/web',
    buildCommand: 'pnpm --filter web build'
  });

  return { resources: { web } };
});
```


`dev` configures the dev server used by [`stacktape dev`](/local-development/dev-mode-overview); it does not affect the deployed build. The default dev command is `remix vite:dev`. See the API reference for the `dev` property schema.

## Server Lambda

Remix SSR runs on an AWS Lambda function behind CloudFront. `serverLambda` customizes that function's memory, timeout, VPC access, and logging.


Example (TypeScript):

```typescript
import { defineConfig, RemixWeb } from 'stacktape';

export default defineConfig(() => {
  const web = new RemixWeb({
    appDirectory: './apps/web',
    serverLambda: {
      memory: 2048,
      timeout: 15
    }
  });

  return { resources: { web } };
});
```


`memory` sets the SSR function's memory allocation; on Lambda, CPU scales proportionally with memory, so higher values also give the function more CPU. Increase it when SSR is CPU-bound or the app initializes large dependencies. `timeout` caps how long a single SSR request can run before the function is terminated — lower values fail fast on slow renders.

The values above are example Lambda settings, not Remix-specific defaults; see [Lambda functions](/resources/compute/lambda-function) for the full memory, timeout, CPU, and VPC reference.

`connectTo` automatically opens network access for VPC-protected resources such as databases and Redis. `serverLambda` also exposes VPC settings for cases where the SSR Lambda needs explicit VPC customization beyond what `connectTo` provides. The SSR function inherits memory, timeout, VPC, and logging behavior from [Lambda functions](/resources/compute/lambda-function).

## Static files and CDN

Stacktape uploads static assets to S3 and serves the entire Remix app through CloudFront. Most apps work well without customizing static file or CDN settings.

Use `fileOptions` when specific files need explicit HTTP headers such as `Cache-Control` that differ from defaults. Use `cdn` when you need to tune CDN caching for SSR routes or specific path patterns. See the API reference at the bottom of this page for the full `fileOptions` and `cdn` property schemas.

Skip CDN customization for early-stage apps; revisit when traffic and caching requirements become clearer.

## Domains and firewall

A Stacktape Remix resource can attach custom domains to the app's CDN and associate a Web Application Firewall with that CDN. `customDomains` configures DNS records and TLS certificates, while `useFirewall` references a `web-app-firewall` resource whose `scope` must be `cdn`.

Use `customDomains` for production and shared staging apps where users need a stable branded URL. A Route 53 hosted zone for the domain must exist in your AWS account, and your domain registrar's nameservers must point to that hosted zone. Stacktape creates the DNS record by default and provisions a free TLS certificate. Each `customDomains` entry requires `domainName` (the domain without protocol); optionally set `customCertificateArn` to use an existing ACM certificate instead of the auto-provisioned one, or `disableDnsRecordCreation` to skip DNS record creation when you manage DNS outside Route 53 (e.g. through Cloudflare).


Example (TypeScript):

```typescript
import { defineConfig, RemixWeb, WebAppFirewall } from 'stacktape';

export default defineConfig(() => {
  const firewall = new WebAppFirewall({
    scope: 'cdn'
  });

  const web = new RemixWeb({
    appDirectory: './apps/web',
    customDomains: [{ domainName: 'www.example.com' }],
    useFirewall: 'firewall'
  });

  return { resources: { firewall, web } };
});
```


Enable `useFirewall` when the public Remix app needs CDN-level WAF protection — for example, rate limiting, geo-blocking, or bot mitigation. Skip it for internal prototypes or early development stages where WAF rules would add configuration work before there is a clear threat model. This property protects the Remix CDN distribution specifically and requires a [web application firewall](/resources/security/web-application-firewall) resource with `scope: 'cdn'`.

## Connecting resources

`connectTo` is inherited from `ResourceAccessProps` and grants IAM permissions, opens network access where applicable (databases, Redis), and injects documented connection variables as environment variables named `STP_[RESOURCE_NAME]_[PARAM]` for supported resource types. See [connecting resources](/configuration/connecting-resources) for the full list of supported resources and injected variables. Use `iamRoleStatements` only for AWS permissions that are not covered by the resource connection model.


Example (TypeScript):

```typescript
import { defineConfig, RemixWeb, RelationalDatabase } from 'stacktape';

export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    engine: 'postgres-16',
    instanceClass: 'db.t4g.micro'
  });

  const web = new RemixWeb({
    appDirectory: './apps/web',
    connectTo: ['mainDatabase']
  });

  return { resources: { mainDatabase, web } };
});
```


The database engine and instance shape are configured on the [relational database](/resources/databases/relational-database) resource; see that page for supported engines and instance classes.

With the resource name `mainDatabase`, the Remix SSR function receives environment variables such as `STP_MAIN_DATABASE_CONNECTION_STRING`, `STP_MAIN_DATABASE_HOST`, and `STP_MAIN_DATABASE_PORT`. `connectTo` automatically opens network access for databases and Redis; `serverLambda` exposes VPC settings for cases where the SSR Lambda needs additional VPC customization. For the full connection model and injected variables by resource type, see [connecting resources](/configuration/connecting-resources).

## Environment variables

`environment` configures environment variables for the SSR Lambda function. Values needed by browser-side Remix code usually need to be handled by your application build process rather than by SSR Lambda runtime variables. Use `environment` for application configuration, feature flags, public service URLs needed by server code, and values produced by directives such as `$ResourceParam()` or `$Secret()`.


Example (TypeScript):

```typescript
import { defineConfig, RemixWeb } from 'stacktape';

export default defineConfig(() => {
  const web = new RemixWeb({
    appDirectory: './apps/web',
    environment: [
      { name: 'APP_ENV', value: 'production' },
      { name: 'API_KEY', value: "$Secret('my-api-key')" }
    ]
  });

  return { resources: { web } };
});
```


Prefer `connectTo` for Stacktape-managed resources because it grants supported IAM permissions, opens resource-side network access for databases and Redis, and injects documented connection variables. Use explicit `environment` entries for values that are not resource connections. For sensitive values, reference secrets through the [secrets](/configuration/secrets) and [directives](/configuration/directives) flow instead of hard-coding credentials in config.

## Logging

Use `serverLambda` to customize SSR Lambda logging behavior, including log retention. View logs using [`stacktape debug:logs`](/cli/debug-logs) or the [Stacktape Console](/stacktape-console/console-overview).


Example (TypeScript):

```typescript
import { defineConfig, RemixWeb } from 'stacktape';

export default defineConfig(() => {
  const web = new RemixWeb({
    appDirectory: './apps/web',
    serverLambda: {
      logging: {
        retentionDays: 30
      }
    }
  });

  return { resources: { web } };
});
```


`retentionDays` controls how many days CloudWatch keeps the SSR function's logs. Reducing it lowers storage costs on high-traffic apps. Leave the defaults in place for most deployed Remix apps. See [log forwarding](/observability/log-forwarding) for forwarding setup and [observability overview](/observability/overview) for the broader monitoring surface.

## FAQ

### What does Stacktape create for a Remix app?

A Stacktape Remix resource deploys SSR on an AWS Lambda function, static assets on S3, and a CloudFront CDN in front of both. The internal resource structure includes a nested bucket and a server Lambda function. See the [resources overview](/configuration/resources) for how Stacktape resources map to AWS.

### Where should `appDirectory` point?

`appDirectory` should point to the directory containing `vite.config.ts` (or `remix.config.js`). The default is `"."` (repository root). In a monorepo, point it at the Remix workspace directory rather than the root. The basic example on this page uses `./apps/web` to make that monorepo shape explicit.

### Can I use a custom domain with Remix?

Yes. Configure `customDomains` on the Remix resource, and make sure a Route 53 hosted zone for the domain exists in your AWS account with your registrar's nameservers pointing to it. Stacktape creates the DNS record by default and provisions a free TLS certificate. Provide `customCertificateArn` to use your own certificate; set `disableDnsRecordCreation` only when you manage DNS records yourself. See [custom domains](/resources/networking/custom-domains) for the broader domain model.

### Can I protect a Remix app with AWS WAF?

Yes. Set `useFirewall` to the name of a [web application firewall](/resources/security/web-application-firewall) resource whose `scope` is `cdn`. This attaches WAF rules to the CloudFront distribution serving your Remix app. It is separate from load-balancer firewall attachment paths used by compute resources.

### Does the Remix resource expose edge Lambda or response streaming options?

The Remix resource is Lambda-based SSR behind CloudFront, and its config surface does not expose edge Lambda or response streaming configuration. If you need direct control over a custom server process — for example, to run a streaming server — use a [web-service](/resources/compute/web-service) with a container.

### How do I run database migrations with Remix on Stacktape?

Use [deployment scripts and hooks](/deployment-and-lifecycle/deployment-scripts-and-hooks). `hooks.afterDeploy` references a named script, and script configs can use `connectTo` to receive documented connection variables for the database. Stacktape injects connection environment variables automatically. Add the database to the Remix resource's `connectTo` only if the Remix app also needs database access at runtime.

### How does CloudFront caching work for Remix apps?

Stacktape stores static assets on S3 and serves the entire app through CloudFront. Use `fileOptions` to set custom headers on static files matching a pattern, and `cdn` to configure cache controls for SSR routes and specific path patterns. See the API reference for the full `fileOptions` and `cdn` property schemas.

### How much does hosting Remix on Lambda and CloudFront cost?

AWS bills the underlying services separately: Lambda invocations and duration for SSR, S3 storage and requests for static assets, and CloudFront data transfer and requests for CDN traffic. Lambda has a generous free tier (1 million requests and 400,000 GB-seconds per month). CloudFront pricing is based on data transfer and requests, with free-tier allowances that may apply depending on the AWS account. Use [cost dashboards](/managing-costs/dashboards) after deployment to inspect real spend by stack.

### When should I use static hosting instead of the Remix resource?

Use [static hosting](/resources/frontend/static-hosting) when the site can be built into static files and does not need SSR, loaders, actions, or server-side data fetching. Static hosting has no Lambda cost and fewer moving parts. Use the Remix resource when runtime Remix behavior — loaders, actions, server rendering — is part of the product.

### When should I use a web service instead of the Remix resource?

Use a [web-service](/resources/compute/web-service) when you want to run a custom HTTP server in a container, control the server process directly, or want persistent connections. Use the Remix resource when the deployment unit is a standard Remix Vite app and you want Stacktape to manage SSR, static assets, and CDN routing automatically. The Remix resource has simpler config but less runtime control.

## API Reference


## API Reference: `RemixWebProps`
```typescript
import type { DirectoryUploadFilter, DomainConfiguration, EnvironmentVar, SsrWebCdnConfig, SsrWebDevConfig, SsrWebServerLambdaConfig, StpIamRoleStatement } from 'stacktape';

type RemixWebProps = {
  /** Directory containing your vite.config.ts (or remix.config.js). For monorepos, point to the Remix workspace. */
  appDirectory?: string;
  /** Override the default remix vite:build command. */
  buildCommand?: string;
  /** CDN cache controls for SSR routes and specific path patterns. */
  cdn?: SsrWebCdnConfig;
  /** Give this resource access to other resources in your stack. */
  connectTo?: Array<string>;
  /** Attach custom domains with auto-managed DNS records and TLS certificates. */
  customDomains?: Array<DomainConfiguration>;
  /** Dev server config for stacktape dev. Defaults to remix vite:dev. */
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
| `appDirectory` | no | `string` | Directory containing your `vite.config.ts` (or `remix.config.js`). For monorepos, point to the Remix workspace. | `.` |
| `buildCommand` | no | `string` | Override the default `remix vite:build` command. | - |
| `cdn` | no | `SsrWebCdnConfig` | CDN cache controls for SSR routes and specific path patterns. | - |
| `connectTo` | no | `Array<string>` | Give this resource access to other resources in your stack. List the names of resources this workload needs to communicate with. Stacktape automatically:

**Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)
**Opens network access** (security group rules for databases, Redis)
**Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`

Example: `connectTo: ["myDatabase", "myBucket"]` gives this workload full access to both
resources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc. | - |
| `customDomains` | no | `Array<DomainConfiguration>` | Attach custom domains with auto-managed DNS records and TLS certificates. **Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account. | - |
| `dev` | no | `SsrWebDevConfig` | Dev server config for `stacktape dev`. Defaults to `remix vite:dev`. | - |
| `environment` | no | `Array<EnvironmentVar>` | Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values. | - |
| `fileOptions` | no | `Array<DirectoryUploadFilter>` | Set custom headers (e.g., `Cache-Control`) for static files matching a pattern. | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | Raw IAM policy statements for permissions not covered by `connectTo`. Added as a separate policy alongside auto-generated permissions. Use this for
accessing AWS services directly (e.g., Rekognition, Textract, Bedrock). | - |
| `serverLambda` | no | `SsrWebServerLambdaConfig` | Customize the SSR Lambda function (memory, timeout, VPC, logging). | - |
| `useFirewall` | no | `string` | Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`. | - |
