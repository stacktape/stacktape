/**
 * Disposable real-AWS fixture that proves Stacktape's Node packaging end to end.
 *
 * Two Node Lambdas is the minimum that turns split bundling on, and both import `src/status-catalog.ts`, so a
 * successful deployment should produce a shared chunk large enough to be promoted into a Lambda layer. Each
 * function is reachable through its own function URL; see `README.md` for the exact commands and guardrails.
 *
 * Deploy it as project `stacktape-v4-packaging-smoke`, stage `dev`, region `eu-west-1`, and delete it afterwards.
 */

import { $ResourceParam, defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from '../../src/api/npm/ts';

export default defineConfig(() => {
  const retryAdvisor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/retry-advisor.ts' }),
    url: { enabled: true, authMode: 'NONE' },
    memory: 128,
    timeout: 10
  });

  const catalogReport = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/catalog-report.ts' }),
    url: { enabled: true, authMode: 'NONE' },
    memory: 128,
    timeout: 10
  });

  return {
    resources: { retryAdvisor, catalogReport },
    stackConfig: {
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
