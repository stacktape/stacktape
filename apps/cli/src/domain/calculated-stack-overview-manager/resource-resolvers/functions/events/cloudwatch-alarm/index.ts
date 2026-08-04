import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import type { StpWorkloadType } from '@domain-services/config-manager/resolved-types/resources';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { resolveReferenceToAlarm } from '@domain-services/config-manager/utils/alarms';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getEventBusRuleLambdaPermission } from '../utils';
import type { AlarmIntegration, AlarmIntegrationProps } from '@stacktape/config/events';
import type { StpIamRoleStatement } from '@stacktape/config/shared';

export const resolveCloudwatchAlarmEvents = ({
  lambdaFunction
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}): StpIamRoleStatement[] => {
  const { name, cfLogicalName, aliasLogicalName, events, configParentResourceType, nameChain } = lambdaFunction;
  const lambdaEndpointArn = aliasLogicalName ? ref(aliasLogicalName) : getAtt(cfLogicalName, 'Arn');
  (events || []).forEach((event: AlarmIntegration, index) => {
    if (event.type === 'cloudwatch-alarm') {
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
          eventBusRuleArn: getAtt(cfLogicalNames.eventBusRule(name, index), 'Arn')
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
  lambdaEndpointArn: string | Intrinsic;
  eventIndex: number;
  eventDetails: AlarmIntegrationProps;
  configParentResourceType: StpLambdaFunction['configParentResourceType'];
}) => {
  // this resolving is just for checking that referenced alarm exists
  resolveReferenceToAlarm({
    stpAlarmReference: eventDetails.alarmName,
    referencedFrom: workloadName,
    referencedFromType: configParentResourceType as StpWorkloadType
  });
  return cfnResource('AWS::Events::Rule', {
    State: 'ENABLED',
    EventPattern: {
      source: ['aws.cloudwatch'],
      'detail-type': ['CloudWatch Alarm State Change'],
      resources: [getAtt(cfLogicalNames.cloudwatchAlarm(eventDetails.alarmName), 'Arn')],
      detail: {
        state: {
          value: ['ALARM']
        }
      }
    },
    Targets: [
      {
        Arn: lambdaEndpointArn,
        Id: awsResourceNames.eventBusRuleTargetId(workloadName, eventIndex)
      }
    ]
  });
};
