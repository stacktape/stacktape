import { GetAtt, Ref } from '@cloudform/functions';
import EventSourceMapping from '@cloudform/lambda/eventSourceMapping';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { resolveReferenceToSqsQueue } from '@domain-services/config-manager/utils/sqs-queues';
import { stpErrors } from '@errors';
import { cfLogicalNames } from '@shared/naming/logical-names';

export const resolveSqsEvents = ({
  lambdaFunction
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}): StpIamRoleStatement[] => {
  const { name, cfLogicalName, aliasLogicalName, events, configParentResourceType, nameChain } = lambdaFunction;

  const eventInducedSqsStatement = {
    Effect: 'Allow',
    Action: [
      'sqs:ReceiveMessage',
      'sqs:ChangeMessageVisibility',
      'sqs:GetQueueUrl',
      'sqs:DeleteMessage',
      'sqs:GetQueueAttributes'
    ],
    Resource: []
  };

  const lambdaEndpointArn = aliasLogicalName ? Ref(aliasLogicalName) : GetAtt(cfLogicalName, 'Arn');
  (events || []).forEach((event: SqsIntegration, index) => {
    if (event.type === 'sqs') {
      if ([event.properties.sqsQueueArn, event.properties.sqsQueueName].filter((element) => element).length !== 1) {
        throw stpErrors.e84({
          sqsQueueReferencerStpName: name,
          sqsQueueReferencerStpType: configParentResourceType
        });
      }
      if (event.properties.sqsQueueName) {
        resolveReferenceToSqsQueue({
          stpResourceReference: event.properties.sqsQueueName,
          referencedFrom: name,
          referencedFromType: configParentResourceType
        });
      }
      const queueArn =
        event.properties.sqsQueueArn || GetAtt(cfLogicalNames.sqsQueue(event.properties.sqsQueueName), 'Arn');

      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.eventSourceMapping(name, index),
        nameChain,
        resource: getEventSourceMapping({ eventDetails: event.properties, lambdaEndpointArn, queueArn })
      });
      eventInducedSqsStatement.Resource.push(queueArn);
    }
  });

  return eventInducedSqsStatement.Resource.length ? [eventInducedSqsStatement] : [];
};

const getEventSourceMapping = ({
  lambdaEndpointArn,
  eventDetails,
  queueArn
}: {
  eventDetails: SqsIntegrationProps;
  lambdaEndpointArn: string | IntrinsicFunction;
  queueArn: string | IntrinsicFunction;
}) => {
  const resource = new EventSourceMapping({
    BatchSize: eventDetails.batchSize,
    MaximumBatchingWindowInSeconds: eventDetails.maxBatchWindowSeconds,
    EventSourceArn: queueArn,
    Enabled: true,
    FunctionName: lambdaEndpointArn
  });
  return resource;
};
