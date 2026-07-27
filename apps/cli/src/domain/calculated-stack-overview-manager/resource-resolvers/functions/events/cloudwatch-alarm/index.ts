import EventBridgeRule from '@cloudform/events/rule';
import { GetAtt, Ref } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { resolveReferenceToAlarm } from '@domain-services/config-manager/utils/alarms';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getEventBusRuleLambdaPermission } from '../utils';

export const resolveCloudwatchAlarmEvents = ({
  lambdaFunction
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}): StpIamRoleStatement[] => {
  const { name, cfLogicalName, aliasLogicalName, events, configParentResourceType, nameChain } = lambdaFunction;
  const lambdaEndpointArn = aliasLogicalName ? Ref(aliasLogicalName) : GetAtt(cfLogicalName, 'Arn');
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
  eventDetails: AlarmIntegrationProps;
  configParentResourceType: StpLambdaFunction['configParentResourceType'];
}) => {
  // this resolving is just for checking that referenced alarm exists
  resolveReferenceToAlarm({
    stpAlarmReference: eventDetails.alarmName,
    referencedFrom: workloadName,
    referencedFromType: configParentResourceType as StpWorkloadType
  });
  return new EventBridgeRule({
    State: 'ENABLED',
    EventPattern: {
      source: ['aws.cloudwatch'],
      'detail-type': ['CloudWatch Alarm State Change'],
      resources: [GetAtt(cfLogicalNames.cloudwatchAlarm(eventDetails.alarmName), 'Arn')],
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
