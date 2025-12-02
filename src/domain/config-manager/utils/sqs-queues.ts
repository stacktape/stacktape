import { GetAtt } from '@cloudform/functions';
import { stpErrors } from '@errors';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { configManager } from '../index';
import { getPropsOfResourceReferencedInConfig } from './resource-references';

export const resolveReferenceToSqsQueue = ({
  referencedFrom,
  referencedFromType,
  stpResourceReference
}: {
  referencedFrom: string;
  referencedFromType?: StpResourceType | 'alarm';
  stpResourceReference: string | undefined;
}) => {
  return getPropsOfResourceReferencedInConfig({
    stpResourceReference,
    stpResourceType: 'sqs-queue',
    referencedFrom,
    referencedFromType
  });
};

export const validateSqsQueueConfig = ({ resource }: { resource: StpSqsQueue }) => {
  if ((resource.contentBasedDeduplication || resource.fifoHighThroughput) && !resource.fifoEnabled) {
    throw stpErrors.e81({ stpSqsQueueName: resource.name });
  }

  if (resource.redrivePolicy) {
    if (
      [resource.redrivePolicy.targetSqsQueueArn, resource.redrivePolicy.targetSqsQueueName].filter((element) => element)
        .length !== 1
    ) {
      throw stpErrors.e112({
        sqsQueueReferencerStpName: resource.name
      });
    }
  }
};

export const getAllQueuePolicyStatements = ({ resource }: { resource: StpSqsQueue }) => {
  const result: (SqsQueuePolicyStatement & { Resource: any })[] = [
    ...(resource.policyStatements || []).map((statement) => ({
      ...statement,
      Resource: [GetAtt(cfLogicalNames.sqsQueue(resource.name), 'Arn') as unknown as string]
    }))
  ];
  configManager.allLambdasTriggerableUsingEvents.forEach(({ events, name: lambdaStpName }) => {
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
            Resource: [GetAtt(cfLogicalNames.sqsQueue(resource.name), 'Arn') as unknown as string],
            Condition: {
              ArnEquals: {
                'aws:SourceArn': GetAtt(cfLogicalNames.eventBusRule(lambdaStpName, index), 'Arn')
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
            Resource: [GetAtt(cfLogicalNames.sqsQueue(resource.name), 'Arn') as unknown as string],
            Condition: {
              ArnEquals: {
                'aws:SourceArn': snsTopicArn || GetAtt(cfLogicalNames.snsTopic(snsTopicName), 'TopicArn')
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
          Resource: [GetAtt(cfLogicalNames.sqsQueue(resource.name), 'Arn') as unknown as string],
          Condition: {
            ArnEquals: {
              'aws:SourceArn': GetAtt(cfLogicalNames.eventBusRule(resource.name, index), 'Arn')
            }
          }
        });
      }
    });
  }

  return result;
};
