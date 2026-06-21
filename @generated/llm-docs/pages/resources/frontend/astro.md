# Astro

A Stacktape Astro resource deploys an Astro SSR app with Lambda for server rendering, S3 for static assets, and a CloudFront CDN. Use it when your Astro project needs server-rendered routes on AWS while keeping static assets handled separately from the SSR function.

## When to use

An Astro resource is the right fit when the Astro app uses server-side rendering and should be deployed as one Stacktape-managed frontend resource. Stacktape deploys an Astro SSR app with Lambda for server rendering, S3 for static assets, and a CloudFront CDN.

Common use cases:

- **Astro SSR websites** — content sites, portals, and apps that render some routes on the server
- **Monorepos** — set `appDirectory` to the Astro workspace instead of the Stacktape config directory
- **Custom frontend domains** — attach one or more Route 53-backed domains with managed DNS records and TLS certificates
- **Frontend apps with AWS dependencies** — use `connectTo` when the SSR function needs access to databases, buckets, queues, or other Stacktape resources

## When NOT to use

- **Static-only Astro sites** — use a [hosting bucket](/resources/frontend/static-hosting) with `hostingContentType: 'astro-static-website'` instead of an Astro SSR resource. The Astro source explicitly names this as the correct path for static output.
- **General containerized web apps** — use a [web service](/resources/compute/web-service) when the app is not an Astro project and needs an always-on container.
- **Single API handlers or event-driven compute** — use a [Lambda function](/resources/compute/lambda-function) when there is no Astro build output, static asset upload, or frontend routing concern.
- **Frontend frameworks with dedicated resources** — use [Next.js](/resources/frontend/nextjs), [Nuxt](/resources/frontend/nuxt), [SvelteKit](/resources/frontend/sveltekit), [SolidStart](/resources/frontend/solidstart), [TanStack Start](/resources/frontend/tanstack-start), or [Remix](/resources/frontend/remix) for those framework-specific builds.

## Basic example

This example deploys an Astro SSR app from the repository root. The default app directory is `.`, so the resource expects `astro.config.mjs` in the same workspace as the Stacktape config unless `appDirectory` is changed.


Example (TypeScript):

```typescript
import { defineConfig, AstroWeb } from 'stacktape';
export default defineConfig(() => {
  const site = new AstroWeb({
    appDirectory: '.'
  });

  return {
    resources: { site }
  };
});
```


Use `appDirectory` when `astro.config.mjs` lives outside the default `.` app directory, such as an Astro workspace in a monorepo. Use `buildCommand` only when the project should not run the default Astro build command, for example when a package manager script wraps the build.

## Project directory

The Astro resource uses `appDirectory` to find the Astro application directory. For a single-package project, the default `.` is usually the best choice. In a monorepo, point `appDirectory` at the package that contains `astro.config.mjs` so builds run against the right workspace.


Example (TypeScript):

```typescript
import { defineConfig, AstroWeb } from 'stacktape';

export default defineConfig(() => {
  const site = new AstroWeb({
    appDirectory: './apps/marketing',
    buildCommand: 'pnpm build'
  });

  return { resources: { site } };
});
```


`buildCommand` overrides the default `astro build` command. Keep the default unless the Astro app already standardizes builds through a script such as `pnpm build`, or the monorepo needs package-manager-specific behavior before Astro runs.

## Server Lambda

The Astro resource renders SSR routes with a Lambda function that can be tuned through `serverLambda`. The source exposes memory, timeout, VPC joining, and logging controls. Default memory is `1024` MB, default timeout is `30` seconds, and the timeout cannot exceed `30` seconds.


Example (TypeScript):

```typescript
import { defineConfig, AstroWeb } from 'stacktape';

export default defineConfig(() => {
  const site = new AstroWeb({
    serverLambda: {
      memory: 2048,
      timeout: 20
    }
  });

  return { resources: { site } };
});
```


Increase `memory` when SSR routes do meaningful server-side work, because Lambda CPU scales with memory and the source notes that `1,769` MB corresponds to `1` vCPU. Lowering `timeout` can fail slow requests earlier; leave it at the default `30` seconds when routes may need the full allowed execution window.

