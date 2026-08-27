import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import { ref, sub } from '@stacktape/cloudformation/intrinsics';

import { tagNames } from '@stacktape/naming/tag-names';

const getBaseCfSubstitutedAwsConsoleLink = (serviceName: string, serviceQuery: string | Intrinsic, region?: string) => {
  return sub(`https://\${region}.console.aws.amazon.com/${serviceName}/home?region=\${region}#\${service_query}`, {
    region: region || ref('AWS::Region'),
    service_query: serviceQuery
  });
};

export const cfEvaluatedLinks = {
  appsyncApi(apiId: string | Intrinsic) {
    return getBaseCfSubstitutedAwsConsoleLink('appsync', sub('/v2/apis/${apiId}/home', { apiId }));
  },
  ecsMonitoring(ecsClusterName: string | Intrinsic, ecsServiceName: string | Intrinsic) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'ecs',
      sub('clusters/${ecsClusterName}/services/${ecsServiceName}/metrics', { ecsServiceName, ecsClusterName })
    );
  },

  stateMachineExecutions(stateMachineArn: string | Intrinsic) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'states',
      sub('statemachines/view/${stateMachineArn}', { stateMachineArn })
    );
  },

  ec2InstancesOfAsg(asgName: string | Intrinsic) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'ec2',
      sub(`Instances:tag:${tagNames.autoscalingGroupName()}=\${asgName}`, { asgName })
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
    awsLambdaName: string | Intrinsic;
    tab: string;
    region?: string;
    alias?: string;
  }) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'lambda',
      sub(`functions/\${awsLambdaName}${alias ? `/aliases/${alias}` : ''}?tab=${tab}`, {
        awsLambdaName
      }),
      region
    );
  },

  loadBalancers({ lbArn, tab }: { lbArn: string | Intrinsic; tab: string }) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'ec2',

      sub(`LoadBalancer:loadBalancerArn=\${lbArn};tab=${tab}`, { lbArn })
    );
  },

  httpApiGateway({ apiId }: { apiId: string | Intrinsic }) {
    return sub(
      `https://\${AWS::Region}.console.aws.amazon.com/apigateway/main/api-detail?api=\${apiId}&region=\${AWS::Region}`,
      { apiId }
    );
  },

  efsFilesystem({ filesystemId }: { filesystemId: string | Intrinsic }) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'efs',
      sub('/file-systems/?${filesystemId}?tabId=size', { filesystemId })
    );
  },

  redisClusterMonitoring(replicationGroupIdentifier: string | Intrinsic, numReplicas: number, shardNumber?: number) {
    const numberOfNodesInCluster = numReplicas + 1;
    if (shardNumber) {
      const paddedShardNumber = `${shardNumber}`.padStart(4, '0');
      return getBaseCfSubstitutedAwsConsoleLink(
        'elasticache',
        sub(
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
      sub(
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

  relationalDatabase(instanceOrClusterIdentifier: string | Intrinsic, isCluster: boolean, tab: string) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'rds',
      sub(`database:id=\${instanceOrClusterIdentifier};is-cluster=${isCluster};tab=${tab}`, {
        instanceOrClusterIdentifier
      })
    );
  },

  dynamoTable(tableName: string | Intrinsic, tab: string) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'dynamodbv2',
      sub(`table?name=\${tableName}&tab=${tab}`, {
        tableName
      })
    );
  },

  dynamoItems(tableName: string | Intrinsic) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'dynamodbv2',
      sub('item-explorer?table=${tableName}', {
        tableName
      })
    );
  },

  s3Bucket(bucketName: string | Intrinsic, tab: string) {
    return sub(`https://console.aws.amazon.com/s3/buckets/\${bucketName}?region=\${region}&tab=${tab}`, {
      region: ref('AWS::Region'),
      bucketName
    });
  },

  cloudwatchAlarm(alarmName: string | Intrinsic) {
    return getBaseCfSubstitutedAwsConsoleLink('cloudwatch', sub(`alarmsV2:alarm/\${alarmName}`, { alarmName }));
  },
  syntheticsCanary(canaryName: string | Intrinsic) {
    return getBaseCfSubstitutedAwsConsoleLink(
      'cloudwatch',
      sub('synthetics:canary/detail/${canaryName}', { canaryName })
    );
  },
  firewall({ region, awsWebACLName, awsWebACLId }: { region: string; awsWebACLName: string; awsWebACLId: Intrinsic }) {
    return sub(
      `https://us-east-1.console.aws.amazon.com/wafv2/homev2/web-acl/${awsWebACLName}/\${awsWebACLId}/overview?region=${region}`,
      { awsWebACLId }
    );
  }
};
