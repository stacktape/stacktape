import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt, Join, Ref } from '@cloudform/functions';
import { defaultLogRetentionDays } from '@config';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { templateManager } from '@domain-services/template-manager';
import { cfEvaluatedLinks } from '@shared/naming/cf-evaluated-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { resourceReferencableParams } from '@shared/naming/resource-referencable-params';
import { ExpectedError } from '@utils/errors';
import { getResourcesNeededForLogForwarding } from '../_utils/log-forwarding';
import {
  getLogGroupResource,
  getRedisParameterGroupResource,
  getRedisReplicationGroupResource,
  getRedisSecurityGroupResource,
  getRedisSubnetGroupResource
} from './utils';

export const resolveRedisClusters = async () => {
  configManager.redisClusters.forEach((resource) => {
    const isSharded = resource.enableSharding;

    // if cluster has sharding enabled/disabled, then changing the sharding will result in nothing
    // cloudformation simply ignores the change without an error and deployment succeeds
    const existingRedisClusterSharding = deployedStackOverviewManager.getStpResourceReferenceableParameter({
      nameChain: resource.name,
      referencableParamName: resourceReferencableParams.redisSharding()
    });

    if (
      globalStateManager.command === 'deploy' &&
      deployedStackOverviewManager.getStpResource({ nameChain: resource.nameChain }) &&
      existingRedisClusterSharding !== (isSharded ? 'enabled' : 'disabled')
    ) {
      throw new ExpectedError(
        'CONFIG_VALIDATION',
        `Error in ${resource.type} "${resource.name}": Cluster with this name already exists with sharding ${existingRedisClusterSharding}. Cluster sharding can be enabled/disabled only during initial creation.`,
        'To enable or disable sharding, delete the cluster and recreate it.'
      );
    }
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain: resource.nameChain,
      paramName: resourceReferencableParams.redisSharding(),
      paramValue: isSharded ? 'enabled' : 'disabled',
      showDuringPrint: false
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.redisParameterGroup(resource.name),
      nameChain: resource.nameChain,
      resource: getRedisParameterGroupResource({ resource })
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.redisSubnetGroup(resource.name),
      nameChain: resource.nameChain,
      resource: getRedisSubnetGroupResource({ resource })
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.redisSecurityGroup(resource.name),
      nameChain: resource.nameChain,
      resource: getRedisSecurityGroupResource({ resource })
    });
    if (!resource.logging?.disabled) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.redisLogGroup(resource.name),
        nameChain: resource.nameChain,
        resource: getLogGroupResource({
          resource,
          retentionDays: resource.logging?.retentionDays || defaultLogRetentionDays.redisCluster
        })
      });
      if (resource.logging?.logForwarding) {
        getResourcesNeededForLogForwarding({
          resource,
          logGroupCfLogicalName: cfLogicalNames.redisLogGroup(resource.name),
          logForwardingConfig: resource.logging?.logForwarding
        }).forEach(({ cfLogicalName, cfResource }) => {
          if (!templateManager.getCfResourceFromTemplate(cfLogicalName)) {
            calculatedStackOverviewManager.addCfChildResource({
              nameChain: resource.nameChain,
              cfLogicalName,
              resource: cfResource
            });
          }
        });
      }
    }
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.redisReplicationGroup(resource.name),
      nameChain: resource.nameChain,
      resource: getRedisReplicationGroupResource({ resource })
    });
    if (isSharded) {
      // adding monitoring link for each shard
      Array.from({ length: resource.numShards }).forEach((_, shardNumMinusOne) => {
        const shardNumber = shardNumMinusOne + 1;
        calculatedStackOverviewManager.addStacktapeResourceLink({
          linkName: `metrics-shard-${`${shardNumber}`.padStart(4, '0')}`,
          nameChain: resource.nameChain,
          linkValue: cfEvaluatedLinks.redisClusterMonitoring(
            Ref(cfLogicalNames.redisReplicationGroup(resource.name)),
            resource.numReplicaNodes || 0,
            shardNumber
          )
        });
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'host',
        nameChain: resource.nameChain,
        paramValue: GetAtt(cfLogicalNames.redisReplicationGroup(resource.name), 'ConfigurationEndPoint.Address'),
        showDuringPrint: true
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'port',
        nameChain: resource.nameChain,
        paramValue: GetAtt(cfLogicalNames.redisReplicationGroup(resource.name), 'ConfigurationEndPoint.Port'),
        showDuringPrint: true
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'connectionString',
        nameChain: resource.nameChain,
        paramValue: Join('', [
          'rediss://',
          'default',
          ':',
          resource.defaultUserPassword,
          '@',
          GetAtt(cfLogicalNames.redisReplicationGroup(resource.name), 'ConfigurationEndPoint.Address'),
          ':',
          GetAtt(cfLogicalNames.redisReplicationGroup(resource.name), 'ConfigurationEndPoint.Port')
        ]),
        showDuringPrint: true,
        sensitive: true
      });
    } else {
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'host',
        nameChain: resource.nameChain,
        paramValue: GetAtt(cfLogicalNames.redisReplicationGroup(resource.name), 'PrimaryEndPoint.Address'),
        showDuringPrint: true
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'connectionString',
        nameChain: resource.nameChain,
        paramValue: Join('', [
          'rediss://',
          'default',
          ':',
          resource.defaultUserPassword,
          '@',
          GetAtt(cfLogicalNames.redisReplicationGroup(resource.name), 'PrimaryEndPoint.Address'),
          ':',
          GetAtt(cfLogicalNames.redisReplicationGroup(resource.name), 'PrimaryEndPoint.Port')
        ]),
        showDuringPrint: true,
        sensitive: true
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'readerHost',
        nameChain: resource.nameChain,
        paramValue: GetAtt(cfLogicalNames.redisReplicationGroup(resource.name), 'ReaderEndPoint.Address'),
        showDuringPrint: true
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'readerConnectionString',
        nameChain: resource.nameChain,
        paramValue: Join('', [
          'rediss://',
          'default',
          ':',
          resource.defaultUserPassword,
          '@',
          GetAtt(cfLogicalNames.redisReplicationGroup(resource.name), 'ReaderEndPoint.Address'),
          ':',
          GetAtt(cfLogicalNames.redisReplicationGroup(resource.name), 'PrimaryEndPoint.Port')
        ]),
        showDuringPrint: true,
        sensitive: true
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'port',
        nameChain: resource.nameChain,
        paramValue: GetAtt(cfLogicalNames.redisReplicationGroup(resource.name), 'PrimaryEndPoint.Port'),
        showDuringPrint: true
      });

      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'readerPort',
        nameChain: resource.nameChain,
        paramValue: GetAtt(cfLogicalNames.redisReplicationGroup(resource.name), 'ReaderEndPoint.Port'),
        showDuringPrint: true
      });
      // adding link for monitoring
      calculatedStackOverviewManager.addStacktapeResourceLink({
        linkName: 'metrics',
        nameChain: resource.nameChain,
        linkValue: cfEvaluatedLinks.redisClusterMonitoring(
          Ref(cfLogicalNames.redisReplicationGroup(resource.name)),
          resource.numReplicaNodes || 0
        )
      });
    }
  });
};
