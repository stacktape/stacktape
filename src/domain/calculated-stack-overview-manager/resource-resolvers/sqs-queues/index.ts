import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt, Ref } from '@cloudform/functions';
import SqsQueue from '@cloudform/sqs/queue';
import QueuePolicy from '@cloudform/sqs/queuePolicy';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import {
  getAllQueuePolicyStatements,
  resolveReferenceToSqsQueue
} from '@domain-services/config-manager/utils/sqs-queues';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { consoleLinks } from '@shared/naming/console-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
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
    resource: new SqsQueue({
      ContentBasedDeduplication: resource.contentBasedDeduplication,
      DelaySeconds: resource.delayMessagesSecond,
      MessageRetentionPeriod: resource.messageRetentionPeriodSeconds,
      MaximumMessageSize: resource.maxMessageSizeBytes,
      VisibilityTimeout: resource.visibilityTimeoutSeconds,
      FifoQueue: resource.fifoEnabled,
      ReceiveMessageWaitTimeSeconds: resource.longPollingSeconds,
      QueueName: awsResourceNames.sqsQueue(
        resource.name,
        globalStateManager.targetStack.stackName,
        resource.fifoEnabled
      ),
      RedrivePolicy: resource.redrivePolicy
        ? {
            deadLetterTargetArn:
              resource.redrivePolicy.targetSqsQueueArn ||
              GetAtt(cfLogicalNames.sqsQueue(resource.redrivePolicy.targetSqsQueueName), 'Arn'),
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
      globalStateManager.region,
      globalStateManager.targetAwsAccount.awsAccountId,
      awsResourceNames.sqsQueue(resource.name, globalStateManager.targetStack.stackName, resource.fifoEnabled)
    )
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    paramName: 'arn',
    nameChain: resource.nameChain,
    paramValue: GetAtt(cfLogicalNames.sqsQueue(resource.name), 'Arn')
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    paramName: 'url',
    nameChain: resource.nameChain,
    paramValue: Ref(cfLogicalNames.sqsQueue(resource.name))
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    paramName: 'name',
    nameChain: resource.nameChain,
    paramValue: GetAtt(cfLogicalNames.sqsQueue(resource.name), 'QueueName')
  });

  const queuePolicyStatements = getAllQueuePolicyStatements({ resource });
  if (queuePolicyStatements.length) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.sqsQueuePolicy(resource.name),
      resource: new QueuePolicy({
        PolicyDocument: {
          Version: '2012-10-17',
          Id: 'queue-policy',
          Statement: queuePolicyStatements
        },
        Queues: [Ref(cfLogicalNames.sqsQueue(resource.name))]
      }),
      nameChain: resource.nameChain
    });
  }
};
