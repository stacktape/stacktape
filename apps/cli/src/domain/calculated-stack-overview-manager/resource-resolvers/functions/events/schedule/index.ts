import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import { cfnResource } from '@stacktape/cloudformation/resource';
import type { InputTransformer, RuleProperties, Target } from '@stacktape/cloudformation/resources/aws-events-rule';
import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { templateManager } from '@domain-services/template-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { isValidJson } from '@utils/misc';
import { transformIntoCloudformationSubstitutedString } from '@utils/cloudformation';
import { CliError } from '@utils/errors';
import { getEventBusRuleLambdaPermission, validateScheduleSyntax } from '../utils';
import type { ScheduleIntegration, ScheduleIntegrationProps } from '@stacktape/config/events';
import type { StpIamRoleStatement } from '@stacktape/config/shared';

export const resolveScheduledEvents = ({
  lambdaFunction
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}): StpIamRoleStatement[] => {
  const { name, cfLogicalName, aliasLogicalName, events, nameChain } = lambdaFunction;
  const lambdaEndpointArn = aliasLogicalName ? ref(aliasLogicalName) : getAtt(cfLogicalName, 'Arn');

  (events || []).forEach((event: ScheduleIntegration, index) => {
    if (event.type === 'schedule') {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.eventBusRule(name, index),
        nameChain,
        resource: getScheduleEventRule({
          eventDetails: event.properties,
          workloadName: name,
          eventIndex: index,
          lambdaEndpointArn
        })
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.lambdaPermission(name, index),
        nameChain,
        resource: getEventBusRuleLambdaPermission({
          lambdaEndpointArn,
          eventBusRuleArn: getAtt(cfLogicalNames.eventBusRule(name, index), 'Arn')
        })
      });
    }
  });
  return [];
};

export const getScheduleEventRule = ({
  lambdaEndpointArn,
  eventIndex,
  workloadName,
  eventDetails
}: {
  workloadName: string;
  lambdaEndpointArn: string | Intrinsic;
  eventIndex: number;
  eventDetails: ScheduleIntegrationProps;
}) => {
  const errors = validateScheduleSyntax(eventDetails.scheduleRate);
  if (errors && errors.length) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_SCHEDULE_RATE_INVALID',
      message: `Invalid \`scheduleRate\` on \`${workloadName}\`:\n${errors.join('\n')}`,
      hints: [
        "To specify cron syntax, use 'cron(<<FormInput>>)'. To specify rate syntax, use 'rate(<<FormInput>>)'.",
        'AWS has its own restrictions for cron syntax. To learn more about schedule syntaxes, refer to https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html'
      ]
    });
  }
  const inputOptions = [eventDetails.input, eventDetails.inputPath, eventDetails.inputTransformer].filter((i) => i);
  if (inputOptions.length > 1) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_SCHEDULE_INPUT_CONFLICT',
      message: `Schedule event on \`${workloadName}\` sets more than one of \`input\`, \`inputPath\`, and \`inputTransformer\`.`,
      hints: 'Keep only one schedule input mechanism.'
    });
  }
  if (
    (eventDetails.input && !isValidJson(eventDetails.input)) ||
    (eventDetails.inputTransformer && !isValidJson(eventDetails.inputTransformer.inputTemplate))
  ) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_SCHEDULE_INPUT_INVALID',
      message: `Schedule event on \`${workloadName}\` has an invalid \`input\` or \`inputTransformer.inputTemplate\`.`,
      hints: 'Use an object or a string containing valid JSON.'
    });
  }

  if (eventDetails.input || eventDetails.inputTransformer) {
    templateManager.addFinalTemplateOverrideFn(async (template) => {
      const ruleProperties = template.Resources[cfLogicalNames.eventBusRule(workloadName, eventIndex)]
        .Properties as RuleProperties;
      const ruleTarget = (ruleProperties.Targets as Target[])[0];

      if (ruleTarget.InputTransformer) {
        const inputTransformer = ruleTarget.InputTransformer as InputTransformer;
        inputTransformer.InputTemplate = transformIntoCloudformationSubstitutedString(
          await configManager.resolveDirectives({
            itemToResolve: JSON.parse(inputTransformer.InputTemplate as string),
            resolveRuntime: true
          })
        );
      }
      if (ruleTarget.Input) {
        ruleTarget.Input = transformIntoCloudformationSubstitutedString(
          await configManager.resolveDirectives({
            itemToResolve: JSON.parse(ruleTarget.Input as string),
            resolveRuntime: true
          })
        );
      }
    });
  }

  return cfnResource('AWS::Events::Rule', {
    State: 'ENABLED',
    ScheduleExpression: eventDetails.scheduleRate,
    // Description: eventDetails.description,
    // Name: eventDetails.name,
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
        Id: awsResourceNames.eventBusRuleTargetId(workloadName, eventIndex)
      }
    ]
  });
};
