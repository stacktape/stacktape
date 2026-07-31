import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import EventBridgeRule from '@cloudform/events/rule';
import { GetAtt, Ref } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { prepareEventBusIntegration } from '../../../_utils/event-bus-integration';
import { getEventBusRuleLambdaPermission } from '../utils';
import type { IntrinsicFunction } from '@stacktape/config/cloudformation';
import type { EventBusIntegration, EventBusIntegrationProps } from '@stacktape/config/events';
import type { StpIamRoleStatement } from '@stacktape/config/shared';

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
  const ruleLogicalName = cfLogicalNames.eventBusRule(workloadName, eventIndex);
  const { eventBusName, input, inputPath, inputTransformer, deadLetterConfig } = prepareEventBusIntegration({
    eventDetails,
    referencerName: workloadName,
    referencerType: configParentResourceType,
    ruleLogicalName
  });

  return new EventBridgeRule({
    State: 'ENABLED',
    EventPattern: eventDetails.eventPattern,
    // Description: eventDetails.description,
    // Name: eventDetails.name,
    EventBusName: eventBusName,
    Targets: [
      {
        Input: input,
        InputPath: inputPath,
        InputTransformer: inputTransformer,
        Arn: lambdaEndpointArn,
        ...(deadLetterConfig ? { DeadLetterConfig: deadLetterConfig } : {}),
        Id: awsResourceNames.eventBusRuleTargetId(workloadName, eventIndex)
      }
    ]
  });
};
