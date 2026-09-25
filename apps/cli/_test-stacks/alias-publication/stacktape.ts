/**
 * Disposable real-AWS fixture for `scripts/real-aws/alias-publication-canary.ts`: one Node.js function behind a
 * CodeDeploy alias (`deployment`, all at once, no provisioned concurrency) whose only changing input is one environment
 * value. The canary deploys it, changes that value alone, redeploys it unchanged and deletes it, so it can show that a
 * configuration-only change publishes a version and moves the alias, and that an unchanged redeploy publishes nothing.
 *
 * The canary sets both environment variables below; the defaults only keep the file loadable on its own.
 */
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from '@stacktape/config-authoring';

export default defineConfig(() => {
  const canaryOwner = process.env.STP_AWS_ALIAS_CANARY_OWNER ?? 'local';
  const canaryValue = process.env.STP_AWS_ALIAS_CANARY_VALUE ?? 'base';
  const greeter = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/greeter.ts' }),
    environment: { CANARY_VALUE: canaryValue },
    deployment: { strategy: 'AllAtOnce' },
    memory: 128,
    timeout: 10
  });

  return {
    resources: { greeter },
    stackConfig: { tags: [{ name: 'stacktape-canary-owner', value: canaryOwner }] }
  };
});
