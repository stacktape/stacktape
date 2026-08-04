/**
 * Disposable real-AWS fixture that proves Stacktape's Node packaging end to end.
 *
 * Two Node Lambdas is the minimum that turns split bundling on, and both import `src/status-catalog.ts`, so a
 * successful deployment should produce a shared chunk large enough to be promoted into a Lambda layer. Each
 * function is reachable through its own function URL; see `README.md` for the exact commands and guardrails.
 *
 * Give each run a unique short project name, use stage `dev` and region `eu-west-1`, and delete it afterwards.
 */

import {
  $ResourceParam,
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from '@stacktape/config-authoring';

export default defineConfig(() => {
  const canaryOwner = process.env.STP_AWS_CANARY_OWNER ?? 'local';
  const canaryRevision = process.env.STP_AWS_CANARY_REVISION ?? 'base';
  const retryAdvisor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/retry-advisor.ts' }),
    url: { enabled: true, authMode: 'NONE' },
    environment: { CANARY_REVISION: canaryRevision },
    memory: 128,
    timeout: 10
  });

  const catalogReport = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/catalog-report.ts' }),
    url: { enabled: true, authMode: 'NONE' },
    environment: { CANARY_REVISION: canaryRevision },
    memory: 128,
    timeout: 10
  });

  return {
    resources: { retryAdvisor, catalogReport },
    stackConfig: {
      tags: [{ name: 'stacktape-canary-owner', value: canaryOwner }],
      outputs: [
        {
          name: 'retryAdvisorUrl',
          value: $ResourceParam('retryAdvisor', 'url'),
          description: 'Function URL of the single-status lookup. Append ?status=503.'
        },
        {
          name: 'catalogReportUrl',
          value: $ResourceParam('catalogReport', 'url'),
          description: 'Function URL of the whole-catalog aggregation.'
        }
      ]
    }
  };
});
