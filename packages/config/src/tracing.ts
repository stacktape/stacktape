export interface TracingOptions {
  /**
   * #### Turn distributed tracing on or off.
   *
   * ---
   *
   * When enabled, Stacktape instruments supported resources with OpenTelemetry automatically: every
   * request produces a trace — a timeline of the work it caused (handler execution, SQL queries,
   * HTTP calls to other services) — viewable in the Console. Traces are stored in your AWS account
   * using X-Ray Transaction Search, priced at ~$0.35 per GB of span data.
   *
   * Enabling tracing in any stack turns on X-Ray Transaction Search for the **whole AWS account and
   * region**: spans from all X-Ray-instrumented workloads (Stacktape-managed or not) are then stored
   * in the `aws/spans` CloudWatch Logs log group. When Stacktape itself performs this switch, it caps
   * the log group's retention at 90 days (only when no retention was set before); an already-enabled
   * setup is left exactly as found. Deleting
   * the stack does not switch Transaction Search back off, because other workloads may rely on it.
   *
   * Lambda functions are instrumented with the AWS-managed OpenTelemetry layer. Supported runtimes:
   * Node.js 18–24, Python 3.10–3.13, Java 11/17/21 and .NET 8; functions on other runtimes are
   * skipped with a warning. Traced Node.js functions are bundled as CommonJS (the layer cannot
   * instrument ESM output); a function that explicitly sets `outputModuleFormat: esm` keeps ESM and
   * skips tracing instead. Container services run an OpenTelemetry collector sidecar (256 MB hard
   * memory cap and a low CPU weight within the task's allocation); the application itself needs the
   * OpenTelemetry SDK — spans it emits reach the collector without further configuration. The
   * `OTEL_TRACES_SAMPLER`, `OTEL_TRACES_SAMPLER_ARG` and the `stacktape.*` keys of
   * `OTEL_RESOURCE_ATTRIBUTES` environment variables are managed by Stacktape; other OpenTelemetry
   * variables (like `OTEL_SERVICE_NAME`) can be overridden per resource.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * stackConfig:
   *   tracing:
   *     # stp-focus
   *     enabled: true
   *     # stp-end-focus
   * resources:
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } }
   *   });
   *   return {
   *     // stp-focus
   *     stackConfig: { tracing: { enabled: true } },
   *     // stp-end-focus
   *     resources: { api }
   *   };
   * });
   * ```
   */
  enabled?: boolean;
  /**
   * #### Fraction of requests to trace, between 0 and 1.
   *
   * ---
   *
   * `1` records every request — ideal while traffic is small, because the interesting request is
   * always captured. Lower it as traffic grows to control span-storage cost (~$0.35/GB). Sampling
   * is parent-based: once a request is sampled, every service it touches records its part of the
   * trace, so distributed traces stay complete.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * stackConfig:
   *   tracing:
   *     enabled: true
   *     # stp-focus
   *     samplingRate: 0.2
   *     # stp-end-focus
   * resources:
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } }
   *   });
   *   return {
   *     // stp-focus
   *     stackConfig: { tracing: { enabled: true, samplingRate: 0.2 } },
   *     // stp-end-focus
   *     resources: { api }
   *   };
   * });
   * ```
   *
   * @default 1
   */
  samplingRate?: number;
}

/**
 * #### Per-resource tracing override.
 *
 * ---
 *
 * `undefined` inherits the stack-wide `stackConfig.tracing` setting; `false` opts this resource out;
 * `true` opts it in with the stack-wide sampling; an object opts it in with its own settings.
 */
export type ResourceTracingConfig = boolean | TracingOptions;
