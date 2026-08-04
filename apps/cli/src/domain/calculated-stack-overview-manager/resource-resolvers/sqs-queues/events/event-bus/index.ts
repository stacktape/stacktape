import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt } from '@stacktape/cloudformation/intrinsics';
import type { StpSqsQueue } from '@domain-services/config-manager/resolved-types/sqs-queues';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { prepareEventBusIntegration } from '../../../_utils/event-bus-integration';
import type { StpIamRoleStatement } from '@stacktape/config/shared';
import type { SqsQueueEventBusIntegration, SqsQueueEventBusIntegrationProps } from '@stacktape/config/sqs-queues';

export const resolveSqsQueueEventBusEvents = ({ sqsQueue }: { sqsQueue: StpSqsQueue }): StpIamRoleStatement[] => {
  const { name, events, configParentResourceType, nameChain } = sqsQueue;
  const sqsQueueArn = getAtt(cfLogicalNames.sqsQueue(name), 'Arn');

  (events || []).forEach((event: SqsQueueEventBusIntegration, index) => {
    if (event.type === 'event-bus') {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.eventBusRule(name, index), // Reuse existing pattern
        nameChain,
        resource: getSqsQueueEventBusEventRule({
          eventDetails: event.properties,
          queueName: name,
          eventIndex: index,
          sqsQueueArn,
          configParentResourceType
        })
      });
    }
  });

  return [];
};

const getSqsQueueEventBusEventRule = ({
  sqsQueueArn,
  eventIndex,
  queueName,
  eventDetails,
  configParentResourceType
}: {
  queueName: string;
  sqsQueueArn: string | Intrinsic;
  eventIndex: number;
  eventDetails: SqsQueueEventBusIntegrationProps;
  configParentResourceType: StpSqsQueue['configParentResourceType'];
}) => {
  const ruleLogicalName = cfLogicalNames.eventBusRule(queueName, eventIndex);
  const { eventBusName, input, inputPath, inputTransformer, deadLetterConfig } = prepareEventBusIntegration({
    eventDetails,
    referencerName: queueName,
    referencerType: configParentResourceType,
    ruleLogicalName
  });

  return cfnResource('AWS::Events::Rule', {
    State: 'ENABLED',
    EventPattern: eventDetails.eventPattern,
    EventBusName: eventBusName,
    Targets: [
      {
        Input: input,
        InputPath: inputPath,
        InputTransformer: inputTransformer,
        Arn: sqsQueueArn,
        ...(eventDetails.messageGroupId
          ? {
              SqsParameters: {
                MessageGroupId: eventDetails.messageGroupId
              }
            }
          : {}),
        ...(deadLetterConfig ? { DeadLetterConfig: deadLetterConfig } : {}),
        Id: awsResourceNames.sqsQueueEventBusRuleTargetId(queueName, eventIndex)
      }
    ]
  });
};
