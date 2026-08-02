import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import { GetAtt, Ref, Select, Split } from '@cloudform/functions';
import LambdaPermission from '@cloudform/lambda/permission';
import SubscriptionFilter from '@cloudform/logs/subscriptionFilter';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import type { IntrinsicFunction } from '@stacktape/config/cloudformation';
import type { CloudwatchLogIntegration, CloudwatchLogIntegrationProps } from '@stacktape/config/events';
import type { StpIamRoleStatement } from '@stacktape/config/shared';

// @todo - somehow figure out how to check that there are maximum 2 subscriptions per log-group. Keep in mind possible problems with directives.
export const resolveCloudWatchLogEvents = ({
  lambdaFunction
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}): StpIamRoleStatement[] => {
  const { name, cfLogicalName, aliasLogicalName, events, nameChain } = lambdaFunction;
  const lambdaEndpointArn = aliasLogicalName ? Ref(aliasLogicalName) : GetAtt(cfLogicalName, 'Arn');
  (events || []).forEach((event: CloudwatchLogIntegration, index) => {
    if (event.type === 'cloudwatch-log') {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.cloudWatchLogEventSubscriptionFilter(name, index),
        nameChain,
        resource: getSubscriptionFilter({
          lambdaEndpointArn,
          workloadName: name,
          eventDetail: event.properties,
          eventIndex: index
        })
      });

      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.lambdaPermission(name, index),
        nameChain,
        resource: getLogServiceLambdaPermission({ lambdaEndpointArn, logGroupArn: event.properties.logGroupArn })
      });
    }
  });

  return [];
};

const getSubscriptionFilter = ({
  lambdaEndpointArn,
  workloadName,
  eventDetail,
  eventIndex
}: {
  lambdaEndpointArn: string | IntrinsicFunction;
  workloadName: string;
  eventDetail: CloudwatchLogIntegrationProps;
  eventIndex: number;
}) => {
  const resource = new SubscriptionFilter({
    LogGroupName: Select(6, Split(':', eventDetail.logGroupArn)), // eventDetail.logGroupName,
    FilterPattern: eventDetail.filter || '',
    DestinationArn: lambdaEndpointArn
  });
  resource.DependsOn = [cfLogicalNames.lambdaPermission(workloadName, eventIndex)];
  return resource;
};

const getLogServiceLambdaPermission = ({
  lambdaEndpointArn,
  logGroupArn
}: {
  lambdaEndpointArn: string | IntrinsicFunction;
  logGroupArn: string;
}) => {
  return new LambdaPermission({
    Action: 'lambda:InvokeFunction',
    Principal: `logs.${calculatedStackOverviewManager.context.region}.amazonaws.com`,
    FunctionName: lambdaEndpointArn,
    SourceArn: logGroupArn
  });
};
