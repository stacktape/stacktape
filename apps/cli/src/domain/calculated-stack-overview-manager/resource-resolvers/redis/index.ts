import { getAtt, join, ref } from '@stacktape/cloudformation/intrinsics';

import { defaultLogRetentionDays } from '@config';
import { tuiManager } from '@application-services/tui-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { templateManager } from '@domain-services/template-manager';
import { filterResourcesForDevMode } from '@domain-services/config-manager/dev-mode';
import { cfEvaluatedLinks } from '@domain-services/calculated-stack-overview-manager/cloudformation-links';
import type { RedisReferencableParam, StpRedis } from '@domain-services/config-manager/resolved-types/redis';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { resourceReferencableParams } from '@domain-services/config-manager/resource-reference-parameters';
import { ExpectedError } from '@utils/errors';
import { getResourcesNeededForLogForwarding } from '../_utils/log-forwarding';
import {
  getDeployedRedis,
  getLogGroupResource,
  getRedisParameterGroupResource,
  getRedisReplicationGroupResource,
  getRedisSecurityGroupResource,
  getRedisServerlessCacheResource,
  getRedisSubnetGroupResource,
  getRedisUserGroupResource,
  getRedisUserResource,
  isServerlessRedis,
  resolveRedisEngineVersion,
  validateRedisEngineChange,
  type NodeBasedRedisEngine
} from './utils';

export const resolveRedisCaches = async () => {
  const redisCaches = filterResourcesForDevMode(configManager.redisCaches, configManager.deploymentContext);
  redisCaches.forEach((resource) => {
    const deployed = getDeployedRedis(resource);
    validateRedisEngineChange({ resource, deployed });
    const engineVersion = resolveRedisEngineVersion({ resource, deployed });

    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.redisSecurityGroup(resource.name),
      nameChain: resource.nameChain,
      resource: getRedisSecurityGroupResource({ resource })
    });

    if (isServerlessRedis(resource)) {
      resolveServerlessRedis({ resource, majorEngineVersion: engineVersion });
      return;
    }
    if (deployed?.kind === 'node-based' && deployed.engine === 'redis' && resource.engine.type === 'valkey') {
      tuiManager.warn(
        `${resource.type} "${resource.name}" switches from Redis OSS to Valkey ${engineVersion} in place. The update takes about 20 minutes and writes pause for a few seconds during it (longer without replicas). The endpoint and data stay, and the switch cannot be reversed.`
      );
    }
    resolveNodeBasedRedis({
      resource: resource as StpRedis & { engine: NodeBasedRedisEngine },
      engineVersion
    });
  });
};

const resolveServerlessRedis = ({
  resource,
  majorEngineVersion
}: {
  resource: Parameters<typeof getRedisServerlessCacheResource>[0]['resource'];
  majorEngineVersion: string;
}) => {
  const serverlessCacheLogicalName = cfLogicalNames.redisServerlessCache(resource.name);
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.redisUser(resource.name),
    nameChain: resource.nameChain,
    resource: getRedisUserResource({ resource })
  });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.redisUserGroup(resource.name),
    nameChain: resource.nameChain,
    resource: getRedisUserGroupResource({ resource })
  });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: serverlessCacheLogicalName,
    nameChain: resource.nameChain,
    resource: getRedisServerlessCacheResource({ resource, majorEngineVersion })
  });
  addConnectionParams({
    resource,
    host: getAtt(serverlessCacheLogicalName, 'Endpoint.Address'),
    port: getAtt(serverlessCacheLogicalName, 'Endpoint.Port'),
    reader: {
      host: getAtt(serverlessCacheLogicalName, 'ReaderEndpoint.Address'),
      port: getAtt(serverlessCacheLogicalName, 'ReaderEndpoint.Port')
    }
  });
};

