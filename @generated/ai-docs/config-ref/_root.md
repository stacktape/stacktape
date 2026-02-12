---
docType: config-ref
title: Stacktape Config
tags:
  - root
  - config
  - stacktape-config
  - top-level
source: types/stacktape-config/_root.d.ts
priority: 1
---

# Stacktape Config

## TypeScript Definition

```typescript
interface StacktapeConfig {
  /**
   * #### The name of this service.
   *
   * ---
   *
   * > **Deprecated:** Use the `--projectName` option in the CLI instead.
   *
   * The CloudFormation stack name will be in the format: `{serviceName}-{stage}`.
   *
   * Must be alphanumeric and can contain dashes. Must match the regex `[a-zA-Z][-a-zA-Z0-9]*`.
   *
   * @deprecated
   */
  serviceName?: string;
  /**
   * #### Credentials and settings for 3rd-party services (MongoDB Atlas, Upstash).
   *
   * ---
   *
   * Required only if you use `mongo-db-atlas-cluster` or `upstash-redis` resources in your stack.
   */
  providerConfig?: {
    mongoDbAtlas?: MongoDbAtlasProvider;
    upstash?: UpstashProvider;
  };
  /**
   * #### Reusable values you can reference anywhere in the config with `$Var().variableName`.
   *
   * ---
   *
   * Useful for avoiding repetition. For example, define a shared environment name
   * and reference it in multiple resources.
   *
   * ```yaml
   * variables:
   *   appPort: 3000
   * # Then use: $Var().appPort
   * ```
   */
  variables?: { [variableName: string]: any };
  /**
   * #### Set a monthly spending limit and get email alerts when costs approach it.
   *
   * ---
   *
   * The budget resets at the start of each calendar month. You can configure alerts
   * based on actual spend or AWS-forecasted spend.
   *
   * > Not available in all regions (e.g., `ap-east-1`, `af-south-1`).
   */
  budgetControl?: BudgetControl;
  /**
   * #### Run scripts automatically before/after deploy, delete, or dev commands.
   *
   * ---
   *
   * Each hook references a script defined in the `scripts` section.
   * Common uses: run database migrations after deploy, build frontend before deploy,
   * clean up resources after delete.
   */
  hooks?: Hooks;
  /**
   * #### Custom shell commands or code you can run manually or as lifecycle hooks.
   *
   * ---
   *
   * Use `connectTo` in a script to auto-inject database URLs, API keys, etc. as environment variables.
   * Run scripts with `stacktape script:run --scriptName myScript` or attach them to `hooks`.
   *
   * **Script types:**
   * - **`local-script`**: Runs on your machine (or CI). Good for migrations, builds, seed scripts.
   * - **`local-script-with-bastion-tunneling`**: Runs locally but tunnels connections to VPC-only
   *   resources (e.g., private databases) through a bastion host.
   * - **`bastion-script`**: Runs remotely on the bastion host inside your VPC.
   *
   * Scripts can be shell commands or JS/TS/Python files.
   */
  scripts?: { [scriptName: string]: LocalScript | BastionScript | LocalScriptWithBastionTunneling };
  /**
   * #### Register custom functions that dynamically compute config values at deploy time.
   *
   * ---
   *
   * Define a directive by pointing to a JS/TS/Python file, then use it anywhere in the config
   * like a built-in directive (`$MyDirective()`). Useful for fetching external data,
   * computing dynamic values, or conditional logic.
   */
  directives?: DirectiveDefinition[];
  /**
   * #### Advanced deployment settings: rollback behavior, termination protection, artifact retention.
   *
   * ---
   *
   * Most projects don't need to change these. Useful for production stacks where you want
   * extra safety (termination protection, rollback alarms) or cost control (artifact cleanup).
   */
  deploymentConfig?: DeploymentConfig;
  /**
   * #### Stack-wide settings: custom outputs, tags, VPC configuration, and stack info saving.
   */
  stackConfig?: StackConfig;
  /**
   * #### Your app's infrastructure: APIs, databases, containers, functions, buckets, and more.
   *
   * ---
   *
   * Each entry is a named resource (e.g., `myApi`, `myDatabase`). Stacktape creates and manages
   * the underlying AWS resources for you. Use `stacktape stack-info --detailed` to inspect them.
   */
  resources: { [resourceName: string]: StacktapeResourceDefinition };
  /**
   * #### Escape hatch: add raw AWS CloudFormation resources alongside Stacktape-managed ones.
   *
   * ---
   *
   * For advanced use cases where Stacktape doesn't have a built-in resource type.
   * These are merged into the CloudFormation template as-is. Use `stacktape stack-info --detailed`
   * to check existing logical names and avoid conflicts.
   *
   * Does not count towards your resource limit.
   */
  cloudformationResources?: { [resourceName: string]: CloudformationResource };
}
```
