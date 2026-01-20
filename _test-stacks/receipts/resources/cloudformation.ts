import type { StacktapeConfig } from '../../../__release-npm';
import { $CfResourceParam, $ResourceParam, $Stage } from '../../../__release-npm';
import { PRODUCTION_STAGE, STAGING_STAGE } from '../env';

const createDefaultEventBusArchive = () => {
  return {
    Type: 'AWS::Events::Archive',
    Properties: {
      ArchiveName: `DefaultBusArchive-${$Stage()}`,
      SourceArn: {
        'Fn::Sub': 'arn:aws:events:${AWS::Region}:${AWS::AccountId}:event-bus/default'
      },
      RetentionDays: 30,
      EventPattern: {
        source: ['aws.s3'],
        'detail-type': ['Object Created']
      }
    }
  };
};

const createCustomReceiptsWafRuleGroup = () => {
  return {
    Type: 'AWS::WAFv2::RuleGroup',
    Properties: {
      Capacity: 50,
      Description: 'Rule group to allow specific User-Agent for codegen',
      Name: 'CustomReceiptsRuleGroup',
      Scope: 'REGIONAL',
      VisibilityConfig: {
        SampledRequestsEnabled: true,
        CloudWatchMetricsEnabled: true,
        MetricName: 'CustomReceiptsRuleGroupMetric'
      },
      Rules: [
        {
          Name: 'AllowCodegenUserAgent',
          Priority: 0,
          Action: {
            Allow: {}
          },
          VisibilityConfig: {
            SampledRequestsEnabled: true,
            CloudWatchMetricsEnabled: true,
            MetricName: 'AllowCodegenUserAgentRule'
          },
          Statement: {
            ByteMatchStatement: {
              SearchString: 'Receipts-GraphQL-Codegen',
              FieldToMatch: {
                SingleHeader: {
                  Name: 'User-Agent'
                }
              },
              TextTransformations: [
                {
                  Priority: 0,
                  Type: 'NONE'
                }
              ],
              PositionalConstraint: 'CONTAINS'
            }
          }
        }
      ]
    }
  };
};

const createActivityWeekChangeEventBridgeSchedulerSchedule = () => {
  return {
    Type: 'AWS::Scheduler::Schedule',
    Properties: {
      Description: 'EventBridge Scheduler Schedule that runs at 12AM every Monday Eastern Time (EST & EDT)',
      FlexibleTimeWindow: {
        Mode: 'OFF'
      },
      Name: 'ActivityWeekLambdaTriggerSchedule',
      ScheduleExpression: 'cron(0 0 ? * Mon *)',
      ScheduleExpressionTimezone: 'America/New_York',
      Target: {
        Arn: $ResourceParam('activityWeekLambda', 'arn'),
        RoleArn: $CfResourceParam('ActivityWeekLambdaRole', 'Arn')
      }
    }
  };
};

const createPersonalOffersJanitorialWorkerSchedule = () => {
  return {
    Type: 'AWS::Scheduler::Schedule',
    Properties: {
      Description: 'Personal Offers Janitorial Worker Schedule that runs at midnight eastern every day',
      FlexibleTimeWindow: {
        Mode: 'OFF'
      },
      Name: 'PersonalOffersJanitorialWorkerEventBridgeSchedule',
      ScheduleExpression: 'cron(0 0 * * ? *)',
      ScheduleExpressionTimezone: 'America/New_York',
      Target: {
        Arn: $ResourceParam('personalOffersJanitorialWorker', 'arn'),
        RoleArn: $CfResourceParam('PersonalOffersJanitorialWorkerRole', 'Arn')
      }
    }
  };
};

export const getCloudFormationResources = (environment: string): StacktapeConfig['cloudformationResources'] => {
  const cloudformationResources: StacktapeConfig['cloudformationResources'] = {};

  switch (environment) {
    case PRODUCTION_STAGE:
      cloudformationResources['DefaultEventBusArchive'] = createDefaultEventBusArchive();
      cloudformationResources['WafCodegenAllowRuleGroup'] = createCustomReceiptsWafRuleGroup();
      cloudformationResources['ActivityWeekChangeEventBridgeScheduler'] =
        createActivityWeekChangeEventBridgeSchedulerSchedule();
      cloudformationResources['PersonalOffersJanitorialWorkerSchedule'] =
        createPersonalOffersJanitorialWorkerSchedule();
      break;
    case STAGING_STAGE:
      cloudformationResources['DefaultEventBusArchive'] = createDefaultEventBusArchive();
      cloudformationResources['WafCodegenAllowRuleGroup'] = createCustomReceiptsWafRuleGroup();
      cloudformationResources['ActivityWeekChangeEventBridgeSchedulerSchedule'] =
        createActivityWeekChangeEventBridgeSchedulerSchedule();
      cloudformationResources['PersonalOffersJanitorialWorkerSchedule'] =
        createPersonalOffersJanitorialWorkerSchedule();
      break;
    case 'dev':
      break;
    default:
      break;
  }

  return cloudformationResources;
};
