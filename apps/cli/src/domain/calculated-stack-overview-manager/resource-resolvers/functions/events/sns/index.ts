import { GetAtt, Ref } from '@cloudform/functions';
import Permission from '@cloudform/lambda/permission';
import SnsSubscription from '@cloudform/sns/subscription';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { resolveReferenceToSnsTopic } from '@domain-services/config-manager/utils/sns-topics';
import { resolveReferenceToSqsQueue } from '@domain-services/config-manager/utils/sqs-queues';
import { stpErrors } from '@errors';
import { cfLogicalNames } from '@shared/naming/logical-names';

export const resolveSnsEvents = ({
  lambdaFunction
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}): StpIamRoleStatement[] => {
  const { name, cfLogicalName, aliasLogicalName, events, configParentResourceType, nameChain } = lambdaFunction;
  (events || []).forEach((event: SnsIntegration, index) => {
    if (event.type === 'sns') {
      const { snsTopicArn, snsTopicName, onDeliveryFailure, filterPolicy } = event.properties;
      if ([snsTopicArn, snsTopicName].filter((element) => element).length !== 1) {
        throw stpErrors.e85({
          snsTopicReferencerStpName: name,
          snsTopicReferencerStpType: configParentResourceType
        });
      }
      if (snsTopicName) {
        const topic = resolveReferenceToSnsTopic({
          stpResourceReference: snsTopicName,
          referencedFrom: name,
          referencedFromType: configParentResourceType
        });
        if (topic.fifoEnabled) {
          throw stpErrors.e86({
            snsTopicReferencerStpName: name,
            snsTopicReferencerStpType: configParentResourceType,
            snsTopicStpName: snsTopicName
          });
        }
      }
      const topicArn = snsTopicArn || GetAtt(cfLogicalNames.snsTopic(snsTopicName), 'TopicArn');

      const endpoint = aliasLogicalName ? Ref(aliasLogicalName) : GetAtt(cfLogicalName, 'Arn');

      if (onDeliveryFailure?.sqsQueueName) {
        resolveReferenceToSqsQueue({
          referencedFrom: name,
          stpResourceReference: onDeliveryFailure?.sqsQueueName,
          referencedFromType: lambdaFunction.configParentResourceType
        });
      }

      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.snsEventSubscription(name, index),
        resource: new SnsSubscription({
          TopicArn: topicArn,
          Protocol: 'lambda',
          Endpoint: endpoint,
          FilterPolicy: filterPolicy,
          ...(onDeliveryFailure && {
            RedrivePolicy: {
              deadLetterTargetArn:
                onDeliveryFailure.sqsQueueArn || GetAtt(cfLogicalNames.sqsQueue(onDeliveryFailure.sqsQueueName), 'Arn')
            }
          })
        }),
        nameChain
      });

      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.snsEventPermission(name, index),
        resource: new Permission({
          FunctionName: endpoint,
          Action: 'lambda:InvokeFunction',
          Principal: 'sns.amazonaws.com',
          SourceArn: topicArn
        }),
        nameChain
      });
    }
  });
  return [];
};
