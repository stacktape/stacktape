import {
  CloudFormationClient,
  CreateStackCommand,
  DescribeStacksCommand,
  UpdateStackCommand,
  waitUntilStackCreateComplete,
  waitUntilStackUpdateComplete
} from '@aws-sdk/client-cloudformation';
import { assertLocalAwsEndpoint, MINISTACK_DEFAULT_ACCOUNT_ID } from '@stacktape/ministack/fixture';
import { outputNames } from '@stacktape/naming/stack-output-names';

/** Seed the stack/version that both artifact-deployment workers consume through the real CloudFormation capability. */
export const seedArtifactStack = async ({
  endpoint,
  stackName,
  bucketName,
  lastVersion
}: {
  endpoint: string;
  stackName: string;
  bucketName: string;
  lastVersion: string;
}) => {
  const client = new CloudFormationClient({
    endpoint: assertLocalAwsEndpoint(endpoint),
    region: 'eu-west-1',
    maxAttempts: 1,
    credentials: { accessKeyId: MINISTACK_DEFAULT_ACCOUNT_ID, secretAccessKey: 'test' }
  });
  try {
    const TemplateBody = JSON.stringify({
      Resources: { StpDeploymentBucket: { Type: 'AWS::S3::Bucket', Properties: { BucketName: bucketName } } },
      Outputs: { [outputNames.deploymentVersion()]: { Value: lastVersion } }
    });
    const existing = await client.send(new DescribeStacksCommand({ StackName: stackName })).catch((error) => {
      if (error.name === 'ValidationError' && /does not exist/i.test(error.message)) return undefined;
      throw error;
    });
    const waiter = { client, maxWaitTime: 30, minDelay: 1, maxDelay: 1 };
    if (existing) {
      if (
        existing.Stacks?.[0]?.Outputs?.some(
          ({ OutputKey, OutputValue }) => OutputKey === outputNames.deploymentVersion() && OutputValue === lastVersion
        )
      ) {
        return;
      }
      await client.send(new UpdateStackCommand({ StackName: stackName, TemplateBody }));
      await waitUntilStackUpdateComplete(waiter, { StackName: stackName });
    } else {
      await client.send(new CreateStackCommand({ StackName: stackName, TemplateBody }));
      await waitUntilStackCreateComplete(waiter, { StackName: stackName });
    }
  } finally {
    client.destroy();
  }
};
