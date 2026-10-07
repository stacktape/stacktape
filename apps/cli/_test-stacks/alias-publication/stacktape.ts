/**
 * Disposable real-AWS fixture for `scripts/real-aws/alias-publication-canary.ts`: one Node.js function behind a
 * CodeDeploy alias (`deployment`, all at once, no provisioned concurrency) whose only changing input is one environment
 * value. The canary deploys it, changes that value alone, redeploys it unchanged and deletes it, so it can show that a
 * configuration-only change publishes a version and moves the alias, and that an unchanged redeploy publishes nothing.
 *
 * The canary sets both environment variables below; the defaults only keep the file loadable on its own.
 */
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from '@stacktape/config-authoring';

export default defineConfig(() => {
  const canaryOwner = process.env.STP_AWS_ALIAS_CANARY_OWNER ?? 'local';
  const canaryValue = process.env.STP_AWS_ALIAS_CANARY_VALUE ?? 'base';
  // With STP_AWS_ALIAS_CANARY_BREAK=1 the canary adds a queue CloudFormation accepts at validation and rejects when it
  // creates it (the visibility timeout exceeds the service maximum), so the update fails and CloudFormation rolls it
  // back. The canary then checks that the previous version is still what the alias serves.
  const breakUpdate = process.env.STP_AWS_ALIAS_CANARY_BREAK === '1';
  const greeter = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/greeter.ts' }),
    environment: { CANARY_VALUE: canaryValue },
    deployment: { strategy: 'AllAtOnce' },
    memory: 128,
    timeout: 10
  });

  return {
    resources: { greeter },
    stackConfig: { tags: [{ name: 'stacktape-canary-owner', value: canaryOwner }] },
    ...(breakUpdate
      ? {
          cloudformationResources: {
            canaryBrokenQueue: { Type: 'AWS::SQS::Queue', Properties: { VisibilityTimeout: 999999 } }
          }
        }
      : {})
  };
});
