import type { ServiceLambdaResolver } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import type { StpServiceCustomResourceProperties } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import {
  CreateQueueCommand,
  DeleteQueueCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
  ListQueueTagsCommand,
  SetQueueAttributesCommand,
  SQSClient,
  TagQueueCommand,
  UntagQueueCommand
} from '@aws-sdk/client-sqs';
import { SQS_QUEUE_ATTRIBUTE_PROPERTIES as ATTRIBUTE_PROPERTIES } from '../created-resource-properties';
import { errorName, sleep, withPermissionRetry, withPhysicalResourceId } from './service-lambda-created-resources';

type SqsQueueProps = NonNullable<StpServiceCustomResourceProperties['sqsQueue']>;

export const sqsQueueSettings = {
  /** SQS refuses a name for 60 s after a queue with that name was deleted. CloudFormation waits it out as well. */
  recentlyDeletedRetryMs: 90_000,
  retryIntervalMs: 2000
};

/**
 * What a removed property is set back to: the value SQS gives a queue created without it (checked on a new queue in
 * eu-west-1, Oct 2026). Encryption is handled in `getAttributeUpdate`: a queue has only one encryption mode.
 */
const ATTRIBUTE_DEFAULTS: Record<string, string> = {
  DelaySeconds: '0',
  MaximumMessageSize: '1048576',
  MessageRetentionPeriod: '345600',
  ReceiveMessageWaitTimeSeconds: '0',
  VisibilityTimeout: '30',
  RedrivePolicy: '',
  RedriveAllowPolicy: '{"redrivePermission":"allowAll"}',
  KmsDataKeyReusePeriodSeconds: '300',
  SqsManagedSseEnabled: 'true',
  ContentBasedDeduplication: 'false',
  DeduplicationScope: 'queue',
  FifoThroughputLimit: 'perQueue'
};

const isTrue = (value: unknown) => value === true || value === 'true';

const toAttributeValue = (value: unknown) =>
  value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value);

/**
 * The queue attributes the properties ask for. `FifoQueue` and the FIFO-only attributes are left out of a standard
 * queue: SQS rejects them there, while CloudFormation accepts `false`.
 */
export const getQueueAttributes = (props: SqsQueueProps): Record<string, string> => {
  const fifo = isTrue(props.FifoQueue);
  const attributes: Record<string, string> = {};
  for (const property of ATTRIBUTE_PROPERTIES) {
    const value = props[property];
    if (value === undefined || value === null || value === '') continue;
    if (
      !fifo &&
      ['FifoQueue', 'ContentBasedDeduplication', 'DeduplicationScope', 'FifoThroughputLimit'].includes(property)
    )
      continue;
    attributes[property] = toAttributeValue(value);
  }
  return attributes;
};

/** The attribute changes that turn a queue created with `previous` into one created with `current`. */
export const getAttributeUpdate = (current: SqsQueueProps, previous: SqsQueueProps): Record<string, string> => {
  const wanted = getQueueAttributes(current);
  const had = getQueueAttributes(previous);
  const update: Record<string, string> = {};
  for (const [name, value] of Object.entries(wanted)) {
    if (had[name] !== value) update[name] = value;
  }
  for (const name of Object.keys(had)) {
    if (name in wanted || name === 'FifoQueue') continue;
    // A queue has one encryption mode: SSE-KMS (`KmsMasterKeyId`), SSE-SQS (`SqsManagedSseEnabled`) or none. A removed
    // setting gives way to the one the properties ask for; with neither asked for, SQS's default (SSE-SQS) applies.
    if (name === 'KmsMasterKeyId') {
      if (wanted.SqsManagedSseEnabled === 'false') update.KmsMasterKeyId = '';
      else update.SqsManagedSseEnabled ??= 'true';
      continue;
    }
    if (name === 'SqsManagedSseEnabled' && wanted.KmsMasterKeyId) continue;
    update[name] = ATTRIBUTE_DEFAULTS[name];
  }
  return update;
};

const getTags = (props: SqsQueueProps): Record<string, string> =>
  Object.fromEntries(
    ((props.Tags as { Key: string; Value: string }[] | undefined) ?? []).map(({ Key, Value }) => [Key, String(Value)])
  );

const queueArn = async (sqs: SQSClient, queueUrl: string) => {
  const { Attributes } = await sqs.send(
    new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ['QueueArn'] })
  );
  return Attributes?.QueueArn as string;
};

const result = async (sqs: SQSClient, queueUrl: string, queueName: string) => ({
  data: { Arn: await queueArn(sqs, queueUrl), QueueName: queueName, QueueUrl: queueUrl },
  physicalResourceId: queueUrl
});

const isMissingQueue = (error: unknown) => /QueueDoesNotExist|NonExistentQueue/.test(errorName(error));

