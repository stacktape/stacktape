# SolidStart

A Stacktape SolidStart resource deploys a SolidStart app with SSR on AWS Lambda, static assets on S3, and a CloudFront CDN. Set `appDirectory` to the directory containing `app.config.ts`, and Stacktape handles the Vinxi build, SSR function, asset bucket, CloudFront CDN, and optional custom domains. Use `environment` or `connectTo` to pass values into the SSR Lambda.

## When to use

- **Server-rendered apps** — dashboards, portals, and content sites that need dynamic pages instead of only static files
- **SolidStart monorepos** — set `appDirectory` to the workspace containing `app.config.ts`, rather than the repository root
- **SSR without manual wiring** — SolidStart apps that need SSR can use the dedicated SolidStart resource instead of manually wiring a Lambda function, S3 bucket, and CloudFront CDN

## When NOT to use

- **Pure static websites** — use [static hosting](/resources/frontend/static-hosting) when your Solid app is exported as static files and does not need SSR.
- **Containerized custom servers** — use a [web-service](/resources/compute/web-service) when you want to run a custom Node server or another HTTP process in a container.
- **General backend APIs** — use a [Lambda function](/resources/compute/lambda-function) or [web-service](/resources/compute/web-service) for standalone APIs that are not part of a SolidStart app.
- **Other meta-frameworks** — Stacktape has dedicated resources for [Next.js](/resources/frontend/nextjs), [Astro](/resources/frontend/astro), [Nuxt](/resources/frontend/nuxt), [SvelteKit](/resources/frontend/sveltekit), [TanStack Start](/resources/frontend/tanstack-start), and [Remix](/resources/frontend/remix). Choose the dedicated resource for the framework your team uses.

## Basic example

The smallest useful SolidStart config points Stacktape at the directory containing `app.config.ts`. In a single-app repository that is often the repository root (the default `"."`); in a monorepo it is the package or workspace directory for the SolidStart app.


Example (TypeScript):

```typescript
import { defineConfig, SolidStartWeb } from 'stacktape';
export default defineConfig(() => {
  const web = new SolidStartWeb({
    appDirectory: './apps/web'
  });

  return {
    resources: { web }
  };
});
```


`appDirectory` defaults to `"."` and must point to the directory containing `app.config.ts`. Stacktape deploys a SolidStart SSR app with Lambda for server rendering, S3 for static assets, and a CloudFront CDN.

## Build and dev

Stacktape runs `vinxi build` from `appDirectory` by default. `buildCommand` lets teams replace this when the repository has a custom build script — for example, a monorepo using `pnpm --filter web build` or an app that needs a prebuild step. Leave `buildCommand` unset when a standard Vinxi build works from `appDirectory`; fewer custom commands make CI and local behavior easier to reason about.

`dev` configures the local dev server used by [`stacktape dev`](/local-development/dev-mode-overview), defaulting to `vinxi dev`.


Example (TypeScript):

```typescript
import { defineConfig, SolidStartWeb } from 'stacktape';

export default defineConfig(() => {
  const web = new SolidStartWeb({
    appDirectory: './apps/web',
    buildCommand: 'pnpm --filter web build',
    dev: {
      command: 'pnpm --filter web dev'
    }
  });

  return { resources: { web } };
});
```


Override `dev` to customize the local dev server for [`stacktape dev`](/local-development/dev-mode-overview). `dev` configures the local dev server; `buildCommand` controls the deployment build command.

## Server Lambda

A Stacktape SolidStart resource serves SSR through an AWS Lambda function. `serverLambda` customizes that function, including memory, timeout, VPC access, and logging. The SSR function inherits memory, timeout, VPC, and logging behavior from Stacktape [Lambda functions](/resources/compute/lambda-function); see that page for detailed limits.


Example (TypeScript):

```typescript
import { defineConfig, SolidStartWeb } from 'stacktape';

export default defineConfig(() => {
  const web = new SolidStartWeb({
    appDirectory: './apps/web',
    serverLambda: {
      memory: 2048,
      timeout: 25
    }
  });

  return { resources: { web } };
});
```


The `2048` MB memory and `25` second timeout shown above are example overrides, not SolidStart-specific defaults. Leave `serverLambda` unset until SSR latency, initialization cost, or integration behavior gives you a reason to tune it. Increase `memory` when SSR is CPU-bound or the app initializes large dependencies. `timeout` configures the maximum seconds the SSR function runs before AWS terminates the invocation. Use `serverLambda` VPC configuration when the SSR Lambda must reach VPC-protected resources such as databases or Redis; see the [Lambda function](/resources/compute/lambda-function) page for inherited VPC options.

