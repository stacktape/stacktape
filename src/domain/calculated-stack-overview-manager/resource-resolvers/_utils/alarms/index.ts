import { globalStateManager } from '@application-services/global-state-manager';
import EventBridgeRule from '@cloudform/events/rule';
import { GetAtt } from '@cloudform/functions';
import LambdaPermission from '@cloudform/lambda/permission';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { getAlarmsToBeAppliedToResource } from '@domain-services/config-manager/utils/alarms';
import { templateManager } from '@domain-services/template-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfEvaluatedLinks } from '@shared/naming/cf-evaluated-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { processAllNodes } from '@shared/utils/misc';
import { transformIntoCloudformationSubstitutedString } from '@utils/cloudformation';
import { escapeCloudformationSecretDynamicReference } from '@utils/stack-info-map-sensitive-values';
import {
  getApplicationLoadBalancerCustomAlarm,
  getApplicationLoadBalancerErrorRateAlarm,
  getApplicationLoadBalancerUnhealthyTargetsAlarm
} from './application-load-balancer-alarms';
import { getHttpApiGatewayErrorRateAlarm, getHttpApiGatewayLatencyAlarm } from './http-api-gateway-alarms';
import { getLambdaDurationAlarm, getLambdaErrorRateAlarm } from './lambda-alarms';
import {
  getDatabaseConnectionCountAlarm,
  getDatabaseCPUUtilizationAlarm,
  getDatabaseFreeMemoryAlarm,
  getDatabaseFreeStorageAlarm,
  getDatabaseLatencyAlarm
} from './relational-database-alarms';
import { getSqsQueueNotEmptyAlarm, getSqsQueueReceivedMessagesCountAlarm } from './sqs-queue-alarms';
import { getAffectedResourceInfo, getComparisonOperator, getStatFunction, measuringUnits } from './utils';

export const resolveAlarmsForResource = ({ resource }: { resource: StpAlarmEnabledResource }) => {
  getAlarmsToBeAppliedToResource({ resource, globalAlarms: configManager.globalConfigAlarms }).forEach((alarm) => {
    calculatedStackOverviewManager.addCfChildResource({
      nameChain: resource.nameChain,
      cfLogicalName: cfLogicalNames.cloudwatchAlarm(alarm.name),
      resource: getCloudwatchAlarmResource({ alarm, resource })
    });
    calculatedStackOverviewManager.addCfChildResource({
      nameChain: resource.nameChain,
      cfLogicalName: cfLogicalNames.cloudwatchAlarmEventBusNotificationRule(alarm.name),
      resource: getEventRuleForAlarmNotification({ alarm, resource })
    });
    calculatedStackOverviewManager.addCfChildResource({
      nameChain: resource.nameChain,
      cfLogicalName: cfLogicalNames.cloudwatchAlarmEventBusNotificationRuleLambdaPermission(alarm.name),
      resource: new LambdaPermission({
        Action: 'lambda:InvokeFunction',
        Principal: 'events.amazonaws.com',
        FunctionName: GetAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn'),
        SourceArn: GetAtt(cfLogicalNames.cloudwatchAlarmEventBusNotificationRule(alarm.name), 'Arn')
      })
    });
    templateManager.addFinalTemplateOverrideFn(async (template) => {
      const targetInputTransformer =
        template.Resources[cfLogicalNames.cloudwatchAlarmEventBusNotificationRule(alarm.name)].Properties.Targets[0]
          .InputTransformer;
      targetInputTransformer.InputTemplate = transformIntoCloudformationSubstitutedString(
        await processAllNodes(
          await configManager.resolveDirectives({
            itemToResolve: getInputTemplate({ alarm, resource }),
            resolveRuntime: true
          }),
          escapeCloudformationSecretDynamicReference
        )
      );
    });
  });
};

