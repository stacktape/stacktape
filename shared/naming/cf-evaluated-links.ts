import type { IntrinsicFunction } from '@cloudform/dataTypes';
import { Ref, Sub } from '@cloudform/functions';
import { tagNames } from './tag-names';
import { getBaseCfSubstitutedAwsConsoleLink } from './utils';

export const cfEvaluatedLinks = {
  ecsMonitoring(ecsClusterName: string | IntrinsicFunction, ecsServiceName: string | IntrinsicFunction) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'ecs',
      // eslint-disable-next-line no-template-curly-in-string
      Sub('clusters/${ecsClusterName}/services/${ecsServiceName}/metrics', { ecsServiceName, ecsClusterName })
    );
  },

  stateMachineExecutions(stateMachineArn: string | IntrinsicFunction) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'states',
      // eslint-disable-next-line no-template-curly-in-string
      Sub('statemachines/view/${stateMachineArn}', { stateMachineArn })
    );
  },

  ec2InstancesOfAsg(asgName: string | IntrinsicFunction) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'ec2',
      Sub(`Instances:tag:${tagNames.autoscalingGroupName()}=\${asgName}`, { asgName })
    );
  },

  logGroup(logGroupName: string, region?: string) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'cloudwatch',
      `logsV2:log-groups/log-group/${encodeURIComponent(encodeURIComponent(logGroupName))}`,
      region
    );
  },

  lambda({
    awsLambdaName,
    tab,
    region,
    alias
  }: {
    awsLambdaName: string | IntrinsicFunction;
    tab: string;
    region?: string;
    alias?: string;
  }) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'lambda',
      Sub(`functions/\${awsLambdaName}${alias ? `/aliases/${alias}` : ''}?tab=${tab}`, {
        awsLambdaName
      }),
      region
    );
  },

  loadBalancers({ lbArn, tab }: { lbArn: string | IntrinsicFunction; tab: string }) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'ec2',

      Sub(`LoadBalancer:loadBalancerArn=\${lbArn};tab=${tab}`, { lbArn })
    );
  },

  httpApiGateway({ apiId }: { apiId: string | IntrinsicFunction }) {
    return Sub(
      `https://\${AWS::Region}.console.aws.amazon.com/apigateway/main/api-detail?api=\${apiId}&region=\${AWS::Region}`,
      { apiId }
    );
  },

  efsFilesystem({ filesystemId }: { filesystemId: string | IntrinsicFunction }) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'efs',
      // eslint-disable-next-line no-template-curly-in-string
      Sub('/file-systems/?${filesystemId}?tabId=size', { filesystemId })
    );
  },

  redisClusterMonitoring(
    replicationGroupIdentifier: string | IntrinsicFunction,
    numReplicas: number,
    shardNumber?: number
  ) {
    const numberOfNodesInCluster = numReplicas + 1;
    if (shardNumber) {
      const paddedShardNumber = `${shardNumber}`.padStart(4, '0');
      return getBaseCfSubstitutedAwsConsoleLink(
        'elasticache',
        Sub(
          `redis-cluster-nodes:id=\${replicationGroupIdentifier}-${paddedShardNumber};clusters=${Array.from(
            Array.from({ length: numberOfNodesInCluster }).keys(),
            (clusterNodeNumMinusOne) =>
              `\${replicationGroupIdentifier}-${paddedShardNumber}-${`${clusterNodeNumMinusOne + 1}`.padStart(3, '0')}`
          ).join('!')}`,
          {
            replicationGroupIdentifier
          }
        )
      );
    }
    return getBaseCfSubstitutedAwsConsoleLink(
      'elasticache',
      Sub(
        `redis-group-nodes:id=\${replicationGroupIdentifier};clusters=${Array.from(
          Array.from({ length: numberOfNodesInCluster }).keys(),
          (clusterNodeNumMinusOne) =>
            `\${replicationGroupIdentifier}-${`${clusterNodeNumMinusOne + 1}`.padStart(3, '0')}`
        ).join('!')}`,
        {
          replicationGroupIdentifier
        }
      )
    );
  },

  relationalDatabase(instanceOrClusterIdentifier: string | IntrinsicFunction, isCluster: boolean, tab: string) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'rds',
      Sub(`database:id=\${instanceOrClusterIdentifier};is-cluster=${isCluster};tab=${tab}`, {
        instanceOrClusterIdentifier
      })
    );
  },

  dynamoTable(tableName: string | IntrinsicFunction, tab: string) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'dynamodbv2',
      Sub(`table?name=\${tableName}&tab=${tab}`, {
        tableName
      })
    );
  },

  dynamoItems(tableName: string | IntrinsicFunction) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'dynamodbv2',
      // eslint-disable-next-line no-template-curly-in-string
      Sub('item-explorer?table=${tableName}', {
        tableName
      })
    );
  },

  s3Bucket(bucketName: string | IntrinsicFunction, tab: string) {
    return Sub(`https://console.aws.amazon.com/s3/buckets/\${bucketName}?region=\${region}&tab=${tab}`, {
      region: Ref('AWS::Region'),
      bucketName
    });
  },

  cloudwatchAlarm(alarmName: string | IntrinsicFunction) {
    return getBaseCfSubstitutedAwsConsoleLink('cloudwatch', Sub(`alarmsV2:alarm/\${alarmName}`, { alarmName }));
  },
  firewall({
    region,
    awsWebACLName,
    awsWebACLId
  }: {
    region: string;
    awsWebACLName: string;
    awsWebACLId: IntrinsicFunction;
  }) {
    return Sub(
      `https://us-east-1.console.aws.amazon.com/wafv2/homev2/web-acl/${awsWebACLName}/\${awsWebACLId}/overview?region=${region}`,
      { awsWebACLId }
    );
  }
};