const findQueueUrl = async (sqs: SQSClient, queueName: string) => {
  try {
    const { QueueUrl } = await withPermissionRetry(() => sqs.send(new GetQueueUrlCommand({ QueueName: queueName })));
    return QueueUrl;
  } catch (error) {
    if (isMissingQueue(error)) return undefined;
    throw error;
  }
};

const createQueue = async (sqs: SQSClient, props: SqsQueueProps) => {
  const queueName = String(props.QueueName);
  // `CreateQueue` returns an existing queue with the same attributes instead of failing. A custom resource must not
  // take over a queue it did not create, so an existing name fails the create, as with `AWS::SQS::Queue`.
  if (await findQueueUrl(sqs, queueName)) {
    throw new Error(`SQS queue ${queueName} already exists.`);
  }
  const start = Date.now();
  for (;;) {
    try {
      const { QueueUrl } = await withPermissionRetry(() =>
        sqs.send(
          new CreateQueueCommand({ QueueName: queueName, Attributes: getQueueAttributes(props), tags: getTags(props) })
        )
      );
      return QueueUrl as string;
    } catch (error) {
      if (
        !/QueueDeletedRecently/.test(errorName(error)) ||
        Date.now() - start > sqsQueueSettings.recentlyDeletedRetryMs
      ) {
        throw error;
      }
      console.info(`[sqs-queue] ${queueName} was deleted less than 60 s ago; retrying`);
      await sleep(sqsQueueSettings.retryIntervalMs);
    }
  }
};

const deleteQueue = async (sqs: SQSClient, queueUrl: string) => {
  try {
    await withPermissionRetry(() => sqs.send(new DeleteQueueCommand({ QueueUrl: queueUrl })));
  } catch (error) {
    if (!isMissingQueue(error)) throw error;
  }
};

const updateTags = async (sqs: SQSClient, queueUrl: string, props: SqsQueueProps) => {
  const wanted = getTags(props);
  const { Tags: current = {} } = await sqs.send(new ListQueueTagsCommand({ QueueUrl: queueUrl }));
  const removed = Object.keys(current).filter((key) => !(key in wanted));
  if (removed.length) await sqs.send(new UntagQueueCommand({ QueueUrl: queueUrl, TagKeys: removed }));
  const changed = Object.fromEntries(Object.entries(wanted).filter(([key, value]) => current[key] !== value));
  if (Object.keys(changed).length) await sqs.send(new TagQueueCommand({ QueueUrl: queueUrl, Tags: changed }));
};

/**
 * Creates, updates and deletes an SQS queue for the `Custom::StpSqsQueue` resource that replaces `AWS::SQS::Queue`
 * for queues new to a stack. CloudFormation's own handler waits about 60 s after every create; this one returns once
 * SQS has created the queue. Stacks keep queues already deployed as `AWS::SQS::Queue` in that form.
 *
 * The physical ID is the queue URL, which is what `Ref` of `AWS::SQS::Queue` returns, and the attributes are the same
 * (`Arn`, `QueueName`, `QueueUrl`). Delete acts only on a queue this resource created (a URL physical ID). A change of
 * the name or of `FifoQueue` would replace the queue and delete its messages; it fails instead, so the data protection
 * that CloudFormation replacements get is never skipped.
 */
export const sqsQueue: ServiceLambdaResolver<SqsQueueProps> = async (
  currentProps,
  previousProps,
  operation,
  physicalResourceId
) => {
  const sqs = new SQSClient({});
  const queueName = String(currentProps.QueueName);
  if (operation === 'Delete') {
    if (/^https?:\/\//.test(physicalResourceId ?? '')) {
      await deleteQueue(sqs, physicalResourceId as string);
    }
    return { data: {}, physicalResourceId };
  }
  if (operation === 'Create') {
    const queueUrl = await createQueue(sqs, currentProps);
    try {
      return await result(sqs, queueUrl, queueName);
    } catch (error) {
      await deleteQueue(sqs, queueUrl).catch((cleanupError) => console.error(cleanupError));
      throw withPhysicalResourceId(error, queueUrl);
    }
  }
  const previous = previousProps ?? {};
  if (String(previous.QueueName) !== queueName || isTrue(previous.FifoQueue) !== isTrue(currentProps.FifoQueue)) {
    throw new Error(
      `Changing the name or the FIFO setting of SQS queue ${String(previous.QueueName)} would replace it and delete its messages. Give the queue resource a new name to create a new queue instead.`
    );
  }
  const queueUrl = physicalResourceId as string;
  const update = getAttributeUpdate(currentProps, previous);
  if (Object.keys(update).length) {
    await withPermissionRetry(() =>
      sqs.send(new SetQueueAttributesCommand({ QueueUrl: queueUrl, Attributes: update }))
    );
  }
  await updateTags(sqs, queueUrl, currentProps);
  return result(sqs, queueUrl, queueName);
};