Set `joinDefaultVpc` only when the SSR function must connect to VPC resources such as databases or Redis. Joining the VPC removes direct internet access from the function, so keep the default for public APIs, third-party HTTP calls, and sites that only need public outbound traffic. If the SSR function needs both VPC resources and outbound internet, configure NAT gateways via `stackConfig.vpc.nat`.

## Custom domains

Astro custom domains attach your own hostnames to the CloudFront-backed app with Stacktape-managed DNS records and TLS certificates. A Route 53 hosted zone for the domain must already exist in your AWS account, and the domain registrar's nameservers must point to that hosted zone so that DNS resolution reaches Route 53. If DNS is managed outside Route 53 (for example, through Cloudflare), set `disableDnsRecordCreation` on the domain entry instead — Stacktape will still provision the TLS certificate but will not create DNS records. Use custom domains for production hostnames; skip custom domains for preview stages unless those stages need stable branded hostnames.


Example (TypeScript):

```typescript
import { defineConfig, AstroWeb } from 'stacktape';

export default defineConfig(() => {
  const site = new AstroWeb({
    customDomains: [
      {
        domainName: 'www.example.com'
      }
    ]
  });

  return { resources: { site } };
});
```


`domainName` must not include `https://`. By default, Stacktape creates the DNS record and provisions a free TLS certificate. Set `customCertificateArn` only when you need to use your own ACM certificate (for example, an EV or OV certificate).

## CDN and firewall

The Astro resource includes CDN controls for SSR routes and specific path patterns, plus static-file header controls through `fileOptions`. Use these settings when the default caching or headers do not match how the Astro app serves assets and SSR responses. Keep the defaults for small apps until cache behavior becomes a real performance or correctness concern.

Use `useFirewall` to attach a [web application firewall](/resources/security/web-application-firewall) to the Astro app. The referenced firewall must have `scope: 'cdn'`, because the Astro resource is protected at the CloudFront/CDN layer. Enable a firewall for public production apps that need request filtering; skip it for internal previews or low-risk sites where added policy management is not worth the complexity.


Example (TypeScript):

```typescript
import { defineConfig, AstroWeb, WebAppFirewall } from 'stacktape';

export default defineConfig(() => {
  const firewall = new WebAppFirewall({
    scope: 'cdn'
  });

  const site = new AstroWeb({
    useFirewall: 'firewall'
  });

  return { resources: { firewall, site } };
});
```


The `fileOptions` array sets custom HTTP headers for static files whose path matches an `includePattern` glob (for example, `assets/**`). Each entry accepts `includePattern`, an optional `excludePattern`, and a `headers` array of key-value pairs. Use `fileOptions` to set `Cache-Control` or other headers on fingerprinted build assets. For SSR route caching and path-specific CDN cache behavior, use the separate `cdn` property. See the API reference below for the exact shape of each entry.

## Connecting resources

Use `connectTo` to give the Astro resource access to other resources in your stack. The `connectTo` contract grants IAM permissions, opens network access for resources that require security group rules (such as relational databases and Redis), and injects `STP_[RESOURCE_NAME]_[PARAM]` environment variables for supported resource types. For the full list of injected variables per resource type, see [connecting resources](/configuration/connecting-resources).


Example (TypeScript):

```typescript
import { defineConfig, AstroWeb, Bucket } from 'stacktape';

export default defineConfig(() => {
  const mediaBucket = new Bucket({});

  const site = new AstroWeb({
    connectTo: ['mediaBucket'],
    environment: [{ name: 'PUBLIC_SITE_NAME', value: 'Docs Portal' }]
  });

  return { resources: { mediaBucket, site } };
});
```


With the `mediaBucket` resource name shown above, the Astro SSR function receives `STP_MEDIA_BUCKET_NAME` and `STP_MEDIA_BUCKET_ARN` as environment variables. Use `environment` for application settings and directives such as `$Secret()` or `$ResourceParam()`, and use `iamRoleStatements` only for AWS permissions not covered by `connectTo`.

When connecting to VPC resources such as relational databases or Redis, enable `serverLambda.joinDefaultVpc` on the Astro resource so the SSR function can reach those resources over the private network. Note that joining the VPC removes direct internet access from the function — if the SSR function also needs outbound internet, configure NAT gateways via `stackConfig.vpc.nat`.

