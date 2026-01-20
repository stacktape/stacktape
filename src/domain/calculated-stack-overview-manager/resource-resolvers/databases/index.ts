import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt, Join, Ref } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { templateManager } from '@domain-services/template-manager';
import { filterResourcesForDevMode } from '../../../../commands/dev/dev-resource-filter';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfEvaluatedLinks } from '@shared/naming/cf-evaluated-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { ExpectedError } from '@utils/errors';
import { resolveAlarmsForResource } from '../_utils/alarms';
import {
  ENGINE_TYPES_REQUIRING_OPTION_GROUP,
  getAuroraDbCluster,
  getAuroraDbClusterParameterGroup,
  getAuroraDbInstance,
  getBasicRdsInstance,
  getDatabaseConnectionString,
  getDatabaseDeletionProtectionCustomResource,
  getDatabaseName,
  getDbInstanceParameterGroup,
  getDbLogGroup,
  getDbOptionGroup,
  getDbSecurityGroup,
  getDbSubnetGroup,
  getJdbcDatabaseConnectionString,
  isAuroraCluster,
  replicaEnabledEngineTypes,
  resolveCloudwatchLogExports,
  resolveDatabasePort,
  validateEngineVersion
} from './utils';

export const resolveDatabases = async () => {
  const databases = filterResourcesForDevMode(configManager.databases);
  databases.forEach((definition) => {
    validateEngineVersion({ resource: definition });
    resolveAlarmsForResource({ resource: definition });

    const { name, nameChain } = definition;
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.dbSubnetGroup(name),
      resource: getDbSubnetGroup({ stpResourceName: name }),
      nameChain
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.dbSecurityGroup(name),
      resource: getDbSecurityGroup({ resource: definition }),
      nameChain
    });
    if (definition.deletionProtection) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.customResourceDatabaseDeletionProtection(name),
        resource: getDatabaseDeletionProtectionCustomResource({ resource: definition }),
        nameChain
      });
    }
    const auroraCluster = isAuroraCluster({ resource: definition });

    // adding main monitoring and logging links
    // for regular rds we also add monitoring and logging links for each replica
    calculatedStackOverviewManager.addStacktapeResourceLink({
      linkName: 'metrics',
      nameChain,
      linkValue: cfEvaluatedLinks.relationalDatabase(
        auroraCluster ? Ref(cfLogicalNames.auroraDbCluster(name)) : Ref(cfLogicalNames.dbInstance(name)),
        auroraCluster,
        'monitoring'
      )
    });
    if (auroraCluster) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.auroraDbCluster(name),
        resource: getAuroraDbCluster({ stpResourceName: name, resource: definition }),
        nameChain
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.auroraDbClusterParameterGroup(name),
        nameChain,
        resource: getAuroraDbClusterParameterGroup({ stpResourceName: name, resource: definition })
      });
      resolveCloudwatchLogExports({ resource: definition }).forEach((logGroupType) => {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.auroraDbClusterLogGroup(name, logGroupType),
          nameChain,
          resource: getDbLogGroup({ resource: definition, logGroupType })
        });
        calculatedStackOverviewManager.addStacktapeResourceLink({
          linkName: `logs-${logGroupType}`,
          linkValue: cfEvaluatedLinks.logGroup(
            awsResourceNames.dbLogGroup(
              awsResourceNames.dbCluster(globalStateManager.targetStack.stackName, name),
              true,
              logGroupType
            )
          ),
          nameChain
        });
        if (definition.logging?.logForwarding) {
          getResourcesNeededForLogForwarding({
            resource: definition,
            logGroupCfLogicalName: cfLogicalNames.auroraDbClusterLogGroup(name, logGroupType),
            logForwardingConfig: definition.logging?.logForwarding
          }).forEach(({ cfLogicalName, cfResource }) => {
            if (!templateManager.getCfResourceFromTemplate(cfLogicalName)) {
              calculatedStackOverviewManager.addCfChildResource({
                nameChain,
                cfLogicalName,
                resource: cfResource
              });
            }
          });
        }
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'host',
        paramValue: GetAtt(cfLogicalNames.auroraDbCluster(name), 'Endpoint.Address'),
        nameChain,
        showDuringPrint: false
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'connectionString',
        paramValue: getDatabaseConnectionString({
          host: GetAtt(cfLogicalNames.auroraDbCluster(name), 'Endpoint.Address'),
          definition
        }),
        nameChain,
        showDuringPrint: false,
        sensitive: true
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'jdbcConnectionString',
        paramValue: getJdbcDatabaseConnectionString({
          host: GetAtt(cfLogicalNames.auroraDbCluster(name), 'Endpoint.Address'),
          definition
        }),
        nameChain,
        showDuringPrint: false,
        sensitive: true
      });
      // if it is provisioned cluster (includes serverless v2)
      if (
        definition.engine.type === 'aurora-mysql' ||
        definition.engine.type === 'aurora-postgresql' ||
        definition.engine.type === 'aurora-mysql-serverless-v2' ||
        definition.engine.type === 'aurora-postgresql-serverless-v2'
      ) {
        if (definition.engine.type === 'aurora-mysql' || definition.engine.type === 'aurora-postgresql') {
          definition.engine.properties.instances.forEach(({ instanceSize }, index) => {
            calculatedStackOverviewManager.addCfChildResource({
              cfLogicalName: cfLogicalNames.auroraDbInstance(name, index),
              resource: getAuroraDbInstance({
                stpResourceName: name,
                resource: definition,
                instanceNum: index,
                instanceSize
              }),
              nameChain
            });
          });
          calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
            nameChain,
            paramName: 'hosts',
            paramValue: Join(
              ',',
              definition.engine.properties.instances.map((_, index) =>
                GetAtt(cfLogicalNames.auroraDbInstance(name, index), 'Endpoint.Address')
              )
            ),

            showDuringPrint: false
          });
        } else if (
          definition.engine.type === 'aurora-mysql-serverless-v2' ||
          definition.engine.type === 'aurora-postgresql-serverless-v2'
        ) {
          calculatedStackOverviewManager.addCfChildResource({
            cfLogicalName: cfLogicalNames.auroraDbInstance(name, 0),
            resource: getAuroraDbInstance({
              stpResourceName: name,
              resource: definition,
              instanceNum: 0,
              instanceSize: 'db.serverless'
            }),
            nameChain
          });
        }
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.auroraDbInstanceParameterGroup(name),
          nameChain,
          resource: getDbInstanceParameterGroup({ stpResourceName: name, resource: definition })
        });
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          paramName: 'readerHost',
          paramValue: GetAtt(cfLogicalNames.auroraDbCluster(name), 'ReadEndpoint.Address'),
          nameChain,
          showDuringPrint: false
        });
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          paramName: 'readerConnectionString',
          paramValue: getDatabaseConnectionString({
            host: GetAtt(cfLogicalNames.auroraDbCluster(name), 'ReadEndpoint.Address'),
            definition
          }),
          nameChain,
          showDuringPrint: false,
          sensitive: true
        });
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          paramName: 'readerPort',
          paramValue: resolveDatabasePort({ definition }),
          nameChain,
          showDuringPrint: false
        });
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          paramName: 'readerJdbcConnectionString',
          paramValue: getJdbcDatabaseConnectionString({
            host: GetAtt(cfLogicalNames.auroraDbCluster(name), 'ReadEndpoint.Address'),
            definition
          }),
          nameChain,
          showDuringPrint: false,
          sensitive: true
        });
      }

      // if it is serverless v1 cluster
      if (
        (definition.engine.type === 'aurora-mysql-serverless' ||
          definition.engine.type === 'aurora-postgresql-serverless') &&
        definition.accessibility?.accessibilityMode === 'internet'
      ) {
        throw new ExpectedError(
          'CONFIG_VALIDATION',
          `Error in configuration of database "${name}". When using serverless engine type "${definition.engine.type}", accessibilityMode cannot be set to ${definition.accessibility?.accessibilityMode} due to AWS limitations.`,
          `Try using one of the following accessibility options: ${(
            ['vpc', 'scoping-workloads-in-vpc'] as StpRelationalDatabase['accessibility']['accessibilityMode'][]
          ).join(', ')}.`
        );
      }
      // non aurora rds
    } else {
      const instanceSize = (definition.engine as RdsEngine).properties.primaryInstance.instanceSize;
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.dbInstance(name),
        resource: getBasicRdsInstance({
          stpResourceName: name,
          resource: definition,
          instanceSize,
          multiAz: (definition.engine as RdsEngine).properties.primaryInstance.multiAz
        }),
        nameChain
      });
      const logExports = resolveCloudwatchLogExports({ resource: definition });
      logExports.forEach((logGroupType) => {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.dbInstanceLogGroup(name, logGroupType),
          nameChain,
          resource: getDbLogGroup({ resource: definition, logGroupType })
        });
        calculatedStackOverviewManager.addStacktapeResourceLink({
          linkName: `logs-${logGroupType}`,
          linkValue: cfEvaluatedLinks.logGroup(
            awsResourceNames.dbLogGroup(
              awsResourceNames.dbInstance(name, globalStateManager.targetStack.stackName),
              false,
              logGroupType
            )
          ),
          nameChain
        });
        if (definition.logging?.logForwarding) {
          getResourcesNeededForLogForwarding({
            resource: definition,
            logGroupCfLogicalName: cfLogicalNames.dbInstanceLogGroup(name, logGroupType),
            logForwardingConfig: definition.logging?.logForwarding
          }).forEach(({ cfLogicalName, cfResource }) => {
            if (!templateManager.getCfResourceFromTemplate(cfLogicalName)) {
              calculatedStackOverviewManager.addCfChildResource({
                nameChain,
                cfLogicalName,
                resource: cfResource
              });
            }
          });
        }
      });

      if (ENGINE_TYPES_REQUIRING_OPTION_GROUP.includes(definition.engine.type)) {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.dbOptionGroup(name),
          nameChain,
          resource: getDbOptionGroup({ resource: definition, instanceSize })
        });
      }
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'host',
        paramValue: GetAtt(cfLogicalNames.dbInstance(name), 'Endpoint.Address'),
        nameChain,
        showDuringPrint: false
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'connectionString',
        paramValue: getDatabaseConnectionString({
          host: GetAtt(cfLogicalNames.dbInstance(name), 'Endpoint.Address'),
          definition
        }),
        nameChain,
        showDuringPrint: false,
        sensitive: true
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'jdbcConnectionString',
        paramValue: getJdbcDatabaseConnectionString({
          host: GetAtt(cfLogicalNames.dbInstance(name), 'Endpoint.Address'),
          definition
        }),
        nameChain,
        showDuringPrint: false,
        sensitive: true
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.dbInstanceParameterGroup(name),
        nameChain,
        resource: getDbInstanceParameterGroup({ stpResourceName: name, resource: definition, instanceSize })
      });
      if ((definition.engine as RdsEngine).properties?.readReplicas?.length) {
        const readReplicaHosts: IntrinsicFunction[] = [];
        if (!replicaEnabledEngineTypes.includes(definition.engine.type)) {
          throw new ExpectedError(
            'CONFIG_VALIDATION',
            `Replicas are only allowed for following engine types: ${replicaEnabledEngineTypes.toString()}`
          );
        }
        (definition.engine as RdsEngine).properties.readReplicas.forEach(
          ({ multiAz, instanceSize: replicaInstanceSize }, index) => {
            // calculatedStackOverviewManager.addCfChildResource({
            //   cfLogicalName: cfLogicalNames.dbReplicaParameterGroup(name, index),
            //   nameChain,
            //   resource: getDbInstanceParameterGroup({ stpResourceName: name, resource: definition })
            // });
            calculatedStackOverviewManager.addCfChildResource({
              cfLogicalName: cfLogicalNames.dbReplica(name, index),
              resource: getBasicRdsInstance({
                stpResourceName: name,
                resource: definition,
                replicaNum: index,
                multiAz,
                instanceSize: replicaInstanceSize
              }),
              nameChain
            });
            logExports.forEach((logGroupType) => {
              calculatedStackOverviewManager.addCfChildResource({
                cfLogicalName: cfLogicalNames.dbReplicaLogGroup(name, logGroupType, index),
                nameChain,
                resource: getDbLogGroup({ resource: definition, logGroupType, readReplicaNum: index })
              });
              calculatedStackOverviewManager.addStacktapeResourceLink({
                linkName: `logs-replica-${index}-${logGroupType}`,
                linkValue: cfEvaluatedLinks.logGroup(
                  awsResourceNames.dbLogGroup(
                    awsResourceNames.dbReplicaInstance(name, globalStateManager.targetStack.stackName, index),
                    false,
                    logGroupType
                  )
                ),
                nameChain
              });
            });
            readReplicaHosts.push(GetAtt(cfLogicalNames.dbReplica(name, index), 'Endpoint.Address'));
            // adding monitoring and log links for replica
            calculatedStackOverviewManager.addStacktapeResourceLink({
              linkName: `metrics-replica-${index}`,
              nameChain,
              linkValue: cfEvaluatedLinks.relationalDatabase(
                Ref(cfLogicalNames.dbReplica(name, index)),
                false,
                'monitoring'
              )
            });
            calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
              paramName: `readReplica${index}Port`,
              paramValue: resolveDatabasePort({ definition }),
              nameChain,
              showDuringPrint: false
            });
          }
        );
        if (readReplicaHosts.length) {
          calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
            paramName: 'readReplicaHosts',
            paramValue: Join(',', readReplicaHosts),
            nameChain,
            showDuringPrint: false
          });
          calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
            paramName: 'readReplicaConnectionStrings',
            paramValue: Join(
              ',',
              readReplicaHosts.map((replicaHost) =>
                getDatabaseConnectionString({
                  host: replicaHost,
                  definition
                })
              )
            ),
            nameChain,
            showDuringPrint: false,
            sensitive: true
          });
          calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
            paramName: 'readReplicaJdbcConnectionStrings',
            paramValue: Join(
              ',',
              readReplicaHosts.map((replicaHost) =>
                getJdbcDatabaseConnectionString({
                  host: replicaHost,
                  definition
                })
              )
            ),
            nameChain,
            showDuringPrint: false,
            sensitive: true
          });
        }
      }
    }
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      paramName: 'port',
      paramValue: resolveDatabasePort({ definition }),
      nameChain,
      showDuringPrint: false
    });
    const dbName = getDatabaseName({ resource: definition });
    if (dbName) {
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'dbName',
        paramValue: dbName,
        nameChain,
        showDuringPrint: false
      });
    }
  });
};