Use [`stacktape debug:logs`](/cli/debug-logs) or the [Stacktape Console](/stacktape-console/console-overview) to view SSR function logs. See the API reference at the bottom of this page for the full `serverLambda` property surface including logging configuration.

## Custom domains and firewall

A Stacktape SolidStart resource can attach custom domains to the CloudFront CDN and associate a Web Application Firewall. `customDomains` configures DNS records and TLS certificates, while `useFirewall` references a [`web-app-firewall`](/resources/security/web-application-firewall) resource whose `scope` must be `cdn`.

Use `customDomains` for production and shared staging apps where users need a stable branded URL. A Route 53 hosted zone for the domain must exist in your AWS account. Stacktape creates DNS records and provisions free TLS certificates automatically; set `customCertificateArn` only when you have specific certificate requirements, and `disableDnsRecordCreation` when you manage DNS elsewhere (for example through Cloudflare).


Example (TypeScript):

```typescript
import { defineConfig, SolidStartWeb, WebAppFirewall } from 'stacktape';

export default defineConfig(() => {
  const firewall = new WebAppFirewall({
    scope: 'cdn'
  });

  const web = new SolidStartWeb({
    appDirectory: './apps/web',
    customDomains: [{ domainName: 'www.example.com' }],
    useFirewall: 'firewall'
  });

  return { resources: { firewall, web } };
});
```


Use a hostname such as `www.example.com` in `domainName`; do not include `https://`. See [custom domains](/resources/networking/custom-domains) for the full domain configuration model.

Enable `useFirewall` when your public SolidStart app handles user input and needs protection against common web exploits like SQL injection and XSS, or when the app needs request rate limiting at the CDN edge. AWS WAF adds per-rule and per-million-request costs on top of CloudFront charges. Skip it for internal tools, prototypes, or early development stages where the added configuration is not justified. See [web application firewall](/resources/security/web-application-firewall) for configuring rules.

## Static files

A Stacktape SolidStart resource uploads static assets to S3. `fileOptions` sets custom headers such as `Cache-Control` for uploaded files matching a glob pattern. Use `fileOptions` only when specific uploaded static files need custom headers; otherwise leave static-file handling to the SolidStart build output and Stacktape's default upload behavior.


Example (TypeScript):

```typescript
import { defineConfig, SolidStartWeb } from 'stacktape';

export default defineConfig(() => {
  const web = new SolidStartWeb({
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


`includePattern` is a glob that selects which uploaded files the rule applies to. Use a long `max-age` with `immutable` only for fingerprinted assets whose filenames change on each build; use shorter caching for files whose URL stays stable across deploys.

## CDN

A Stacktape SolidStart resource serves the app through CloudFront. The `cdn` property configures cache controls for SSR routes and specific path patterns. Leave `cdn` unset unless you need custom cache behavior for particular routes.

Tune CDN caching when you have high-traffic server-rendered pages with content that changes infrequently and you want to reduce Lambda invocations by caching responses at edge locations. Caching SSR responses at the CDN edge trades freshness for latency and cost: cached responses are faster and cheaper to serve, but users may see stale content until the cache expires. See the API reference for the full `cdn` property surface.


Example (TypeScript):

```typescript
import { defineConfig, SolidStartWeb } from 'stacktape';

