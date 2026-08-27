# Tracing

Tracing records the path of a request through your application: every operation it triggered — handler execution, SQL queries, HTTP calls to other services — how long each took, and where it failed. Stacktape instruments your functions with [OpenTelemetry](https://opentelemetry.io/) automatically; you enable it with one config property and deploy. Traces are stored in your own AWS account using X-Ray Transaction Search and explored on the Console's **Traces** page.

## When to use

Turn tracing on when you need to answer "why was this request slow?" or "where did this request fail?" — questions logs alone answer poorly because the evidence is scattered across services. Sampling makes it affordable to keep on permanently in production.

## When NOT to use

- **Counting and alerting on failures** — use [alarms](/observability/alarms) on error-rate metrics; traces explain individual requests, they don't aggregate.
- **Reading application output** — use [logs](/observability/logs). Spans record timing and structure, not your log lines.

## Configuration

Enable tracing stack-wide in `stackConfig`:

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

Every `function` resource in the stack is instrumented (server functions nested inside web-framework resources like `nextjs-web` are not instrumented yet). Individual functions can override the stack default with their own `tracing` property:

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
      # this function records every request regardless of the stack-wide sampling
      tracing:
        samplingRate: 1
  housekeeping:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/housekeeping.ts
      # opt this function out entirely
      tracing: false
```

`tracing` on a function accepts `false` (opt out), `true` (opt in with stack-wide sampling), or an object with its own `enabled` and `samplingRate`. A function without the property inherits the stack default.

### Sampling

`samplingRate` is the fraction of requests to trace, between 0 and 1 (default 1 — every request). Keep it at 1 while traffic is small; lower it as traffic grows to control span-storage cost. Sampling is parent-based: once a request is sampled, every service it touches records its part, so distributed traces stay complete.

## What gets instrumented

Stacktape attaches the AWS-managed OpenTelemetry Lambda layer and activates it through environment variables — no code changes and no agents to run. Instrumentation for AWS SDK and HTTP calls is on by default.

Supported runtimes: Node.js 18–24, Python 3.10–3.13, Java 11/17/21, and .NET 8. A traced function on any other runtime is skipped with a deploy-time warning instead of failing the deployment. A function is also skipped when it already uses a conflicting `AWS_LAMBDA_EXEC_WRAPPER` or a manually attached OpenTelemetry layer.

The layer cannot instrument ESM bundles (it initializes but produces no spans), so traced Node.js functions are bundled as CommonJS — including on Node.js 24, where ESM is otherwise the default output. A function that explicitly sets `outputModuleFormat: esm` keeps its ESM output and is skipped from tracing, with a warning.

### Container services

For a traced [web service](/resources/compute/web-service), private service, worker service, or multi-container workload, Stacktape adds an OpenTelemetry collector as an extra container in the task and points every container's OpenTelemetry SDK at it (`http://localhost:4318`) through standard `OTEL_*` environment variables. The application needs the OpenTelemetry SDK — any language works, and spans the SDK emits reach the collector without further configuration. Automatic zero-code instrumentation for containers is planned.

The collector is non-essential, hard-capped at 256 MB of the task's memory, and given a low CPU weight (128 shares): if it fails or exceeds its memory limit, it is killed and the application keeps running with tracing degraded. Small tasks (512 MB) get noticeably tighter with tracing enabled — consider one memory size up. EC2-based workloads (with `instanceTypes`) are not supported — their bridge networking cannot reach a sidecar on localhost — and are skipped with a warning.

### Environment variables

Stacktape manages `OTEL_TRACES_SAMPLER`, `OTEL_TRACES_SAMPLER_ARG`, and the `stacktape.*` keys of `OTEL_RESOURCE_ATTRIBUTES` — values you set for these are overridden (with a warning), because the Console relies on them to attribute traces to projects and stages. Other OpenTelemetry variables are yours to override per function: `OTEL_SERVICE_NAME` renames the service shown in trace views, and any `OTEL_*` variable you set wins over the Stacktape default.

## Account-level effects

The first deploy with tracing enabled switches on **X-Ray Transaction Search** for the whole AWS account and region. This is an account-level AWS setting, not a per-stack one:

- Spans from **all** X-Ray-instrumented workloads in the account — Stacktape-managed or not — are then stored in the `aws/spans` CloudWatch Logs log group.
- When Stacktape performs this switch, it caps the `aws/spans` log group's retention at 90 days once X-Ray creates the group — but only when no retention was set before. An already-enabled Transaction Search setup is left exactly as found.
- Deleting the stack does **not** switch Transaction Search back off, because other workloads may rely on it.

Span storage is priced by AWS at roughly $0.35 per GB ingested (plus CloudWatch Logs storage), and searching traces runs CloudWatch Logs Insights queries, which AWS bills by data scanned. With sampling and typical span sizes this is small; watch it on high-traffic stacks with `samplingRate: 1`.

## Viewing traces

The Console's **Traces** page searches recent traces per AWS account and region: filter by operation or service name, errors only, and time window. Opening a trace shows the waterfall — every span with per-service colors and timing — and each span's full attributes.

Because the `aws/spans` log group mixes spans from every project in the account, the Traces page requires an organization membership that is not limited to specific projects.

## Limits

- Tracing is skipped in [dev mode](/local-development/dev-mode-overview).
- AWS Lambda allows at most 5 layers per function; the tracing layer counts toward that limit.
- Very recent traces can take a minute or two to appear after the request runs.
