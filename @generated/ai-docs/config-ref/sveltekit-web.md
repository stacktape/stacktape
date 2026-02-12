---
docType: config-ref
title: Svelte Kit Web
resourceType: sveltekit-web
tags:
  - sveltekit-web
  - sveltekit
  - svelte
source: types/stacktape-config/sveltekit-web.d.ts
priority: 1
---

# Svelte Kit Web

Deploy a SvelteKit SSR app with Lambda (AWS adapter), S3 for static assets, and CloudFront CDN.

For static-only SvelteKit sites, use `hosting-bucket` with `hostingContentType: 'sveltekit-static-website'` instead.

Resource type: `sveltekit-web`

## TypeScript Definition

```typescript
/**
 * #### Deploy a SvelteKit SSR app with Lambda (AWS adapter), S3 for static assets, and CloudFront CDN.
 *
 * ---
 *
 * For static-only SvelteKit sites, use `hosting-bucket` with `hostingContentType: 'sveltekit-static-website'` instead.
 */
interface SvelteKitWeb {
  type: 'sveltekit-web';
  properties: SvelteKitWebProps;
  overrides?: ResourceOverrides;
}

interface SvelteKitWebProps extends ResourceAccessProps {
  /**
   * #### Directory containing your `svelte.config.js`. For monorepos, point to the SvelteKit workspace.
   *
   * @default "."
   */
  appDirectory?: string;
  /**
   * #### Override the default `vite build` command.
   */
  buildCommand?: string;
  /**
   * #### Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values.
   */
  environment?: EnvironmentVar[];
  /**
   * #### Attach custom domains with auto-managed DNS records and TLS certificates.
   *
   * ---
   *
   * **Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account.
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Customize the SSR Lambda function (memory, timeout, VPC, logging).
   */
  serverLambda?: SsrWebServerLambdaConfig;
  /**
   * #### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.
   */
  useFirewall?: string;
  /**
   * #### Dev server config for `stacktape dev`. Defaults to `vite dev`.
   */
  dev?: SsrWebDevConfig;
  /**
   * #### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.
   */
  fileOptions?: DirectoryUploadFilter[];
}
```
