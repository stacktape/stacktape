/**
 * Disposable real-AWS fixture for `scripts/real-aws/batch-job-canary.ts`: a batch job that runs for each message of an
 * SQS queue, as in the r2gg dogfood, where AWS Batch refused Stacktape's Amazon Linux 2 compute environments. The job
 * is a js-bundle image that the deploy builds and pushes to the stack's private ECR repository, so the instance must
 * pull it with the job's execution role. It prints the message and the size of its root file system, which the launch
 * template sets to 100 GB.
 *
 * With STP_AWS_BATCH_CANARY_BREAK=1 the config adds a queue whose `DelaySeconds` is a fraction. CloudFormation's
 * pre-deployment validation rejects it, and the CLI must name the resource, the property and the reason.
 *
 * The canary sets the owner variable below; the default only keeps the file loadable on its own.
 */
import { defineConfig } from '@stacktape/config-authoring';

export default defineConfig(() => {
  const canaryOwner = process.env.STP_AWS_BATCH_CANARY_OWNER ?? 'local';
  const breakUpdate = process.env.STP_AWS_BATCH_CANARY_BREAK === '1';

  return {
    resources: {
      jobs: { type: 'sqs-queue' },
      report: {
        type: 'batch-job',
        properties: {
          container: {
            packaging: { type: 'js-bundle', properties: { entryfilePath: './src/job.ts' } }
          },
          resources: { cpu: 1, memory: 512 },
          timeout: 600,
          events: [{ type: 'sqs', properties: { sqsQueueName: 'jobs', batchSize: 1 } }]
        }
      }
    },
    stackConfig: { tags: [{ name: 'stacktape-canary-owner', value: canaryOwner }] },
    ...(breakUpdate
      ? {
          cloudformationResources: {
            CanaryInvalidQueue: { Type: 'AWS::SQS::Queue', Properties: { DelaySeconds: 1.5 } }
          }
        }
      : {})
  };
});
