import type { ServiceLambdaResolver } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import type { StpServiceCustomResourceProperties } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import { SetQueueAttributesCommand, SQSClient } from '@aws-sdk/client-sqs';
import { errorName, withPermissionRetry } from './service-lambda-created-resources';

type SqsQueuePolicyProps = NonNullable<StpServiceCustomResourceProperties['sqsQueuePolicy']>;

const POLICY_ID_SUFFIX = '#policy';

const queueUrls = (props: SqsQueuePolicyProps | undefined) => ((props?.Queues ?? []) as unknown[]).map(String);

const policyText = (props: SqsQueuePolicyProps) =>
  typeof props.PolicyDocument === 'string' ? props.PolicyDocument : JSON.stringify(props.PolicyDocument);

const setPolicy = async (sqs: SQSClient, queueUrl: string, policy: string, ignoreMissingQueue: boolean) => {
  try {
    await withPermissionRetry(() =>
      sqs.send(new SetQueueAttributesCommand({ QueueUrl: queueUrl, Attributes: { Policy: policy } }))
    );
  } catch (error) {
    if (!(ignoreMissingQueue && /QueueDoesNotExist|NonExistentQueue/.test(errorName(error)))) throw error;
  }
};

/**
 * Sets and removes the access policy of SQS queues for the `Custom::StpSqsQueuePolicy` resource that replaces
 * `AWS::SQS::QueuePolicy` for policies new to a stack. CloudFormation's own handler waits about 30 s after every
 * create; SQS applies the policy at once.
 *
 * The physical ID stays the same for the resource's lifetime, so CloudFormation never deletes it to replace it: a delete
 * would remove the policy from queues the update has just set it on. Removing the resource, or a queue from it, removes
 * the policy from those queues, as CloudFormation does.
 */
export const sqsQueuePolicy: ServiceLambdaResolver<SqsQueuePolicyProps> = async (
  currentProps,
  previousProps,
  operation,
  physicalResourceId
) => {
  const sqs = new SQSClient({});
  if (operation === 'Delete') {
    if (physicalResourceId?.endsWith(POLICY_ID_SUFFIX)) {
      for (const queueUrl of queueUrls(currentProps)) await setPolicy(sqs, queueUrl, '', true);
    }
    return { data: {}, physicalResourceId };
  }
  const policy = policyText(currentProps);
  const queues = queueUrls(currentProps);
  for (const queueUrl of queues) await setPolicy(sqs, queueUrl, policy, false);
  if (operation === 'Update') {
    for (const queueUrl of queueUrls(previousProps).filter((url) => !queues.includes(url))) {
      await setPolicy(sqs, queueUrl, '', true);
    }
    return { data: {}, physicalResourceId: physicalResourceId as string };
  }
  return { data: {}, physicalResourceId: `${queues[0]}${POLICY_ID_SUFFIX}` };
};
