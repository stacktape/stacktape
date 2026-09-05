/**
 * Disposable real-AWS fixture that proves the observability suite end to end:
 *
 * - `api` — a Lambda on the default runtime with tracing enabled; verifies the AWS-managed OTel
 *   layer works on the default runtime and that its spans land in `aws/spans`.
 * - `web` — a container service with tracing enabled whose app runs its own OpenTelemetry SDK;
 *   verifies the collector sidecar path (OTLP on localhost:4318 → X-Ray → `aws/spans`).
 * - `homeUptime` — an uptime check probing a stable public endpoint from the default three regions;
 *   verifies prober provisioning and Console ingestion.
 * - `homeFlow` (browser) and `homeApi` (api) — synthetic tests; verify canary bundling, first runs,
 *   artifacts and the SuccessPercent alarm + notification rule.
 *
 * Give each run a unique short project name, use stage `dev` and region `eu-west-1`, and delete it
 * afterwards. See `README.md` for the exact commands.
 */

import {
  defineConfig,
  LambdaFunction,
  StacktapeImageBuildpackPackaging,
  StacktapeLambdaBuildpackPackaging,
  SyntheticTest,
  UptimeCheck,
  WebService,
  $ResourceParam
} from '@stacktape/config-authoring';

export default defineConfig(() => {
  const canaryOwner = process.env.STP_AWS_CANARY_OWNER ?? 'local';
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/api.ts' }),
    url: { enabled: true, authMode: 'NONE' },
    memory: 256,
    timeout: 15
  });

  const web = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/web.ts' }),
    resources: { cpu: 0.25, memory: 1024 },
    scaling: { minInstances: 1, maxInstances: 1 }
  });

  const homeUptime = new UptimeCheck({
    // The stack's own service keeps every unique canary self-contained and makes cleanup exact.
    url: $ResourceParam('web', 'url'),
    assertions: [{ type: 'status-code', properties: { accepted: [200] } }]
  });

  const homeFlow = new SyntheticTest({
    test: { type: 'browser', properties: { scriptPath: './src/home-flow.canary.ts' } },
    scheduleRate: 'rate(5 minutes)',
    environment: [{ name: 'TARGET_URL', value: $ResourceParam('web', 'url') }],
    notificationChannels: [{ type: 'webhook', properties: { url: 'https://example.com/observability-smoke-hook' } }]
  });

  const homeApi = new SyntheticTest({
    test: { type: 'api', properties: { scriptPath: './src/home-api.canary.ts' } },
    scheduleRate: 'rate(5 minutes)',
    environment: [{ name: 'TARGET_URL', value: $ResourceParam('api', 'url') }]
  });

  return {
    resources: { api, web, homeUptime, homeFlow, homeApi },
    stackConfig: {
      tracing: { enabled: true, samplingRate: 1 },
      tags: [
        { name: 'suite', value: 'observability-smoke' },
        { name: 'stacktape-canary-owner', value: canaryOwner }
      ]
    }
  };
});
