import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import type { StpSqsQueue } from '@domain-services/config-manager/resolved-types/sqs-queues';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import {
  getAllQueuePolicyStatements,
  resolveReferenceToSqsQueue
} from '@domain-services/config-manager/utils/sqs-queues';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { consoleLinks } from '@stacktape/naming/console-links';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { resolveAlarmsForResource } from '../_utils/alarms';
import { resolveSqsQueueEventBusEvents } from './events/event-bus';

export const resolveSqsQueues = async () => {
  configManager.sqsQueues.forEach((resource) => {
    resolveSqsQueue({ resource });
  });
};

export const resolveSqsQueue = ({ resource }: { resource: StpSqsQueue }) => {
  if (resource.redrivePolicy?.targetSqsQueueName) {
    resolveReferenceToSqsQueue({
      referencedFrom: resource.name,
      stpResourceReference: resource.redrivePolicy?.targetSqsQueueName,
      referencedFromType: 'sqs-queue'
    });
  }

  resolveAlarmsForResource({ resource });

  resolveSqsQueueEventBusEvents({ sqsQueue: resource });

  calculatedStackOverviewManager.addCfChildResource({
    nameChain: resource.nameChain,
    cfLogicalName: cfLogicalNames.sqsQueue(resource.name),
    resource: cfnResource('AWS::SQS::Queue', {
      ContentBasedDeduplication: resource.contentBasedDeduplication,
      DelaySeconds: resource.delayMessagesSecond,
      MessageRetentionPeriod: resource.messageRetentionPeriodSeconds,
      MaximumMessageSize: resource.maxMessageSizeBytes,
      VisibilityTimeout: resource.visibilityTimeoutSeconds,
      FifoQueue: resource.fifoEnabled,
      ReceiveMessageWaitTimeSeconds: resource.longPollingSeconds,
      QueueName: awsResourceNames.sqsQueue(
        resource.name,
        calculatedStackOverviewManager.context.stackName,
        resource.fifoEnabled
      ),
      RedrivePolicy: resource.redrivePolicy
        ? {
            deadLetterTargetArn:
              resource.redrivePolicy.targetSqsQueueArn ||
              getAtt(cfLogicalNames.sqsQueue(resource.redrivePolicy.targetSqsQueueName), 'Arn'),
            maxReceiveCount: resource.redrivePolicy.maxReceiveCount
          }
        : undefined,
      DeduplicationScope: resource.fifoEnabled ? (resource.fifoHighThroughput ? 'messageGroup' : 'queue') : undefined,
      FifoThroughputLimit: resource.fifoEnabled
        ? resource.fifoHighThroughput
          ? 'perMessageGroupId'
          : 'perQueue'
        : undefined,
      Tags: stackManager.getTags()
    })
  });

  calculatedStackOverviewManager.addStacktapeResourceLink({
    nameChain: resource.nameChain,
    linkName: 'console',
    linkValue: consoleLinks.sqsQueue(
      calculatedStackOverviewManager.context.region,
      calculatedStackOverviewManager.context.accountId,
      awsResourceNames.sqsQueue(resource.name, calculatedStackOverviewManager.context.stackName, resource.fifoEnabled)
    )
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    paramName: 'arn',
    nameChain: resource.nameChain,
    paramValue: getAtt(cfLogicalNames.sqsQueue(resource.name), 'Arn')
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    paramName: 'url',
    nameChain: resource.nameChain,
    paramValue: ref(cfLogicalNames.sqsQueue(resource.name))
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    paramName: 'name',
    nameChain: resource.nameChain,
    paramValue: getAtt(cfLogicalNames.sqsQueue(resource.name), 'QueueName')
  });

  const queuePolicyStatements = getAllQueuePolicyStatements({ resource });
  if (queuePolicyStatements.length) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.sqsQueuePolicy(resource.name),
      resource: cfnResource('AWS::SQS::QueuePolicy', {
        PolicyDocument: {
          Version: '2012-10-17',
          Id: 'queue-policy',
          Statement: queuePolicyStatements
        },
        Queues: [ref(cfLogicalNames.sqsQueue(resource.name))]
      }),
      nameChain: resource.nameChain
    });
  }
};