## Dev mode

Astro dev mode configuration controls how `stacktape dev` starts the local Astro development server. The default command is `astro dev`, which is enough for simple projects. Override the command or working directory when the repository uses package-manager scripts or the Astro app lives inside a monorepo workspace.


Example (TypeScript):

```typescript
import { defineConfig, AstroWeb } from 'stacktape';

export default defineConfig(() => {
  const site = new AstroWeb({
    appDirectory: './apps/marketing',
    dev: {
      command: 'pnpm dev',
      workingDirectory: './apps/marketing'
    }
  });

  return { resources: { site } };
});
```


Keep `dev.command` aligned with how the team runs Astro locally outside Stacktape. `dev.workingDirectory` is relative to the project root, so it is useful when the command must run from the Astro package directory rather than the repository root. See [`stacktape dev`](/cli/dev) for the CLI command reference.

## Logging

Astro SSR logs are sent to CloudWatch. Configure Lambda logging through the `serverLambda.logging` property. Use the [`stacktape debug:logs`](/cli/debug-logs) command to inspect SSR runtime output from the CLI, or view logs directly in the AWS console.

The source exposes logging under `serverLambda`, not as a top-level Astro property. Keep that distinction clear when configuring the app: static asset delivery and CDN behavior are separate from Lambda runtime logging for SSR requests.

## FAQ

### Is Stacktape Astro for SSR or static Astro sites?

A Stacktape Astro resource is for Astro SSR apps. Static-only Astro sites should use a [hosting bucket](/resources/frontend/static-hosting) with `hostingContentType: 'astro-static-website'` instead. The Astro source explicitly names `hosting-bucket` with this content type as the correct path for static output.

### What AWS services does Stacktape use for Astro?

A Stacktape Astro resource uses Lambda for server rendering, S3 for static assets, and CloudFront as the CDN. Stacktape presents these as one Astro frontend resource so most teams do not need to wire the AWS services manually. The API details are in the Astro resource reference below.

### Can I use a custom domain with Astro?

Yes. Add `customDomains` to the Astro resource and provide a domain name backed by a Route 53 hosted zone in your AWS account, with the domain registrar's nameservers pointing to that hosted zone. By default, Stacktape creates the DNS record and provisions a free TLS certificate. Provide `customCertificateArn` only when you need your own ACM certificate. If DNS is managed outside Route 53, set `disableDnsRecordCreation` so Stacktape provisions the certificate without creating DNS records. See [custom domains](/resources/networking/custom-domains) for the broader domain model.

### Can I protect an Astro app with AWS WAF?

Yes. Set `useFirewall` to the name of a `web-app-firewall` resource whose `scope` is `cdn`. That protects the Astro app at the CDN layer, which is the attachment path documented by the Astro source. See [web application firewall](/resources/security/web-application-firewall) for firewall configuration.

### How do I connect Astro SSR to a database?

Add the database resource name to `connectTo` on the Astro resource and enable `serverLambda.joinDefaultVpc` so the SSR function can reach VPC resources. The `connectTo` contract handles IAM permissions, network access for resources that need security group rules, and environment variable injection using the `STP_[RESOURCE_NAME]_[PARAM]` pattern. Note that joining the VPC removes direct internet access — configure NAT gateways if the function also needs outbound internet. See [connecting resources](/configuration/connecting-resources) for the complete injected-variable table.

### Does Astro SSR run in a VPC?

The Astro SSR Lambda can join the default VPC when `serverLambda.joinDefaultVpc` is enabled. Use that only when the function must reach VPC resources such as databases or Redis. The source warns that the function loses direct internet access when joined to the VPC, so public outbound HTTP workloads should usually keep the default.

### How much does an Astro SSR app cost on AWS?

An Astro SSR app typically has Lambda invocation and duration costs for server-rendered routes, S3 storage and request costs for static assets, and CloudFront data transfer and request costs for CDN traffic. The provided Stacktape source does not include concrete Astro pricing numbers, so this page does not quote list prices. Use [managing costs](/managing-costs/overview) to track deployed stack spend.

