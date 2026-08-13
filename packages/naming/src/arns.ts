import { awsResourceNames } from './aws-resource-names';

export const arns = {
  lambda({
    accountId,
    stackName,
    stacktapeResourceName,
    region
  }: {
    stacktapeResourceName: string;
    accountId: string;
    stackName: string;
    region: string;
  }) {
    return `arn:aws:lambda:${region}:${accountId}:function:${awsResourceNames.lambda(
      stacktapeResourceName,
      stackName
    )}`;
  },
  lambdaFromFullName({
    accountId,
    region,
    lambdaAwsName
  }: {
    lambdaAwsName: string;
    accountId: string;
    region: string;
  }) {
    return `arn:aws:lambda:${region}:${accountId}:function:${lambdaAwsName}`;
  },
  wildcardContainerService({
    accountId,
    stackName,
    workloadName,
    region
  }: {
    workloadName: string;
    accountId: string;
    stackName: string;
    region: string;
  }) {
    return `arn:aws:ecs:${region}:${accountId}:service/${awsResourceNames.ecsCluster(workloadName, stackName)}*`;
  },
  iamRole({ accountId, roleAwsName }: { accountId: string; roleAwsName: string }) {
    return `arn:aws:iam::${accountId}:role/${roleAwsName}`;
  },
  cloudwatchAlarm({ accountId, region, alarmAwsName }: { alarmAwsName: string; accountId: string; region: string }) {
    return `arn:aws:cloudwatch:${region}:${accountId}:alarm:${alarmAwsName}`;
  },
  sqsQueue({ accountId, region, sqsQueueAwsName }: { sqsQueueAwsName: string; accountId: string; region: string }) {
    return `arn:aws:sqs:${region}:${accountId}:${sqsQueueAwsName}`;
  },
  snsTopic({ accountId, region, snsTopicAwsName }: { snsTopicAwsName: string; accountId: string; region: string }) {
    return `arn:aws:sns:${region}:${accountId}:${snsTopicAwsName}`;
  },
  sesIdentity({ accountId, identity, region }: { accountId: string; identity: string; region: string }) {
    return `arn:aws:ses:${region}:${accountId}:identity/${identity}`;
  },
  sesConfigurationSet({
    accountId,
    configurationSetName,
    region
  }: {
    accountId: string;
    configurationSetName: string;
    region: string;
  }) {
    return `arn:aws:ses:${region}:${accountId}:configuration-set/${configurationSetName}`;
  },
  appsyncApi({ accountId, apiId, region }: { accountId: string; apiId: string; region: string }) {
    return `arn:aws:appsync:${region}:${accountId}:apis/${apiId}`;
  }
};

export const getRoleArnFromSessionArn = (sessionArn: string) => {
  const [prefix, roleName] = sessionArn.split('/');
  const accountId = prefix?.split(':').at(4);
  return `arn:aws:iam::${accountId}:role/${roleName}`;
};
