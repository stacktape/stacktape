import EventBridgeRule from '@cloudform/events/rule';
import { GetAtt, Ref } from '@cloudform/functions';
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
import { getEventBusRuleLambdaPermission } from '../utils';

export const resolveEventBusEvents = ({
  lambdaFunction
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}): StpIamRoleStatement[] => {
  const { name, cfLogicalName, aliasLogicalName, events, configParentResourceType, nameChain } = lambdaFunction;
  const lambdaEndpointArn = aliasLogicalName ? Ref(aliasLogicalName) : GetAtt(cfLogicalName, 'Arn');
  (events || []).forEach((event: EventBusIntegration, index) => {
    if (event.type === 'event-bus') {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.eventBusRule(name, index),
        nameChain,
        resource: getEventBusEventRule({
          eventDetails: event.properties,
          workloadName: name,
          eventIndex: index,
          lambdaEndpointArn,
          configParentResourceType
        })
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.lambdaPermission(name, index),
        nameChain,
        resource: getEventBusRuleLambdaPermission({
          lambdaEndpointArn,
          eventBusRuleArn: GetAtt(cfLogicalNames.eventBusRule(name, index), 'Arn')
        })
      });
    }
  });

  return [];
};

const getEventBusEventRule = ({
  lambdaEndpointArn,
  eventIndex,
  workloadName,
  eventDetails,
  configParentResourceType
}: {
  workloadName: string;
  lambdaEndpointArn: string | IntrinsicFunction;
  eventIndex: number;
  eventDetails: EventBusIntegrationProps;
  configParentResourceType: StpLambdaFunction['configParentResourceType'];
}) => {
  const inputOptions = [eventDetails.input, eventDetails.inputPath, eventDetails.inputTransformer].filter((i) => i);
  if (inputOptions.length > 1) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in compute resource ${workloadName}. ` +
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
      `Error in compute resource ${workloadName}. ` +
        'When specifying "input" or "inputTransformer.inputTemplate" properties in event, property can only be valid object or stringified JSON.'
    );
  }
  if (
    [eventDetails.eventBusArn, eventDetails.eventBusName, eventDetails.useDefaultBus].filter((element) => element)
      .length !== 1
  ) {
    throw stpErrors.e83({
      eventBusReferencerStpName: workloadName,
      eventBusReferencerStpType: configParentResourceType
    });
  }

  if (eventDetails.input || eventDetails.inputTransformer) {
    templateManager.addFinalTemplateOverrideFn(async (template) => {
      const ruleTarget =
        template.Resources[cfLogicalNames.eventBusRule(workloadName, eventIndex)].Properties.Targets[0];

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
      referencedFrom: workloadName,
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
        eventBusReferencerStpName: workloadName,
        eventBusReferencerStpType: configParentResourceType
      });
    }
    if (eventDetails.onDeliveryFailure.sqsQueueName) {
      onDeliveryFailureSqsQueueResource = resolveReferenceToSqsQueue({
        referencedFrom: workloadName,
        referencedFromType: configParentResourceType as StpWorkloadType,
        stpResourceReference: eventDetails.onDeliveryFailure.sqsQueueName
      });
    }
  }
  return new EventBridgeRule({
    State: 'ENABLED',
    EventPattern: eventDetails.eventPattern,
    // Description: eventDetails.description,
    // Name: eventDetails.name,
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
        Arn: lambdaEndpointArn,
        ...(eventDetails.onDeliveryFailure
          ? {
              DeadLetterConfig: {
                Arn:
                  eventDetails.onDeliveryFailure.sqsQueueArn ||
                  GetAtt(cfLogicalNames.sqsQueue(onDeliveryFailureSqsQueueResource.name), 'Arn')
              }
            }
          : {}),
        Id: awsResourceNames.eventBusRuleTargetId(workloadName, eventIndex)
      }
    ]
  });
};