### When should I use Astro instead of Next.js?

Use the Stacktape Astro resource when the project is an Astro app and you want Astro's content-focused SSR model. Use [Next.js](/resources/frontend/nextjs) when the project depends on Next.js routing, rendering, or framework conventions. Stacktape has dedicated resources for both frameworks, so choose based on the application framework, not the AWS plumbing.

### Can I change the Astro build command?

Yes. Set `buildCommand` when the default `astro build` command is not the command your project should run. This is common in monorepos or teams that standardize builds through scripts such as `pnpm build`. Keep the default for simple Astro projects to reduce configuration.

### Where do I configure local Astro development?

Use the `dev` property on the Astro resource to override the default `astro dev` command or set a working directory. This is only for `stacktape dev`; deployment builds use `buildCommand` and the Astro app directory. See [`stacktape dev`](/cli/dev) for CLI behavior.

## API Reference


## API Reference: `AstroWebProps`
```typescript
import type { AstroWebDevConfig, AstroWebServerLambdaConfig, DirectoryUploadFilter, DomainConfiguration, EnvironmentVar, SsrWebCdnConfig, StpIamRoleStatement } from 'stacktape';

type AstroWebProps = {
  /** Directory containing your astro.config.mjs. For monorepos, point to the Astro workspace. */
  appDirectory?: string;
  /** Override the default astro build command. */
  buildCommand?: string;
  /** CDN cache controls for SSR routes and specific path patterns. */
  cdn?: SsrWebCdnConfig;
  /** Give this resource access to other resources in your stack. */
  connectTo?: Array<string>;
  /** Attach custom domains with auto-managed DNS records and TLS certificates. */
  customDomains?: Array<DomainConfiguration>;
  /** Dev server config for stacktape dev. Defaults to astro dev. */
  dev?: AstroWebDevConfig;
  /** Environment variables for the SSR function. Use $ResourceParam() or $Secret() for dynamic values. */
  environment?: Array<EnvironmentVar>;
  /** Set custom headers (e.g., Cache-Control) for static files matching a pattern. */
  fileOptions?: Array<DirectoryUploadFilter>;
  /** Raw IAM policy statements for permissions not covered by connectTo. */
  iamRoleStatements?: Array<StpIamRoleStatement>;
  /** Customize the SSR Lambda function (memory, timeout, VPC, logging). */
  serverLambda?: AstroWebServerLambdaConfig;
  /** Name of a web-app-firewall resource to protect this app. Firewall scope must be cdn. */
  useFirewall?: string;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `appDirectory` | no | `string` | Directory containing your `astro.config.mjs`. For monorepos, point to the Astro workspace. | `.` |
| `buildCommand` | no | `string` | Override the default `astro build` command. | - |
| `cdn` | no | `SsrWebCdnConfig` | CDN cache controls for SSR routes and specific path patterns. | - |
| `connectTo` | no | `Array<string>` | Give this resource access to other resources in your stack. List the names of resources this workload needs to communicate with. Stacktape automatically:

**Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)
**Opens network access** (security group rules for databases, Redis)
**Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`

Example: `connectTo: ["myDatabase", "myBucket"]` gives this workload full access to both
resources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc. | - |
| `customDomains` | no | `Array<DomainConfiguration>` | Attach custom domains with auto-managed DNS records and TLS certificates. **Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account. | - |
| `dev` | no | `AstroWebDevConfig` | Dev server config for `stacktape dev`. Defaults to `astro dev`. | - |
| `environment` | no | `Array<EnvironmentVar>` | Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values. | - |
| `fileOptions` | no | `Array<DirectoryUploadFilter>` | Set custom headers (e.g., `Cache-Control`) for static files matching a pattern. | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | Raw IAM policy statements for permissions not covered by `connectTo`. Added as a separate policy alongside auto-generated permissions. Use this for
accessing AWS services directly (e.g., Rekognition, Textract, Bedrock). | - |
| `serverLambda` | no | `AstroWebServerLambdaConfig` | Customize the SSR Lambda function (memory, timeout, VPC, logging). | - |
| `useFirewall` | no | `string` | Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`. | - |
