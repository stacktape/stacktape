import { getAtt } from '@stacktape/cloudformation/intrinsics';
import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import type { StpSqsQueue } from '@domain-services/config-manager/resolved-types/sqs-queues';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import type { ConfigManager } from '../index';
import { getPropsOfResourceReferencedInConfig } from './resource-lookup';
import type { SqsQueueEventBusIntegration, SqsQueuePolicyStatement } from '@stacktape/config/sqs-queues';
import { configErrors } from '../errors';

export const resolveReferenceToSqsQueue = ({
  activeConfig,
  referencedFrom,
  referencedFromType,
  stpResourceReference
}: {
  activeConfig: ConfigManager;
  referencedFrom: string;
  referencedFromType?: StpResourceType | 'alarm';
  stpResourceReference: string | undefined;
}) => {
  return getPropsOfResourceReferencedInConfig({
    activeConfig: activeConfig,
    stpResourceReference,
    stpResourceType: 'sqs-queue',
    referencedFrom,
    referencedFromType
  });
};

export const validateSqsQueueConfig = ({ resource }: { resource: StpSqsQueue }) => {
  if ((resource.contentBasedDeduplication || resource.fifoHighThroughput) && !resource.fifoEnabled) {
    throw configErrors.sqsFifoOptionRequiresFifo({ stpSqsQueueName: resource.name });
  }

  if (resource.redrivePolicy) {
    if (
      [resource.redrivePolicy.targetSqsQueueArn, resource.redrivePolicy.targetSqsQueueName].filter((element) => element)
        .length !== 1
    ) {
      throw configErrors.sqsRedriveTargetAmbiguous({
        sqsQueueReferencerStpName: resource.name
      });
    }
  }
};

/** The visibility timeout AWS gives a queue that sets none. */
const DEFAULT_VISIBILITY_TIMEOUT_SECONDS = 30;
/** The timeout a function gets when it sets none. */
const DEFAULT_LAMBDA_TIMEOUT_SECONDS = 10;

/**
 * AWS refuses an SQS trigger whose function may run longer than the queue's visibility timeout, but only when
 * CloudFormation creates the trigger, minutes into a deployment. Queues given by ARN are outside the config.
 */
export const validateSqsTriggerTimeouts = ({
  functions,
  sqsQueues
}: {
  functions: ReadonlyArray<StpLambdaFunction>;
  sqsQueues: ReadonlyArray<StpSqsQueue>;
}) => {
  for (const lambdaFunction of functions) {
    const timeout = lambdaFunction.timeout ?? DEFAULT_LAMBDA_TIMEOUT_SECONDS;
    for (const event of lambdaFunction.events ?? []) {
      if (event.type !== 'sqs' || !event.properties.sqsQueueName) continue;
      const queue = sqsQueues.find(({ name }) => name === event.properties.sqsQueueName);
      if (!queue) continue;
      const visibilityTimeout = queue.visibilityTimeoutSeconds ?? DEFAULT_VISIBILITY_TIMEOUT_SECONDS;
      if (timeout > visibilityTimeout) {
        throw configErrors.lambdaTimeoutExceedsQueueVisibilityTimeout({
          lambdaStpResourceName: lambdaFunction.name,
          sqsQueueName: queue.name,
          timeout,
          visibilityTimeout,
          visibilityTimeoutIsDefault: queue.visibilityTimeoutSeconds === undefined
        });
      }
    }
  }
};

/**
 * Queues that another queue of the stack names as its redrive target. A dead-letter queue keeps what failed elsewhere;
 * it needs no dead-letter queue of its own, which could only be satisfied by a cycle.
 */
export const getDeadLetterQueueNames = (queues: ReadonlyArray<StpSqsQueue>) =>
  new Set(queues.flatMap((queue) => queue.redrivePolicy?.targetSqsQueueName ?? []));

export const getAllQueuePolicyStatements = ({
  activeConfig,
  resource
}: {
  activeConfig: ConfigManager;
  resource: StpSqsQueue;
}) => {
  const result: (SqsQueuePolicyStatement & { Resource: any })[] = [
    ...(resource.policyStatements || []).map((statement) => ({
      ...statement,
      Resource: [getAtt(cfLogicalNames.sqsQueue(resource.name), 'Arn') as unknown as string]
    }))
  ];
  activeConfig.allLambdasTriggerableUsingEvents.forEach(({ events, name: lambdaStpName }) => {
    if (events) {
      events.forEach((event, index) => {
        if (
          event.type === 'event-bus' &&
          event.properties.onDeliveryFailure?.sqsQueueName === resource.nameChain.join('.')
        ) {
          result.push({
            Effect: 'Allow',
            Principal: {
              Service: 'events.amazonaws.com'
            },
            Action: ['sqs:SendMessage'],
            Resource: [getAtt(cfLogicalNames.sqsQueue(resource.name), 'Arn') as unknown as string],
            Condition: {
              ArnEquals: {
                'aws:SourceArn': getAtt(cfLogicalNames.eventBusRule(lambdaStpName, index), 'Arn')
              }
            }
          });
        }
        if (event.type === 'sns' && event.properties.onDeliveryFailure?.sqsQueueName === resource.nameChain.join('.')) {
          const { snsTopicArn, snsTopicName } = event.properties;
          result.push({
            Effect: 'Allow',
            Principal: {
              Service: 'sns.amazonaws.com'
            },
            Action: ['sqs:SendMessage'],
            Resource: [getAtt(cfLogicalNames.sqsQueue(resource.name), 'Arn') as unknown as string],
            Condition: {
              ArnEquals: {
                'aws:SourceArn': snsTopicArn || getAtt(cfLogicalNames.snsTopic(snsTopicName), 'TopicArn')
              }
            }
          });
        }
      });
    }
  });

  // Add permissions for SQS queue events
  if (resource.events) {
    resource.events.forEach((event: SqsQueueEventBusIntegration, index) => {
      if (event.type === 'event-bus') {
        result.push({
          Effect: 'Allow',
          Principal: {
            Service: 'events.amazonaws.com'
          },
          Action: ['sqs:SendMessage'],
          Resource: [getAtt(cfLogicalNames.sqsQueue(resource.name), 'Arn') as unknown as string],
          Condition: {
            ArnEquals: {
              'aws:SourceArn': getAtt(cfLogicalNames.eventBusRule(resource.name, index), 'Arn')
            }
          }
        });
      }
    });
  }

  return result;
};
