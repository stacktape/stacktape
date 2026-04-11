---
docType: config-ref
title: Deployment Script
resourceType: deployment-script
tags:
  - deployment-script
  - deploy-script
  - migration-script
source: types/stacktape-config/deployment-script.d.ts
priority: 1
---

# Deployment Script

Run a script during deploy or delete — database migrations, seed data, cleanup tasks.

Executes as a Lambda function. Use `after:deploy` to run migrations after resources are ready,
or `before:delete` for cleanup. Can also be triggered manually with `stacktape deployment-script:run`.

Resource type: `deployment-script`

## TypeScript Definition

```typescript
/**
 * #### Run a script during deploy or delete — database migrations, seed data, cleanup tasks.
 *
 * ---
 *
 * Executes as a Lambda function. Use `after:deploy` to run migrations after resources are ready,
 * or `before:delete` for cleanup. Can also be triggered manually with `stacktape deployment-script:run`.
 */
interface DeploymentScript {
  type: 'deployment-script';
  properties: DeploymentScriptProps;
  overrides?: ResourceOverrides;
}

interface DeploymentScriptProps extends ResourceAccessProps {
  /**
   * #### When to run: `after:deploy` (fails → rollback) or `before:delete` (fails → deletion continues).
   */
  trigger: 'after:deploy' | 'before:delete';
  /**
   * #### How the script code is packaged. Use `stacktape-lambda-buildpack` for auto-bundling.
   */
  packaging: LambdaPackaging;
  /**
   * #### Lambda runtime. Auto-detected from file extension if not specified.
   */
  runtime?: LambdaRuntime;
  /**
   * #### Environment variables injected at runtime. Use `$ResourceParam()` or `$Secret()` for dynamic values.
   */
  environment?: EnvironmentVar[];
  /**
   * #### Structured data passed to the handler function as the event payload. Not for secrets — use `environment`.
   */
  parameters?: { [name: string]: any };
  /**
   * #### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.
   */
  memory?: number;
  /**
   * #### Max execution time in seconds. Max: 900 (15 minutes).
   * @default 10
   */
  timeout?: number;
  /**
   * #### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.
   */
  joinDefaultVpc?: boolean;
  /**
   * #### Ephemeral `/tmp` storage in MB (512–10,240).
   * @default 512
   */
  storage?: number;
}
```
