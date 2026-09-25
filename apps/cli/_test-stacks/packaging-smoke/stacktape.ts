/**
 * Disposable real-AWS fixture that proves Stacktape's Node packaging end to end.
 *
 * Two Node Lambdas is the minimum that turns split bundling on, and `retryAdvisor` and `catalogReport` both
 * import `src/status-catalog.ts`, so a successful deployment should produce a shared chunk large enough to be
 * promoted into a Lambda layer.
 *
 * `catalogNote` is the third function on purpose. Its `includeFiles` is something the split path does not
 * implement, so it takes the ordinary per-Lambda buildpack while its two siblings share a build. One deployment
 * therefore exercises both packaging paths at once and shows that an incompatible function costs only itself:
 * before, it would have pushed every function back onto the per-Lambda path.
 *
 * Each function is reachable through its own function URL; see `README.md` for the exact commands and guardrails.
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

  const catalogNote = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/catalog-note.ts',
      // Not implemented by the split path, so this function alone falls back to the per-Lambda buildpack.
      includeFiles: ['./src/notice.txt']
    }),
    url: { enabled: true, authMode: 'NONE' },
    environment: { CANARY_REVISION: canaryRevision },
    memory: 128,
    timeout: 10
  });

  return {
    resources: { retryAdvisor, catalogReport, catalogNote },
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
        },
        {
          name: 'catalogNoteUrl',
          value: $ResourceParam('catalogNote', 'url'),
          description: 'Function URL of the individually packaged function. Its notice proves includeFiles ran.'
        }
      ]
    }
  };
});
