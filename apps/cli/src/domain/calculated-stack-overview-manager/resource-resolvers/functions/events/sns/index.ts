import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { resolveReferenceToSnsTopic } from '@domain-services/config-manager/utils/sns-topics';
import { resolveReferenceToSqsQueue } from '@domain-services/config-manager/utils/sqs-queues';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import type { SnsIntegration } from '@stacktape/config/events';
import type { StpIamRoleStatement } from '@stacktape/config/shared';
import { CliError } from '@utils/errors';

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
        throw new CliError({
          category: 'CONFIG_VALIDATION',
          code: 'CONFIG_SNS_TOPIC_REFERENCE_INVALID',
          message: `Error in ${configParentResourceType} \`${name}\`. When referencing an SNS topic, specify exactly one of \`snsTopicName\` or \`snsTopicArn\`.`
        });
      }
      if (snsTopicName) {
        const topic = resolveReferenceToSnsTopic({
          stpResourceReference: snsTopicName,
          referencedFrom: name,
          referencedFromType: configParentResourceType
        });
        if (topic.fifoEnabled) {
          throw new CliError({
            category: 'CONFIG_VALIDATION',
            code: 'CONFIG_SNS_FIFO_TOPIC_UNSUPPORTED',
            message: `Error in ${configParentResourceType} \`${name}\`. SNS topic \`${snsTopicName}\` cannot be used as a Lambda event because it has FIFO enabled.`
          });
        }
      }
      if (
        onDeliveryFailure &&
        [onDeliveryFailure.sqsQueueArn, onDeliveryFailure.sqsQueueName].filter((queueReference) => queueReference)
          .length !== 1
      ) {
        throw new CliError({
          category: 'CONFIG_VALIDATION',
          code: 'CONFIG_SNS_DELIVERY_FAILURE_QUEUE_REFERENCE_INVALID',
          message: `Error in ${configParentResourceType} \`${name}\`. When configuring SNS delivery failures, specify exactly one of \`sqsQueueName\` or \`sqsQueueArn\`.`
        });
      }
      const topicArn = snsTopicArn || getAtt(cfLogicalNames.snsTopic(snsTopicName), 'TopicArn');

      const endpoint = aliasLogicalName ? ref(aliasLogicalName) : getAtt(cfLogicalName, 'Arn');

      if (onDeliveryFailure?.sqsQueueName) {
        resolveReferenceToSqsQueue({
          referencedFrom: name,
          stpResourceReference: onDeliveryFailure?.sqsQueueName,
          referencedFromType: lambdaFunction.configParentResourceType
        });
      }

      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.snsEventSubscription(name, index),
        resource: cfnResource('AWS::SNS::Subscription', {
          TopicArn: topicArn,
          Protocol: 'lambda',
          Endpoint: endpoint,
          FilterPolicy: filterPolicy,
          ...(onDeliveryFailure && {
            RedrivePolicy: {
              deadLetterTargetArn:
                onDeliveryFailure.sqsQueueArn || getAtt(cfLogicalNames.sqsQueue(onDeliveryFailure.sqsQueueName), 'Arn')
            }
          })
        }),
        nameChain
      });

      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.snsEventPermission(name, index),
        resource: cfnResource('AWS::Lambda::Permission', {
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