const resolveNodeBasedRedis = ({
  resource,
  engineVersion
}: {
  resource: StpRedis & { engine: NodeBasedRedisEngine };
  engineVersion: string;
}) => {
  const { enableSharding: isSharded, numShards, numReplicaNodes, logging } = resource.engine.properties;

  // if cluster has sharding enabled/disabled, then changing the sharding will result in nothing
  // cloudformation simply ignores the change without an error and deployment succeeds
  const existingRedisClusterSharding = deployedStackOverviewManager.getStpResourceReferenceableParameter({
    nameChain: resource.name,
    referencableParamName: resourceReferencableParams.redisSharding()
  });

  if (
    calculatedStackOverviewManager.context.command === 'deploy' &&
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
    resource: getRedisParameterGroupResource({ resource, engineVersion })
  });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.redisSubnetGroup(resource.name),
    nameChain: resource.nameChain,
    resource: getRedisSubnetGroupResource({ resource })
  });
  if (!logging?.disabled) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.redisLogGroup(resource.name),
      nameChain: resource.nameChain,
      resource: getLogGroupResource({
        resource,
        retentionDays: logging?.retentionDays || defaultLogRetentionDays.redis,
        logClass: logging?.logClass
      })
    });
    if (logging?.logForwarding) {
      getResourcesNeededForLogForwarding({
        resource,
        logGroupCfLogicalName: cfLogicalNames.redisLogGroup(resource.name),
        logForwardingConfig: logging?.logForwarding,
        logClass: logging?.logClass
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
  const replicationGroupLogicalName = cfLogicalNames.redisReplicationGroup(resource.name);
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: replicationGroupLogicalName,
    nameChain: resource.nameChain,
    resource: getRedisReplicationGroupResource({ resource, engineVersion })
  });
  if (isSharded) {
    // adding monitoring link for each shard
    Array.from({ length: numShards }).forEach((_, shardNumMinusOne) => {
      const shardNumber = shardNumMinusOne + 1;
      calculatedStackOverviewManager.addStacktapeResourceLink({
        linkName: `metrics-shard-${`${shardNumber}`.padStart(4, '0')}`,
        nameChain: resource.nameChain,
        linkValue: cfEvaluatedLinks.redisClusterMonitoring(
          ref(replicationGroupLogicalName),
          numReplicaNodes || 0,
          shardNumber
        )
      });
    });
    addConnectionParams({
      resource,
      host: getAtt(replicationGroupLogicalName, 'ConfigurationEndPoint.Address'),
      port: getAtt(replicationGroupLogicalName, 'ConfigurationEndPoint.Port')
    });
    return;
  }
  addConnectionParams({
    resource,
    host: getAtt(replicationGroupLogicalName, 'PrimaryEndPoint.Address'),
    port: getAtt(replicationGroupLogicalName, 'PrimaryEndPoint.Port'),
    reader: {
      host: getAtt(replicationGroupLogicalName, 'ReaderEndPoint.Address'),
      port: getAtt(replicationGroupLogicalName, 'ReaderEndPoint.Port'),
      // v3 built the reader connection string with the primary port; both ports are equal on node-based caches.
      connectionStringPort: getAtt(replicationGroupLogicalName, 'PrimaryEndPoint.Port')
    }
  });
  // adding link for monitoring
  calculatedStackOverviewManager.addStacktapeResourceLink({
    linkName: 'metrics',
    nameChain: resource.nameChain,
    linkValue: cfEvaluatedLinks.redisClusterMonitoring(ref(replicationGroupLogicalName), numReplicaNodes || 0)
  });
};

type CfValue = ReturnType<typeof getAtt>;

const getConnectionString = (resource: StpRedis, host: CfValue, port: CfValue) =>
  join('', ['rediss://', 'default', ':', resource.defaultUserPassword, '@', host, ':', port]);

const addConnectionParams = ({
  resource,
  host,
  port,
  reader
}: {
  resource: StpRedis;
  host: CfValue;
  port: CfValue;
  reader?: { host: CfValue; port: CfValue; connectionStringPort?: CfValue };
}) => {
  const params: {
    paramName: RedisReferencableParam;
    paramValue: CfValue | ReturnType<typeof join>;
    sensitive?: boolean;
  }[] = [
    { paramName: 'host', paramValue: host },
    { paramName: 'connectionString', paramValue: getConnectionString(resource, host, port), sensitive: true }
  ];
  if (reader) {
    params.push(
      { paramName: 'readerHost', paramValue: reader.host },
      {
        paramName: 'readerConnectionString',
        paramValue: getConnectionString(resource, reader.host, reader.connectionStringPort || reader.port),
        sensitive: true
      }
    );
  }
  params.push({ paramName: 'port', paramValue: port });
  if (reader) {
    params.push({ paramName: 'readerPort', paramValue: reader.port });
  }
  params.forEach(({ paramName, paramValue, sensitive }) => {
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      paramName,
      nameChain: resource.nameChain,
      paramValue,
      showDuringPrint: true,
      ...(sensitive ? { sensitive: true } : {})
    });
  });
};
