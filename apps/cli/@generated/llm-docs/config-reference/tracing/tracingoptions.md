# TracingOptions API Reference

## TypeScript definition

```typescript
type TracingOptions = {
  /** Turn distributed tracing on or off. */
  enabled?: boolean;
  /** Fraction of requests to trace, between 0 and 1. */
  samplingRate?: number;
};
```

## Property: `enabled`

- Required: no
- Type: `boolean`

Turn distributed tracing on or off.

When enabled, Stacktape instruments supported resources with OpenTelemetry automatically: every
request produces a trace — a timeline of the work it caused (handler execution, SQL queries,
HTTP calls to other services) — viewable in the Console. Traces are stored in your AWS account
using X-Ray Transaction Search, priced at ~$0.35 per GB of span data.

Enabling tracing in any stack turns on X-Ray Transaction Search for the **whole AWS account and
region**: spans from all X-Ray-instrumented workloads (Stacktape-managed or not) are then stored
in the `aws/spans` CloudWatch Logs log group. When Stacktape itself performs this switch, it caps
the log group's retention at 90 days (only when no retention was set before); an already-enabled
setup is left exactly as found. Deleting
the stack does not switch Transaction Search back off, because other workloads may rely on it.

Node.js functions get a slim OpenTelemetry runtime bundled directly into their code (ESM and
CJS alike; HTTP and `fetch` calls are instrumented automatically). Python 3.10–3.13,
Java 11/17/21 and .NET 8 functions are instrumented with the AWS-managed OpenTelemetry layer;
functions on other runtimes are
skipped with a warning. Container services run an OpenTelemetry collector sidecar (256 MB hard
memory cap and a low CPU weight within the task's allocation); the application itself needs the
OpenTelemetry SDK — spans it emits reach the collector without further configuration. The
`OTEL_TRACES_SAMPLER`, `OTEL_TRACES_SAMPLER_ARG` and the `stacktape.*` keys of
`OTEL_RESOURCE_ATTRIBUTES` environment variables are managed by Stacktape; other OpenTelemetry
variables (like `OTEL_SERVICE_NAME`) can be overridden per resource.

### Example 1 (yaml)

```yaml
stackConfig:
  tracing:
    enabled: true
resources:
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } }
  });
  return {
    stackConfig: { tracing: { enabled: true } },
    resources: { api }
  };
});
```

## Property: `samplingRate`

- Required: no
- Type: `number`
- Default: `1`

Fraction of requests to trace, between 0 and 1.

`1` records every request — ideal while traffic is small, because the interesting request is
always captured. Lower it as traffic grows to control span-storage cost (~$0.35/GB). Sampling
is parent-based: once a request is sampled, every service it touches records its part of the
trace, so distributed traces stay complete.

### Example 1 (yaml)

```yaml
stackConfig:
  tracing:
    enabled: true
    samplingRate: 0.2
resources:
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } }
  });
  return {
    stackConfig: { tracing: { enabled: true, samplingRate: 0.2 } },
    resources: { api }
  };
});
```
