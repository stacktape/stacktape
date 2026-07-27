import EventBridgeRule from '@cloudform/events/rule';
import { GetAtt } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { resolveReferenceToEventBus } from '@domain-services/config-manager/utils/event-buses';
import { resolveReferenceToSqsQueue } from '@domain-services/config-manager/utils/sqs-queues';
import { templateManager } from '@domain-services/template-manager';
import { stpErrors } from '@errors';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { isValidJson } from '@shared/utils/misc';
import { transformIntoCloudformationSubstitutedString } from '@utils/cloudformation';
import { ExpectedError } from '@utils/errors';

export const resolveSqsQueueEventBusEvents = ({ sqsQueue }: { sqsQueue: StpSqsQueue }): StpIamRoleStatement[] => {
  const { name, events, configParentResourceType, nameChain } = sqsQueue;
  const sqsQueueArn = GetAtt(cfLogicalNames.sqsQueue(name), 'Arn');

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
  sqsQueueArn: string | IntrinsicFunction;
  eventIndex: number;
  eventDetails: SqsQueueEventBusIntegrationProps;
  configParentResourceType: StpSqsQueue['configParentResourceType'];
}) => {
  const inputOptions = [eventDetails.input, eventDetails.inputPath, eventDetails.inputTransformer].filter((i) => i);
  if (inputOptions.length > 1) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in SQS queue ${queueName}. ` +
        'You can only set one of input, inputPath, or inputTransformer properties at the same time for eventBus. ' +
        'Please check the docs for more info.'
    );
  }

  if (
    (eventDetails.input && !isValidJson(eventDetails.input)) ||
    (eventDetails.inputTransformer && !isValidJson(eventDetails.inputTransformer.inputTemplate))
  ) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in SQS queue ${queueName}. ` +
        'When specifying "input" or "inputTransformer.inputTemplate" properties in event, property can only be valid object or stringified JSON.'
    );
  }

  if (
    [eventDetails.eventBusArn, eventDetails.eventBusName, eventDetails.useDefaultBus].filter((element) => element)
      .length !== 1
  ) {
    throw stpErrors.e83({
      eventBusReferencerStpName: queueName,
      eventBusReferencerStpType: configParentResourceType
    });
  }

  if (eventDetails.input || eventDetails.inputTransformer) {
    templateManager.addFinalTemplateOverrideFn(async (template) => {
      const ruleTarget = template.Resources[cfLogicalNames.eventBusRule(queueName, eventIndex)].Properties.Targets[0];

      if (ruleTarget.InputTransformer) {
        ruleTarget.InputTransformer.InputTemplate = transformIntoCloudformationSubstitutedString(
          await configManager.resolveDirectives({
            itemToResolve: eventDetails.inputTransformer.inputTemplate,
            resolveRuntime: true
          })
        );
      }
      if (ruleTarget.Input) {
        ruleTarget.Input = transformIntoCloudformationSubstitutedString(
          await configManager.resolveDirectives({
            itemToResolve: eventDetails.input,
            resolveRuntime: true
          })
        );
      }
    });
  }

  // this resolving is just for checking that event bus is referenced properly
  let resource: StpEventBus;
  if (eventDetails.eventBusName) {
    resource = resolveReferenceToEventBus({
      referencedFrom: queueName,
      referencedFromType: configParentResourceType as StpWorkloadType,
      stpResourceReference: eventDetails.eventBusName
    });
  }

  let onDeliveryFailureSqsQueueResource: StpSqsQueue;
  if (eventDetails.onDeliveryFailure) {
    if (
      [eventDetails.onDeliveryFailure.sqsQueueArn, eventDetails.onDeliveryFailure.sqsQueueName].filter(
        (element) => element
      ).length !== 1
    ) {
      throw stpErrors.e109({
        eventBusReferencerStpName: queueName,
        eventBusReferencerStpType: configParentResourceType
      });
    }
    if (eventDetails.onDeliveryFailure.sqsQueueName) {
      onDeliveryFailureSqsQueueResource = resolveReferenceToSqsQueue({
        referencedFrom: queueName,
        referencedFromType: configParentResourceType as StpWorkloadType,
        stpResourceReference: eventDetails.onDeliveryFailure.sqsQueueName
      });
    }
  }

  return new EventBridgeRule({
    State: 'ENABLED',
    EventPattern: eventDetails.eventPattern,
    EventBusName: eventDetails.eventBusArn
      ? eventDetails.eventBusArn
      : eventDetails.eventBusName
        ? GetAtt(cfLogicalNames.eventBus(resource.name), 'Arn')
        : undefined,
    Targets: [
      {
        Input: eventDetails.input
          ? typeof eventDetails.input === 'object'
            ? JSON.stringify(eventDetails.input)
            : eventDetails.input
          : undefined,
        InputPath: eventDetails.inputPath,
        InputTransformer: eventDetails.inputTransformer && {
          InputPathsMap: eventDetails.inputTransformer.inputPathsMap,
          InputTemplate:
            typeof eventDetails.inputTransformer.inputTemplate === 'object'
              ? JSON.stringify(eventDetails.inputTransformer.inputTemplate)
              : eventDetails.inputTransformer.inputTemplate
        },
        Arn: sqsQueueArn,
        ...(eventDetails.messageGroupId
          ? {
              SqsParameters: {
                MessageGroupId: eventDetails.messageGroupId
              }
            }
          : {}),
        ...(eventDetails.onDeliveryFailure
          ? {
              DeadLetterConfig: {
                Arn:
                  eventDetails.onDeliveryFailure.sqsQueueArn ||
                  GetAtt(cfLogicalNames.sqsQueue(onDeliveryFailureSqsQueueResource.name), 'Arn')
              }
            }
          : {}),
        Id: awsResourceNames.sqsQueueEventBusRuleTargetId(queueName, eventIndex)
      }
    ]
  });
};