export default defineConfig(() => {
  const web = new SolidStartWeb({
    appDirectory: './apps/web',
    cdn: {
      defaultCachingOptions: {
        defaultTTL: 0,
        maxTTL: 60
      },
      pathCachingOverrides: [
        {
          path: '/marketing/*',
          cachingOptions: {
            defaultTTL: 300,
            maxTTL: 600
          }
        }
      ]
    }
  });

  return { resources: { web } };
});
```


`defaultCachingOptions` overrides the default SSR caching behavior for all server-rendered routes. `pathCachingOverrides` sets caching rules for specific URL patterns — in this example, pages under `/marketing/*` are cached for 5 minutes (`defaultTTL: 300`) while all other SSR routes default to no caching (`defaultTTL: 0`). TTL values are in seconds.

## Connecting resources

`connectTo` gives the SolidStart SSR function access to other Stacktape resources. Stacktape grants IAM permissions, opens network access where needed, and injects connection details as environment variables following the `STP_[RESOURCE_NAME]_[PARAM]` pattern. For the full injected-variable table by resource type, see [connecting resources](/configuration/connecting-resources).


Example (TypeScript):

```typescript
import { defineConfig, SolidStartWeb, RelationalDatabase, RdsEnginePostgresql } from 'stacktape';
export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    engine: new RdsEnginePostgresql({
      primaryInstance: {
        instanceSize: 'db.t4g.micro'
      }
    })
  });

  const web = new SolidStartWeb({
    appDirectory: './apps/web',
    connectTo: ['mainDatabase']
  });

  return { resources: { mainDatabase, web } };
});
```


With `connectTo: ['mainDatabase']`, Stacktape injects environment variables following the `STP_[RESOURCE_NAME]_[PARAM]` pattern. For [relational databases](/resources/databases/relational-database), documented injected parameters are `CONNECTION_STRING`, `HOST`, and `PORT`; Aurora clusters also get `READER_CONNECTION_STRING` and `READER_HOST`. In this example, that produces `STP_MAIN_DATABASE_CONNECTION_STRING`, `STP_MAIN_DATABASE_HOST`, and `STP_MAIN_DATABASE_PORT`. When the SSR Lambda must reach VPC-protected resources such as databases or Redis, set `serverLambda.joinDefaultVpc` to `true`. Note that joining a VPC removes direct internet access from the Lambda; see the [Lambda function](/resources/compute/lambda-function) page for VPC options and tradeoffs.

## Environment variables

A Stacktape SolidStart resource can set explicit `environment` variables for the SSR function. Use these for application configuration, feature flags, and values produced by directives such as `$ResourceParam()` or `$Secret()`.


Example (TypeScript):

```typescript
import { defineConfig, SolidStartWeb } from 'stacktape';

export default defineConfig(() => {
  const web = new SolidStartWeb({
    appDirectory: './apps/web',
    environment: [
      { name: 'APP_ENV', value: 'production' },
      { name: 'PUBLIC_API_URL', value: 'https://api.example.com' }
    ]
  });

  return { resources: { web } };
});
```


Prefer `connectTo` for Stacktape-managed resources because it handles both permissions and environment variable injection. Use explicit `environment` entries for values that are not resource connections — application secrets, feature flags, or third-party API keys. For sensitive values, use the [`$Secret()` directive](/configuration/directives) instead of hard-coding credentials.

## FAQ

### What does Stacktape create for a SolidStart app?

A Stacktape SolidStart resource deploys a SolidStart SSR app with a nested `serverFunction` (Lambda for SSR) and `bucket` (S3 for static assets), fronted by a CloudFront CDN. The default build command is `vinxi build` unless `buildCommand` is set. See the [resources overview](/configuration/resources) for how Stacktape resources map to AWS.

### Where should `appDirectory` point?

Set `appDirectory` to the directory containing `app.config.ts`. It defaults to `"."`, the repository root. In a monorepo, set it to the SolidStart workspace (e.g. `./apps/web`) rather than the root. Use `buildCommand` when the default `vinxi build` is not the command you want Stacktape to run.

### Can I use a custom domain with SolidStart?

Yes. Configure `customDomains` on the SolidStart resource and ensure a Route 53 hosted zone for the domain exists in your AWS account. Stacktape automatically creates DNS records and provisions free TLS certificates. By default, Stacktape provisions and renews free certificates automatically; set `customCertificateArn` for a certificate from your AWS account, or `disableDnsRecordCreation` when Stacktape should skip DNS record creation. See [custom domains](/resources/networking/custom-domains) for the broader domain model.

### How do I connect to a database from SolidStart server functions?

Use `connectTo` to reference the database resource. Stacktape injects connection details as environment variables following the `STP_[RESOURCE_NAME]_[PARAM]` pattern — access them in SolidStart server functions via `process.env`. For VPC-protected databases, set `serverLambda.joinDefaultVpc` to `true` so the SSR Lambda can reach the database. See [connecting resources](/configuration/connecting-resources) for the full variable table.

### Can I protect a SolidStart app with AWS WAF?

Yes. Set `useFirewall` to the name of a [web application firewall](/resources/security/web-application-firewall) resource whose `scope` is `cdn`. This protects the CloudFront distribution. AWS WAF charges per rule and per million inspected requests, on top of CloudFront costs.

### How does Lambda cold start affect SolidStart SSR?

When no warm Lambda instance is available, AWS provisions a new execution environment, adding latency to the first request. Cold starts for Node.js Lambda functions typically add 200–500 ms depending on bundle size and memory allocation. Increase `serverLambda.memory` to speed up initialization, and rely on CloudFront CDN caching to reduce the number of requests that reach Lambda. Subsequent requests to a warm instance avoid the cold-start penalty.

### How much does hosting SolidStart on Lambda and CloudFront cost?

AWS bills Lambda, S3, and CloudFront separately. Lambda charges per invocation and GB-second of compute; S3 charges for storage and requests; CloudFront charges for data transfer and requests. All three services include free-tier allowances — check [AWS pricing](https://aws.amazon.com/pricing/) for current free-tier limits and regional rates. For most low-to-moderate traffic apps, the combined cost stays under a few dollars per month. Use [cost dashboards](/managing-costs/dashboards) to inspect real spend after deploying.

### When should I use static hosting instead of the SolidStart resource?

Use [static hosting](/resources/frontend/static-hosting) when the site builds to static files and does not need SSR. Static hosting has fewer moving parts, no Lambda cold starts, and lower per-request cost since every response is served from S3 through the CDN. Use the SolidStart resource when the app needs runtime server rendering for dynamic content, authentication, or data fetching during SSR.

### When should I use a web service instead of the SolidStart resource?

Use a [web-service](/resources/compute/web-service) when you need a persistent HTTP server, long-running WebSocket connections, or a framework not modeled by the frontend resources. Web services run in containers and offer more control over the server process. The SolidStart resource is purpose-built for the standard SolidStart build output and manages SSR, static assets, and CloudFront CDN without requiring a container.

### How does SolidStart SSR compare to Next.js SSR on Stacktape?

Both deploy with the same underlying architecture: Lambda for SSR, S3 for static assets, and CloudFront for CDN. The [Next.js resource](/resources/frontend/nextjs) has its own framework-specific configuration surface. Choose based on which framework your team uses and the framework-level features you need — the infrastructure model is equivalent.

## API Reference


## API Reference: `SolidStartWebProps`
```typescript
import type { DirectoryUploadFilter, DomainConfiguration, EnvironmentVar, SsrWebCdnConfig, SsrWebDevConfig, SsrWebServerLambdaConfig, StpIamRoleStatement } from 'stacktape';

type SolidStartWebProps = {
  /** Directory containing your app.config.ts. For monorepos, point to the SolidStart workspace. */
  appDirectory?: string;
  /** Override the default vinxi build command. */
  buildCommand?: string;
  /** CDN cache controls for SSR routes and specific path patterns. */
  cdn?: SsrWebCdnConfig;
  /** Give this resource access to other resources in your stack. */
  connectTo?: Array<string>;
  /** Attach custom domains with auto-managed DNS records and TLS certificates. */
  customDomains?: Array<DomainConfiguration>;
  /** Dev server config for stacktape dev. Defaults to vinxi dev. */
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
| `appDirectory` | no | `string` | Directory containing your `app.config.ts`. For monorepos, point to the SolidStart workspace. | `.` |
| `buildCommand` | no | `string` | Override the default `vinxi build` command. | - |
| `cdn` | no | `SsrWebCdnConfig` | CDN cache controls for SSR routes and specific path patterns. | - |
| `connectTo` | no | `Array<string>` | Give this resource access to other resources in your stack. List the names of resources this workload needs to communicate with. Stacktape automatically:

**Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)
**Opens network access** (security group rules for databases, Redis)
**Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`

Example: `connectTo: ["myDatabase", "myBucket"]` gives this workload full access to both
resources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc. | - |
| `customDomains` | no | `Array<DomainConfiguration>` | Attach custom domains with auto-managed DNS records and TLS certificates. **Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account. | - |
| `dev` | no | `SsrWebDevConfig` | Dev server config for `stacktape dev`. Defaults to `vinxi dev`. | - |
| `environment` | no | `Array<EnvironmentVar>` | Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values. | - |
| `fileOptions` | no | `Array<DirectoryUploadFilter>` | Set custom headers (e.g., `Cache-Control`) for static files matching a pattern. | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | Raw IAM policy statements for permissions not covered by `connectTo`. Added as a separate policy alongside auto-generated permissions. Use this for
accessing AWS services directly (e.g., Rekognition, Textract, Bedrock). | - |
| `serverLambda` | no | `SsrWebServerLambdaConfig` | Customize the SSR Lambda function (memory, timeout, VPC, logging). | - |
| `useFirewall` | no | `string` | Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`. | - |
