import type { CloudFormationCustomResourceEvent } from 'aws-lambda';
import alarmNotificationHandler from './alarm-notifications';
import customResourcesHandler from './custom-resources';
import customTaggingHandler from './custom-tagger';
import ecsServiceScheduledMaintenanceHandler from './ecs-maintenance';
import issueProcessorHandler from './issue-processor';

const handler = async (event, context, callback) => {
  if (isCloudWatchLogsSubscriptionFilterEvent(event)) {
    return issueProcessorHandler(event);
  }
  if (isCloudformationCustomResourceEvent(event)) {
    return customResourcesHandler(event, context, callback);
  }
  if (isCloudwatchAlarmNotificationEvent(event)) {
    return alarmNotificationHandler(event);
  }
  if (isEcsServiceScheduledMaintenanceEvent(event)) {
    return ecsServiceScheduledMaintenanceHandler(event);
  }
  if (isCustomTaggingScheduledEvent(event)) {
    return customTaggingHandler(event);
  }
};

const isCloudformationCustomResourceEvent = (event: CloudFormationCustomResourceEvent) => {
  return event.LogicalResourceId && event.RequestId && event.ResponseURL && event.RequestType && event.StackId;
};

const isCloudwatchAlarmNotificationEvent = (event: AlarmNotificationEventRuleInput) => {
  return event.alarmAwsResourceName && event.alarmConfig && event.stackName;
};

const isEcsServiceScheduledMaintenanceEvent = (event: EcsServiceScheduledMaintenanceRuleInput) => {
  return event.ecsServiceArn && event.asgName;
};

const isCustomTaggingScheduledEvent = (event: CustomTaggingScheduledRuleInput) => {
  return event.tagHostedZoneAttributedToCloudMapNamespace && event.tagNetworkInterfaceWithSecurityGroup;
};

const isCloudWatchLogsSubscriptionFilterEvent = (event: { awslogs?: { data?: string } }) => {
  return event.awslogs?.data;
};

export default handler;
