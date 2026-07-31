import { GetAtt } from '@cloudform/functions';
import { configManager } from '@domain-services/config-manager';
import type { StpEventBus } from '@domain-services/config-manager/resolved-types/event-buses';
import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import type { StpSqsQueue } from '@domain-services/config-manager/resolved-types/sqs-queues';
import { resolveReferenceToEventBus } from '@domain-services/config-manager/utils/event-buses';
import { resolveReferenceToSqsQueue } from '@domain-services/config-manager/utils/sqs-queues';
import { templateManager } from '@domain-services/template-manager';
import type { EventBusIntegrationProps } from '@stacktape/config/events';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { transformIntoCloudformationSubstitutedString } from '@utils/cloudformation';
import { CliError } from '@utils/errors';
import { isValidJson } from '@utils/misc';

type EventBusIntegrationContext = {
  eventDetails: EventBusIntegrationProps;
  referencerName: string;
  referencerType: StpResourceType;
};

export const validateEventBusIntegration = ({
  eventDetails,
  referencerName,
  referencerType
}: EventBusIntegrationContext) => {
  const resource = `\`${referencerName}\` (${referencerType})`;
  const inputOptions = [eventDetails.input, eventDetails.inputPath, eventDetails.inputTransformer].filter(Boolean);
  if (inputOptions.length > 1) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'EVENT_BUS_INPUT_OPTIONS_CONFLICT',
      message: `Event bus integration on ${resource} configures more than one target-input option.`,
      hints: 'Set exactly one of `input`, `inputPath`, or `inputTransformer`.'
    });
  }

  if (
    (eventDetails.input && !isValidJson(eventDetails.input)) ||
    (eventDetails.inputTransformer && !isValidJson(eventDetails.inputTransformer.inputTemplate))
  ) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'EVENT_BUS_INPUT_INVALID_JSON',
      message: `Event bus integration on ${resource} contains an invalid JSON target input.`,
      hints: '`input` and `inputTransformer.inputTemplate` must be objects or strings containing valid JSON.'
    });
  }

  const eventBusReferences = [eventDetails.eventBusArn, eventDetails.eventBusName, eventDetails.useDefaultBus].filter(
    Boolean
  );
  if (eventBusReferences.length !== 1) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'EVENT_BUS_REFERENCE_INVALID',
      message: `Event bus integration on ${resource} does not identify exactly one event bus.`,
      hints: 'Set exactly one of `eventBusName`, `eventBusArn`, or `useDefaultBus`.'
    });
  }

  if (eventDetails.onDeliveryFailure) {
    const queueReferences = [
      eventDetails.onDeliveryFailure.sqsQueueArn,
      eventDetails.onDeliveryFailure.sqsQueueName
    ].filter(Boolean);
    if (queueReferences.length !== 1) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'EVENT_BUS_FAILURE_QUEUE_REFERENCE_INVALID',
        message: `The event bus failure destination on ${resource} does not identify exactly one SQS queue.`,
        hints: 'Set exactly one of `onDeliveryFailure.sqsQueueName` or `onDeliveryFailure.sqsQueueArn`.'
      });
    }
  }
};

const registerResolvedInput = ({
  eventDetails,
  ruleLogicalName
}: {
  eventDetails: EventBusIntegrationProps;
  ruleLogicalName: string;
}) => {
  if (!eventDetails.input && !eventDetails.inputTransformer) return;

  templateManager.addFinalTemplateOverrideFn(async (template) => {
    const target = template.Resources[ruleLogicalName].Properties.Targets[0];

    if (target.InputTransformer) {
      target.InputTransformer.InputTemplate = transformIntoCloudformationSubstitutedString(
        await configManager.resolveDirectives({
          itemToResolve: eventDetails.inputTransformer.inputTemplate,
          resolveRuntime: true
        })
      );
    }
    if (target.Input) {
      target.Input = transformIntoCloudformationSubstitutedString(
        await configManager.resolveDirectives({
          itemToResolve: eventDetails.input,
          resolveRuntime: true
        })
      );
    }
  });
};

export const prepareEventBusIntegration = ({
  eventDetails,
  referencerName,
  referencerType,
  ruleLogicalName
}: EventBusIntegrationContext & { ruleLogicalName: string }) => {
  validateEventBusIntegration({ eventDetails, referencerName, referencerType });
  registerResolvedInput({ eventDetails, ruleLogicalName });

  let eventBus: StpEventBus | undefined;
  if (eventDetails.eventBusName) {
    eventBus = resolveReferenceToEventBus({
      referencedFrom: referencerName,
      referencedFromType: referencerType,
      stpResourceReference: eventDetails.eventBusName
    });
  }

  let failureQueue: StpSqsQueue | undefined;
  if (eventDetails.onDeliveryFailure?.sqsQueueName) {
    failureQueue = resolveReferenceToSqsQueue({
      referencedFrom: referencerName,
      referencedFromType: referencerType,
      stpResourceReference: eventDetails.onDeliveryFailure.sqsQueueName
    });
  }

  return {
    eventBusName: eventDetails.eventBusArn
      ? eventDetails.eventBusArn
      : eventBus
        ? GetAtt(cfLogicalNames.eventBus(eventBus.name), 'Arn')
        : undefined,
    input: eventDetails.input
      ? typeof eventDetails.input === 'object'
        ? JSON.stringify(eventDetails.input)
        : eventDetails.input
      : undefined,
    inputPath: eventDetails.inputPath,
    inputTransformer: eventDetails.inputTransformer && {
      InputPathsMap: eventDetails.inputTransformer.inputPathsMap,
      InputTemplate:
        typeof eventDetails.inputTransformer.inputTemplate === 'object'
          ? JSON.stringify(eventDetails.inputTransformer.inputTemplate)
          : eventDetails.inputTransformer.inputTemplate
    },
    deadLetterConfig: eventDetails.onDeliveryFailure
      ? {
          Arn: eventDetails.onDeliveryFailure.sqsQueueArn || GetAtt(cfLogicalNames.sqsQueue(failureQueue.name), 'Arn')
        }
      : undefined
  };
};
