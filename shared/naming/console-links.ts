import { arns } from './arns';
import { tagNames } from './tag-names';
import { getBaseAwsConsoleLink } from './utils';

export const consoleLinks = {
  stackUrl(region: string, stackId: string, tab: 'stackInfo' | 'resources' | 'events') {
    return getBaseAwsConsoleLink(region, 'cloudformation', `stacks/${tab}?stackId=${encodeURIComponent(stackId)}`);
  },
  changeSetUrl(region: string, stackId: string, changeSetId: string) {
    return getBaseAwsConsoleLink(
      region,
      'cloudformation',
      `stacks/changesets/changes?stackId=${encodeURIComponent(stackId)}&changeSetId=${encodeURIComponent(changeSetId)}`
    );
  },
  secretUrl(region: string, secretName: string) {
    return getBaseAwsConsoleLink(region, 'secretsmanager', `secret?name=${secretName}`);
  },
  createCertificateUrl(attachingTo: StpDomainAttachableResourceType, region: string) {
    if (attachingTo === 'cdn') {
      return 'https://us-east-1.console.aws.amazon.com/acm/home?region=us-east-1#/certificates/request';
    }
    return `https://${region}.console.aws.amazon.com/acm/home?region=${region}#/certificates/request`;
  },
  budgetDailyBreakdownUrl(globallyUniqueStackHash: string) {
    return `https://console.aws.amazon.com/cost-management/home?#/custom?groupBy=Service&excludeRefund=true&chartStyle=Stack&timeRangeOption=Custom&granularity=Daily&isTemplate=true&filter=%5B%7B%22dimension%22:%22TagKeyValue%22,%22values%22:%5B%22${tagNames.globallyUniqueStackHash()}$${globallyUniqueStackHash}%22%5D,%22include%22:true,%22children%22:null%7D%5D&reportType=CostUsage&startDate=2022-01-01&endDate=2022-01-21&excludeDiscounts=true&usageAs=usageQuantity`;
  },
  logGroup(region: string, logGroupName: string) {
    return getBaseAwsConsoleLink(
      region,
      'cloudwatch',
      `logsV2:log-groups/log-group/${encodeURIComponent(encodeURIComponent(logGroupName))}`
    );
  },
  logStream(region: string, logGroupName: string, logStreamName: string) {
    return `${getBaseAwsConsoleLink(
      region,
      'cloudwatch',
      `logsV2:log-groups/log-group/${encodeURIComponent(encodeURIComponent(logGroupName))}`
    )}/log-events/${encodeURIComponent(encodeURIComponent(logStreamName))}`;
  },
  route53HostedZone(shortHostedZoneID: string) {
    return `https://console.aws.amazon.com/route53/v2/hostedzones?#ListRecordSets/${shortHostedZoneID}`;
  },
  createSesIdentity(region: string) {
    return getBaseAwsConsoleLink(region, 'ses', '/verified-identities/create');
  },
  cloudwatchAlarm(region: string, awsAlarmName: string) {
    return getBaseAwsConsoleLink(region, 'cloudwatch', `alarmsV2:alarm/${awsAlarmName}`);
  },
  cloudwatchAlbDashboard(region: string) {
    return getBaseAwsConsoleLink(region, 'cloudwatch', 'home:dashboards/ApplicationELB');
  },
  codebuildDeployment(region: string, awsAccountId: string, codebuildProjectName: string, buildId: string) {
    return `https://${region}.console.aws.amazon.com/codesuite/codebuild/${awsAccountId}/projects/${codebuildProjectName}/build/${buildId}/log?region=${region}`;
  },
  snsTopic(region: string, awsAccountId: string, snsTopicAwsName: string) {
    return getBaseAwsConsoleLink(
      region,
      'sns/v3',
      `/topic/${arns.snsTopic({ region, accountId: awsAccountId, snsTopicAwsName })}`
    );
  },
  eventBus(region: string, eventBusAwsName: string) {
    return getBaseAwsConsoleLink(region, 'events', `/eventbus/${eventBusAwsName}`);
  },
  sqsQueue(region: string, awsAccountId: string, sqsQueueAwsName: string) {
    return getBaseAwsConsoleLink(
      region,
      'sqs/v2',
      `/queues/${encodeURIComponent(`https://sqs.${region}.amazonaws.com/${awsAccountId}/${sqsQueueAwsName}`)}`
    );
  },
  firewallMetrics({ region }: { region: string }) {
    return `https://console.aws.amazon.com/cloudwatch/home?region=${region}#metricsV2:graph=~();namespace=~'AWS*2fWAFV2`;
  },
  s3Object({ bucketName, objectKey }: { bucketName: string; objectKey: string }) {
    return `https://console.aws.amazon.com/s3/object/${bucketName}?prefix=${objectKey}`;
  },
  ecsTask({
    clusterName,
    taskId,
    region,
    selectedContainer
  }: {
    clusterName: string;
    taskId: string;
    region: string;
    selectedContainer: string;
  }) {
    return `https://console.aws.amazon.com/ecs/v2/clusters/${clusterName}/tasks/${taskId}/configuration?region=${region}&selectedContainer=${selectedContainer}`;
  }
};