const getCloudwatchAlarmResource = ({ alarm, resource }: { alarm: AlarmDefinition; resource: StpResource }) => {
  switch (alarm.trigger.type) {
    case 'lambda-error-rate':
      return getLambdaErrorRateAlarm({ resource: resource as StpLambdaFunction, alarm });
    case 'lambda-duration':
      return getLambdaDurationAlarm({ resource: resource as StpLambdaFunction, alarm });
    case 'database-connection-count':
      return getDatabaseConnectionCountAlarm({ resource: resource as StpRelationalDatabase, alarm });
    case 'database-cpu-utilization':
      return getDatabaseCPUUtilizationAlarm({ resource: resource as StpRelationalDatabase, alarm });
    case 'database-free-storage':
      return getDatabaseFreeStorageAlarm({ resource: resource as StpRelationalDatabase, alarm });
    case 'database-read-latency':
      return getDatabaseLatencyAlarm({ resource: resource as StpRelationalDatabase, alarm, latencyType: 'read' });
    case 'database-write-latency':
      return getDatabaseLatencyAlarm({ resource: resource as StpRelationalDatabase, alarm, latencyType: 'write' });
    case 'database-free-memory':
      return getDatabaseFreeMemoryAlarm({ resource: resource as StpRelationalDatabase, alarm });
    case 'http-api-gateway-error-rate':
      return getHttpApiGatewayErrorRateAlarm({ resource: resource as StpHttpApiGateway, alarm });
    case 'http-api-gateway-latency':
      return getHttpApiGatewayLatencyAlarm({ resource: resource as StpHttpApiGateway, alarm });
    case 'application-load-balancer-error-rate':
      return getApplicationLoadBalancerErrorRateAlarm({ resource: resource as StpApplicationLoadBalancer, alarm });
    case 'application-load-balancer-unhealthy-targets':
      return getApplicationLoadBalancerUnhealthyTargetsAlarm({
        resource: resource as StpApplicationLoadBalancer,
        alarm
      });
    case 'application-load-balancer-custom':
      return getApplicationLoadBalancerCustomAlarm({ resource: resource as StpApplicationLoadBalancer, alarm });
    case 'sqs-queue-received-messages-count':
      return getSqsQueueReceivedMessagesCountAlarm({ resource: resource as StpSqsQueue, alarm });
    case 'sqs-queue-not-empty':
      return getSqsQueueNotEmptyAlarm({ resource: resource as StpSqsQueue, alarm });
    default:
      // @note this is to ensure that we handle all possible types, even when new types are added
      const _alarmTriggerCheck: never = alarm.trigger;
  }
};

const getInputTemplate = ({ alarm, resource }: { alarm: AlarmDefinition; resource: StpResource }) => {
  const alarmAwsResourceName = awsResourceNames.cloudwatchAlarm(globalStateManager.targetStack.stackName, alarm.name);
  const inputTemplate: AlarmNotificationEventRuleInput = {
    description: '<description>',
    time: '<time>',
    alarmAwsResourceName,
    stackName: globalStateManager.targetStack.stackName,
    alarmConfig: alarm,
    affectedResource: getAffectedResourceInfo({ alarm, resource }),
    comparisonOperator: getComparisonOperator({ alarm }),
    measuringUnit: measuringUnits[alarm.trigger.type],
    alarmLink: cfEvaluatedLinks.cloudwatchAlarm(encodeURIComponent(alarmAwsResourceName)) as unknown as string,
    statFunction: getStatFunction({ alarm })
  };
  return inputTemplate;
};

const getEventRuleForAlarmNotification = ({ alarm, resource }: { alarm: AlarmDefinition; resource: StpResource }) => {
  // const alarmAwsResourceName = awsResourceNames.cloudwatchAlarm(globalStateManager.targetStack.stackName, alarm.name);
  // const inputTemplate: AlarmNotificationEventRuleInput = {
  //   description: '<description>',
  //   time: '<time>',
  //   alarmAwsResourceName,
  //   stackName: globalStateManager.targetStack.stackName,
  //   alarmConfig: alarm,
  //   affectedResource: getAffectedResourceInfo({ alarm, resource }),
  //   comparisonOperator: getComparisonOperator({ alarm }),
  //   measuringUnit: measuringUnits[alarm.trigger.type],
  //   alarmLink: cfEvaluatedLinks.cloudwatchAlarm(encodeURIComponent(alarmAwsResourceName)) as unknown as string,
  //   statFunction: getStatFunction({ alarm })
  // };
  return new EventBridgeRule({
    State: 'ENABLED',
    EventPattern: {
      source: ['aws.cloudwatch'],
      'detail-type': ['CloudWatch Alarm State Change'],
      resources: [GetAtt(cfLogicalNames.cloudwatchAlarm(alarm.name), 'Arn')],
      detail: {
        state: {
          value: ['ALARM']
        }
      }
    },
    Targets: [
      {
        InputTransformer: {
          InputPathsMap: {
            alarmName: '$.detail.alarmName',
            description: '$.detail.configuration.description',
            time: '$.time'
          },
          InputTemplate: JSON.stringify(getInputTemplate({ resource, alarm }))
        },
        Arn: GetAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn'),
        Id: 'notification-lambda'
      }
    ]
  });
};
