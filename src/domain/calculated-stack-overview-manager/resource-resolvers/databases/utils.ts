import type { List } from '@cloudform/dataTypes';
import type { Ingress } from '@cloudform/ec2/securityGroup';
import type { OptionConfiguration } from '@cloudform/rds/optionGroup';
import { globalStateManager } from '@application-services/global-state-manager';
import SecurityGroup from '@cloudform/ec2/securityGroup';
import { Ref, Sub } from '@cloudform/functions';
import LogGroup from '@cloudform/logs/logGroup';
import DBCluster from '@cloudform/rds/dbCluster';
import DBClusterParameterGroup from '@cloudform/rds/dbClusterParameterGroup';
import DBInstance from '@cloudform/rds/dbInstance';
import DBInstanceParameterGroup from '@cloudform/rds/dbParameterGroup';
import DBSubnetGroup from '@cloudform/rds/dbSubnetGroup';
import DBOptionGroup from '@cloudform/rds/optionGroup';
import { DeletionPolicy } from '@cloudform/resource';
import { defaultLogRetentionDays } from '@config';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { getConnectToReferencesForResource } from '@domain-services/config-manager/utils/resource-references';
import { templateManager } from '@domain-services/template-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { stpErrors } from '@errors';
import versionJson from '@generated/db-engine-versions/versions.json' with { type: 'json' };
import { normalizeEngineType } from '@shared/aws/rds';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { transformToCidr } from '@shared/utils/misc';
import { isAuroraEngine } from '@shared/utils/rds-engines';
import { ExpectedError } from '@utils/errors';
import { getStpServiceCustomResource } from '../_utils/custom-resource';

const defaultEnginePorts: {
  [_engineType in StpRelationalDatabase['engine']['type']]: number;
} = {
  'aurora-mysql-serverless': 3306,
  'aurora-postgresql-serverless': 5432,
  'aurora-mysql-serverless-v2': 3306,
  'aurora-postgresql-serverless-v2': 5432,
  'aurora-postgresql': 5432,
  'aurora-mysql': 3306,
  mariadb: 3306,
  mysql: 3306,
  'oracle-ee': 1521,
  'oracle-se2': 1521,
  postgres: 5432,
  'sqlserver-ee': 1433,
  'sqlserver-ex': 1433,
  'sqlserver-se': 1433,
  'sqlserver-web': 1433
};

export const resolveDatabasePort = ({ definition }: { definition: StpRelationalDatabase }) => {
  const engineProperties = definition.engine.properties as AuroraEngine['properties'] | RdsEngine['properties'];
  if (engineProperties?.port) {
    return engineProperties.port;
  }
  return defaultEnginePorts[definition.engine.type];
};

export const getDbSubnetGroup = ({ stpResourceName }: { stpResourceName: string }) =>
  new DBSubnetGroup({
    DBSubnetGroupName: awsResourceNames.dbSubnetGroup(globalStateManager.targetStack.stackName, stpResourceName),
    SubnetIds: vpcManager.getPublicSubnetIds(),
    DBSubnetGroupDescription: awsResourceNames.dbSubnetGroup(globalStateManager.targetStack.stackName, stpResourceName)
  });

export const getDbSecurityGroup = ({ resource }: { resource: StpRelationalDatabase }) => {
  const databasePort = resolveDatabasePort({ definition: resource });
  const basicIngressRules: List<Ingress> =
    !resource.accessibility || resource.accessibility.accessibilityMode === 'internet'
      ? [{ CidrIp: '0.0.0.0/0', FromPort: databasePort, ToPort: databasePort, IpProtocol: 'tcp' }]
      : resource.accessibility.accessibilityMode === 'vpc'
        ? [{ CidrIp: vpcManager.getVpcCidr(), FromPort: databasePort, ToPort: databasePort, IpProtocol: 'tcp' }]
        : resource.accessibility.accessibilityMode === 'scoping-workloads-in-vpc'
          ? getConnectToReferencesForResource({ nameChain: resource.nameChain }).map(
              ({ scopingCfLogicalNameOfSecurityGroup }) => ({
                SourceSecurityGroupId: Ref(scopingCfLogicalNameOfSecurityGroup),
                FromPort: databasePort,
                ToPort: databasePort,
                IpProtocol: 'tcp'
              })
            ) || []
          : [];
  return new SecurityGroup({
    VpcId: vpcManager.getVpcId(),
    GroupName: awsResourceNames.dbSecurityGroup(resource.name, globalStateManager.targetStack.stackName),
    GroupDescription: `Stacktape generated security group for database ${resource.name} in stack ${globalStateManager.targetStack.stackName}`,
    SecurityGroupIngress: basicIngressRules.concat(
      resource.accessibility?.whitelistedIps?.map((cidrOrIp) => ({
        CidrIp: transformToCidr({ cidrOrIp }),
        FromPort: databasePort,
        ToPort: databasePort,
        IpProtocol: 'tcp'
      })) || []
    )
  });
};

export const getAuroraDbInstance = ({
  stpResourceName,
  resource,
  instanceNum,
  instanceSize
}: {
  stpResourceName: string;
  resource: StpRelationalDatabase;
  instanceNum: number;
  instanceSize: string;
}) => {
  const instance = new DBInstance({
    DBClusterIdentifier: Ref(cfLogicalNames.auroraDbCluster(stpResourceName)),
    DBInstanceClass: instanceSize,
    PubliclyAccessible: !resource.accessibility?.forceDisablePublicIp,
    DBParameterGroupName: Ref(cfLogicalNames.auroraDbInstanceParameterGroup(stpResourceName)),
    DBInstanceIdentifier: awsResourceNames.auroraDbInstance(
      stpResourceName,
      globalStateManager.targetStack.stackName,
      instanceNum
    ),
    Engine: normalizeEngineType(resource.engine.type),
    AllowMajorVersionUpgrade: true,
    AutoMinorVersionUpgrade: !resource.engine.properties.disableAutoMinorVersionUpgrade
  });
  if (instanceNum > 0) {
    instance.DependsOn = ((instance.DependsOn || []) as string[]).concat(
      cfLogicalNames.auroraDbInstance(stpResourceName, 0)
    );
  }
  return instance;
};

export const getAuroraDbClusterParameterGroup = ({
  stpResourceName,
  resource
}: {
  stpResourceName: string;
  resource: StpRelationalDatabase;
}) => {
  const parameters: DBClusterParameterGroup['Properties']['Parameters'] = {
    ...getLoggingParameters({ resource, addAuroraClusterParams: true })
  };
  return new DBClusterParameterGroup({
    Family: getEngineVersionConfigurationData({
      engineType: resource.engine.type,
      engineVersion: resource.engine.properties?.version,
      instanceType: null
    }).family,
    Description: `${globalStateManager.targetStack.stackName} ${stpResourceName} cluster param group`,
    Parameters: parameters
  });
};

export const getDbMasterUserName = ({ resource }: { resource: StpRelationalDatabase }) =>
  resource?.credentials?.masterUserName || 'db_master_user';

export const getAuroraDbCluster = ({
  stpResourceName,
  resource
}: {
  stpResourceName: string;
  resource: StpRelationalDatabase;
}) => {
  // in case of cluster an engine name can be ending with serverless (denoting serverless instance) we need to clean resource.engine.type
  const logExports = resolveCloudwatchLogExports({ resource });
  const engineType = normalizeEngineType(resource.engine.type);
  const cluster = new DBCluster({
    MasterUsername: getDbMasterUserName({ resource }),
    MasterUserPassword: resource.credentials.masterUserPassword,
    BackupRetentionPeriod: resource.automatedBackupRetentionDays,
    AutoMinorVersionUpgrade: !resource.engine.properties?.disableAutoMinorVersionUpgrade,
    DBSubnetGroupName: Ref(cfLogicalNames.dbSubnetGroup(stpResourceName)),
    DBClusterIdentifier: awsResourceNames.dbCluster(globalStateManager.targetStack.stackName, stpResourceName),
    DBClusterParameterGroupName: Ref(cfLogicalNames.auroraDbClusterParameterGroup(stpResourceName)),
    Engine: engineType,
    DatabaseName: getDatabaseName({ resource }),
    Port:
      resource.engine.type === 'aurora-mysql-serverless' || resource.engine.type === 'aurora-postgresql-serverless'
        ? undefined
        : resolveDatabasePort({ definition: resource }),
    EnableCloudwatchLogsExports:
      resource.engine.type !== 'aurora-mysql-serverless' &&
      resource.engine.type !== 'aurora-postgresql-serverless' &&
      logExports.length
        ? logExports
        : undefined,
    EngineVersion: getEngineVersionForDb({
      engineType: resource.engine.type,
      engineVersion: resource.engine.properties?.version,
      instanceType: null
    }),
    PreferredMaintenanceWindow: getDbBackupAndMaintenanceWindow(resource).preferredMaintenanceWindow,
    PreferredBackupWindow: getDbBackupAndMaintenanceWindow(resource).preferredBackupWindow,
    EngineMode:
      resource.engine.type === 'aurora-mysql-serverless' || resource.engine.type === 'aurora-postgresql-serverless'
        ? 'serverless'
        : 'provisioned',
    ScalingConfiguration:
      resource.engine.type === 'aurora-mysql-serverless' || resource.engine.type === 'aurora-postgresql-serverless'
        ? {
            AutoPause: !!resource.engine.properties?.pauseAfterSeconds,
            MaxCapacity: resource.engine.properties?.maxCapacity || resource.engine.properties?.minCapacity || 4,
            MinCapacity: resource.engine.properties?.minCapacity || 2,
            SecondsUntilAutoPause: resource.engine.properties?.pauseAfterSeconds
          }
        : undefined,
    ServerlessV2ScalingConfiguration:
      resource.engine.type === 'aurora-mysql-serverless-v2' ||
      resource.engine.type === 'aurora-postgresql-serverless-v2'
        ? {
            MinCapacity: resource.engine.properties?.minCapacity || 0,
            MaxCapacity: resource.engine.properties?.maxCapacity || 10
          }
        : undefined,
    VpcSecurityGroupIds: [Ref(cfLogicalNames.dbSecurityGroup(stpResourceName))],
    StorageEncrypted: true
    // DeletionProtection: resource.deletionProtection
  });
  cluster.DependsOn = logExports.map((logGroupType) =>
    cfLogicalNames.auroraDbClusterLogGroup(stpResourceName, logGroupType)
  );
  cluster.DeletionPolicy = DeletionPolicy.Delete;
  return cluster;
};

// const engineVersions: { [engineType in NonServerlessRdbEngine]: string } = {
//   'aurora-postgresql': '13.9',
//   'aurora-mysql': '5.7.mysql_aurora.2.11.3',
//   mariadb: '10.6.13',
//   mysql: '8.0.33',
//   'oracle-ee': '19.0.0.0.ru-2021-01.rur-2021-01.r2',
//   'oracle-se2': '19.0.0.0.ru-2021-01.rur-2021-01.r2',
//   postgres: '16.2',
//   'sqlserver-ee': '15.00.4073.23.v1',
//   'sqlserver-ex': '15.00.4073.23.v1',
//   'sqlserver-se': '15.00.4073.23.v1',
//   'sqlserver-web': '15.00.4073.23.v1'
// };

// @todo: only validated for mysql and postgres
const engineVersionsForT2Instances: { [_engineType in NormalizedSQLEngine]: string } = {
  'aurora-postgresql': '13.9',
  'aurora-mysql': '5.7.mysql_aurora.2.11.3',
  mariadb: '10.6.13',
  mysql: '8.0.33',
  'oracle-ee': '19.0.0.0.ru-2021-01.rur-2021-01.r2',
  'oracle-se2': '19.0.0.0.ru-2021-01.rur-2021-01.r2',
  postgres: '12.15',
  'sqlserver-ee': '15.00.4073.23.v1',
  'sqlserver-ex': '15.00.4073.23.v1',
  'sqlserver-se': '15.00.4073.23.v1',
  'sqlserver-web': '15.00.4073.23.v1'
};

const rdsLogTypes: {
  [_engineType in NormalizedSQLEngine]: { allowedTypes: string[]; defaultTypes: string[] };
} = {
  'aurora-postgresql': { allowedTypes: ['postgresql'], defaultTypes: ['postgresql'] },
  'aurora-mysql': {
    allowedTypes: ['audit', 'error', 'general', 'slowquery'],
    defaultTypes: ['audit', 'error', 'slowquery']
  },
  mariadb: { allowedTypes: ['audit', 'error', 'general', 'slowquery'], defaultTypes: ['audit', 'error', 'slowquery'] },
  mysql: { allowedTypes: ['audit', 'error', 'general', 'slowquery'], defaultTypes: ['audit', 'error', 'slowquery'] },
  'oracle-ee': { allowedTypes: ['alert', 'audit', 'listener', 'trace'], defaultTypes: ['alert', 'listener'] },
  'oracle-se2': { allowedTypes: ['alert', 'audit', 'listener', 'trace'], defaultTypes: ['alert', 'listener'] },
  postgres: { allowedTypes: ['postgresql', 'upgrade'], defaultTypes: ['postgresql'] },
  'sqlserver-ee': { allowedTypes: ['agent', 'error'], defaultTypes: ['agent', 'error'] },
  'sqlserver-ex': { allowedTypes: ['error'], defaultTypes: ['error'] },
  'sqlserver-se': { allowedTypes: ['agent', 'error'], defaultTypes: ['agent', 'error'] },
  'sqlserver-web': { allowedTypes: ['agent', 'error'], defaultTypes: ['agent', 'error'] }
};

export const resolveCloudwatchLogExports = ({ resource }: { resource: StpRelationalDatabase }): string[] => {
  const engineType = normalizeEngineType(resource.engine.type);

  if (resource.logging?.disabled) {
    return [];
  }
  const exportLogs = resource.logging?.logTypes || rdsLogTypes[engineType].defaultTypes;

  const invalidLogType = exportLogs.find((logType) => !rdsLogTypes[engineType].allowedTypes.includes(logType));
  if (invalidLogType) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in ${resource.type} "${resource.name}". Using log type ${invalidLogType} is invalid for the engine ${resource.engine.type}`
    );
  }

  return exportLogs;
};

// readReplicaNum parameter only applicable for rds basic engines. For aurora engines logging is taken care of on cluster level
export const getDbLogGroup = ({
  resource,
  logGroupType,
  readReplicaNum
}: {
  resource: StpRelationalDatabase;
  logGroupType: string;
  readReplicaNum?: number;
}) => {
  const awsDatabaseIdentifier = isAuroraCluster({ resource })
    ? awsResourceNames.dbCluster(globalStateManager.targetStack.stackName, resource.name)
    : readReplicaNum === undefined
      ? awsResourceNames.dbInstance(resource.name, globalStateManager.targetStack.stackName)
      : awsResourceNames.dbReplicaInstance(resource.name, globalStateManager.targetStack.stackName, readReplicaNum);
  return new LogGroup({
    LogGroupName: awsResourceNames.dbLogGroup(awsDatabaseIdentifier, isAuroraCluster({ resource }), logGroupType),
    RetentionInDays: resource.logging?.retentionDays || defaultLogRetentionDays.relationalDatabase
  });
};

export const getDbInstanceParameterGroup = ({
  stpResourceName,
  resource,
  replicaNum,
  instanceSize
}: {
  stpResourceName: string;
  resource: StpRelationalDatabase;
  replicaNum?: number;
  instanceSize?: string;
}) => {
  const parameters: DBInstanceParameterGroup['Properties']['Parameters'] = {
    // for aurora instances logging parameters are set on cluster level
    ...getLoggingParameters({ resource, addAuroraClusterParams: false })
  };
  return new DBInstanceParameterGroup({
    Description: `${globalStateManager.targetStack.stackName} ${stpResourceName} param group${
      replicaNum !== undefined ? ` rep ${replicaNum}` : ''
    }`,
    Family: getEngineVersionConfigurationData({
      engineType: resource.engine.type,
      engineVersion: resource.engine.properties?.version,
      instanceType: instanceSize
    }).family,
    Parameters: Object.keys(parameters).length ? parameters : undefined
  });
};

const getEngineVersionForDb = ({
  engineType,
  engineVersion,
  instanceType
}: {
  engineVersion?: string;
  engineType: StpRelationalDatabase['engine']['type'];
  instanceType: string;
}) => {
  if (engineVersion) {
    return engineVersion;
  }
  if (instanceType?.split('.')[1] === 't2') {
    return engineVersionsForT2Instances[normalizeEngineType(engineType)];
  }
  return versionJson.rds[engineType]?.[0];
};

const getLoggingParameters = ({
  resource,
  addAuroraClusterParams
}: {
  resource: StpRelationalDatabase;
  addAuroraClusterParams: boolean;
}): DBInstanceParameterGroup['Properties']['Parameters'] => {
  // let parameters: DBInstanceParameterGroup['Properties']['Parameters'] = {};
  const logExports = resolveCloudwatchLogExports({ resource });
  // normalizing engine type means that serverless is removed from aurora serverless engines
  const normalizedEngineType = normalizeEngineType(resource.engine.type);
  if (normalizedEngineType === 'aurora-postgresql' || normalizedEngineType === 'postgres') {
    const useNewLogging = resource.engine.type === 'postgres' && resource.engine.properties?.version?.startsWith('18');
    return {
      // @todo Postgres 18 requires different value for log_connections parameter, not 1 and 0, but anything from: receipt, authentication, authorization, setup_durations, all
      log_connections: useNewLogging
        ? ((resource.logging?.engineSpecificOptions as PostgresLoggingOptions)?.log_connections ?? 'all')
        : (resource.logging?.engineSpecificOptions as PostgresLoggingOptions)?.log_connections
          ? '1'
          : '0',
      log_disconnections: (resource.logging?.engineSpecificOptions as PostgresLoggingOptions)?.log_disconnections
        ? '1'
        : '0',
      log_lock_waits: (resource.logging?.engineSpecificOptions as PostgresLoggingOptions)?.log_lock_waits ? '1' : '0',
      log_min_duration_statement:
        (resource.logging?.engineSpecificOptions as PostgresLoggingOptions)?.log_min_duration_statement === undefined
          ? '10000'
          : `${(resource.logging.engineSpecificOptions as PostgresLoggingOptions).log_min_duration_statement}`,
      log_statement:
        (resource.logging?.engineSpecificOptions as PostgresLoggingOptions)?.log_statement === undefined
          ? 'ddl'
          : (resource.logging.engineSpecificOptions as PostgresLoggingOptions).log_statement,
      ...(normalizedEngineType === 'aurora-postgresql' && addAuroraClusterParams
        ? { 'rds.force_autovacuum_logging_level': 'warning', log_autovacuum_min_duration: '3000' }
        : {})
    };
  }
  if (
    normalizedEngineType === 'aurora-mysql' ||
    normalizedEngineType === 'mysql' ||
    normalizedEngineType === 'mariadb'
  ) {
    return {
      log_output: 'FILE',
      general_log: logExports.includes('general') ? '1' : '0',
      slow_query_log:
        (resource.logging?.engineSpecificOptions as MysqlLoggingOptions)?.long_query_time === -1 ||
        !logExports.includes('slowquery')
          ? '0'
          : '1',
      long_query_time:
        (resource.logging?.engineSpecificOptions as MysqlLoggingOptions)?.long_query_time === undefined
          ? '10'
          : `${(resource.logging.engineSpecificOptions as MysqlLoggingOptions).long_query_time}`,
      ...(normalizedEngineType === 'aurora-mysql' && addAuroraClusterParams
        ? {
            server_audit_logging: logExports.includes('audit') ? '1' : '0',
            server_audit_logs_upload: logExports.includes('audit') ? '1' : '0',
            server_audit_events: (
              (resource.logging?.engineSpecificOptions as MysqlLoggingOptions)?.server_audit_events || ['QUERY_DDL']
            ).join(',')
          }
        : {})
    };
  }
  return {};
};

const getEngineVersionConfigurationData = ({
  engineType,
  engineVersion,
  instanceType
}: {
  engineVersion?: string;
  engineType: StpRelationalDatabase['engine']['type'];
  instanceType: string;
}) => {
  const data = engineVersionConfigurationData.find(
    ({ family, majorVersion }) =>
      family.startsWith(normalizeEngineType(engineType)) &&
      getEngineVersionForDb({
        engineType,
        engineVersion,
        instanceType
      }).startsWith(majorVersion)
  );
  if (!data) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Cannot find parameter group family for database engine "${engineType}" and version "${getEngineVersionForDb({
        engineType,
        engineVersion,
        instanceType
      })}"`
    );
  }
  return data;
};

const engineVersionConfigurationData = [
  { family: 'aurora-mysql5.7', majorVersion: '5.7' },
  { family: 'aurora-mysql8.0', majorVersion: '8.0' },
  { family: 'aurora-postgresql10', majorVersion: '10' },
  { family: 'aurora-postgresql11', majorVersion: '11' },
  { family: 'aurora-postgresql12', majorVersion: '12' },
  { family: 'aurora-postgresql13', majorVersion: '13' },
  { family: 'aurora-postgresql14', majorVersion: '14' },
  { family: 'aurora-postgresql15', majorVersion: '15' },
  { family: 'aurora-postgresql16', majorVersion: '16' },
  { family: 'mariadb10.2', majorVersion: '10.2' },
  { family: 'mariadb10.3', majorVersion: '10.3' },
  { family: 'mariadb10.4', majorVersion: '10.4' },
  { family: 'mariadb10.5', majorVersion: '10.5' },
  { family: 'mariadb10.6', majorVersion: '10.6' },
  { family: 'mysql5.6', majorVersion: '5.6' },
  { family: 'mysql5.7', majorVersion: '5.7' },
  { family: 'mysql8.0', majorVersion: '8.0' },
  { family: 'mysql8.4', majorVersion: '8.4' },
  { family: 'oracle-ee-19', majorVersion: '19' },
  { family: 'oracle-ee-21', majorVersion: '21' },
  { family: 'oracle-se2-19', majorVersion: '19' },
  { family: 'oracle-se2-21', majorVersion: '21' },
  { family: 'postgres10', majorVersion: '10' },
  { family: 'postgres11', majorVersion: '11' },
  { family: 'postgres12', majorVersion: '12' },
  { family: 'postgres13', majorVersion: '13' },
  { family: 'postgres14', majorVersion: '14' },
  { family: 'postgres15', majorVersion: '15' },
  { family: 'postgres16', majorVersion: '16' },
  { family: 'postgres17', majorVersion: '17' },
  { family: 'postgres18', majorVersion: '18' },
  { family: 'sqlserver-ee-11.0', majorVersion: '11.00' },
  { family: 'sqlserver-ee-12.0', majorVersion: '12.00' },
  { family: 'sqlserver-ee-13.0', majorVersion: '13.00' },
  { family: 'sqlserver-ee-14.0', majorVersion: '14.00' },
  { family: 'sqlserver-ee-15.0', majorVersion: '15.00' },
  { family: 'sqlserver-ee-16.0', majorVersion: '16.00' },
  { family: 'sqlserver-ex-11.0', majorVersion: '11.00' },
  { family: 'sqlserver-ex-12.0', majorVersion: '12.00' },
  { family: 'sqlserver-ex-13.0', majorVersion: '13.00' },
  { family: 'sqlserver-ex-14.0', majorVersion: '14.00' },
  { family: 'sqlserver-ex-15.0', majorVersion: '15.00' },
  { family: 'sqlserver-ex-16.0', majorVersion: '16.00' },
  { family: 'sqlserver-se-11.0', majorVersion: '11.00' },
  { family: 'sqlserver-se-12.0', majorVersion: '12.00' },
  { family: 'sqlserver-se-13.0', majorVersion: '13.00' },
  { family: 'sqlserver-se-14.0', majorVersion: '14.00' },
  { family: 'sqlserver-se-15.0', majorVersion: '15.00' },
  { family: 'sqlserver-se-16.0', majorVersion: '16.00' },
  { family: 'sqlserver-web-11.0', majorVersion: '11.00' },
  { family: 'sqlserver-web-12.0', majorVersion: '12.00' },
  { family: 'sqlserver-web-13.0', majorVersion: '13.00' },
  { family: 'sqlserver-web-14.0', majorVersion: '14.00' },
  { family: 'sqlserver-web-15.0', majorVersion: '15.00' },
  { family: 'sqlserver-web-16.0', majorVersion: '16.00' }
];

export const replicaEnabledEngineTypes = ['mariadb', 'mysql', 'oracle-ee', 'postgres', 'sqlserver-ee'];

export const getBasicRdsInstance = ({
  stpResourceName,
  resource,
  replicaNum,
  instanceSize,
  multiAz
}: {
  stpResourceName: string;
  resource: StpRelationalDatabase;
  replicaNum?: number;
  instanceSize: string;
  multiAz: boolean;
}) => {
  const logExports = resolveCloudwatchLogExports({ resource });
  const instance = new DBInstance({
    DBInstanceClass: instanceSize,
    DBInstanceIdentifier:
      replicaNum === undefined
        ? awsResourceNames.dbInstance(stpResourceName, globalStateManager.targetStack.stackName)
        : awsResourceNames.dbReplicaInstance(stpResourceName, globalStateManager.targetStack.stackName, replicaNum),
    MultiAZ: multiAz,
    AutoMinorVersionUpgrade: !resource.engine.properties.disableAutoMinorVersionUpgrade,
    DBName: replicaNum === undefined ? getDatabaseName({ resource }) : undefined,
    Engine: replicaNum === undefined ? resource.engine.type : undefined,
    EngineVersion:
      replicaNum === undefined
        ? getEngineVersionForDb({
            engineType: resource.engine.type,
            engineVersion: resource.engine.properties?.version,
            instanceType: instanceSize
          })
        : undefined,
    EnableCloudwatchLogsExports: logExports.length ? logExports : undefined,
    DBParameterGroupName: Ref(cfLogicalNames.dbInstanceParameterGroup(stpResourceName)),
    LicenseModel:
      resource.engine.type === 'oracle-ee' || resource.engine.type === 'oracle-se2' ? 'license-included' : undefined,
    Port: `${resolveDatabasePort({ definition: resource })}`,
    BackupRetentionPeriod: replicaNum === undefined ? resource.automatedBackupRetentionDays : undefined,
    MasterUsername: replicaNum === undefined ? getDbMasterUserName({ resource }) : undefined,
    MasterUserPassword: replicaNum === undefined ? resource.credentials.masterUserPassword : undefined,
    AllocatedStorage: `${(resource.engine.properties as RdsEngine['properties']).storage?.initialSize || 20}`,
    MaxAllocatedStorage: (resource.engine.properties as RdsEngine['properties']).storage?.maxSize || 200,
    PubliclyAccessible: !resource.accessibility?.forceDisablePublicIp,
    DBSubnetGroupName: replicaNum === undefined ? Ref(cfLogicalNames.dbSubnetGroup(stpResourceName)) : undefined,
    VPCSecurityGroups: [Ref(cfLogicalNames.dbSecurityGroup(stpResourceName))],
    SourceDBInstanceIdentifier: replicaNum !== undefined ? Ref(cfLogicalNames.dbInstance(stpResourceName)) : undefined,
    AllowMajorVersionUpgrade: true,
    OptionGroupName: ENGINE_TYPES_REQUIRING_OPTION_GROUP.includes(resource.engine.type)
      ? Ref(cfLogicalNames.dbOptionGroup(stpResourceName))
      : undefined,
    // DeletionProtection: resource.deletionProtection,
    StorageType: 'gp3',
    PreferredMaintenanceWindow: getDbBackupAndMaintenanceWindow(resource).preferredMaintenanceWindow,
    PreferredBackupWindow: getDbBackupAndMaintenanceWindow(resource).preferredBackupWindow,
    StorageEncrypted: !(
      resource.engine.type === 'sqlserver-ex' ||
      encryptionUnsupportedInstanceSizes.includes(
        (resource.engine.properties as RdsEngine['properties'])?.primaryInstance?.instanceSize
      ) ||
      (resource.engine.properties as RdsEngine['properties'])?.readReplicas?.some(({ instanceSize: repInstanceSize }) =>
        encryptionUnsupportedInstanceSizes.includes(repInstanceSize)
      )
    ) // encryption is not available for sqlserver express https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
  });
  instance.DependsOn = logExports.map((logGroupType) =>
    replicaNum === undefined
      ? cfLogicalNames.dbInstanceLogGroup(stpResourceName, logGroupType)
      : cfLogicalNames.dbReplicaLogGroup(stpResourceName, logGroupType, replicaNum)
  );
  instance.DeletionPolicy = DeletionPolicy.Delete;
  return instance;
};

const ENGINE_TYPES_REQUIRING_MARIA_DB_AUDIT_PLUGIN: StpRelationalDatabase['engine']['type'][] = ['mariadb', 'mysql'];
export const ENGINE_TYPES_REQUIRING_OPTION_GROUP = ENGINE_TYPES_REQUIRING_MARIA_DB_AUDIT_PLUGIN;

export const getDbOptionGroup = ({
  resource,
  instanceSize
}: {
  resource: StpRelationalDatabase;
  instanceSize: string;
}) => {
  const optionConfigurations: OptionConfiguration[] = [];

  if (ENGINE_TYPES_REQUIRING_MARIA_DB_AUDIT_PLUGIN.includes(resource.engine.type)) {
    optionConfigurations.push({
      OptionName: 'MARIADB_AUDIT_PLUGIN',
      OptionSettings: [
        {
          Name: 'SERVER_AUDIT_EVENTS',
          Value: (
            (resource.logging?.engineSpecificOptions as MysqlLoggingOptions)?.server_audit_events || ['QUERY_DDL']
          ).join(',')
        }
      ]
    });
  }
  return new DBOptionGroup({
    EngineName: resource.engine.type,
    MajorEngineVersion: getEngineVersionConfigurationData({
      engineType: resource.engine.type,
      engineVersion: resource.engine.properties?.version,
      instanceType: instanceSize
    }).majorVersion,
    OptionGroupDescription: `${globalStateManager.targetStack.stackName} ${resource.name} option group`,
    OptionConfigurations: optionConfigurations
  });
};

const connectionStringProtocol: { [_key in StpRelationalDatabase['engine']['type']]: { basic: string; jdbc: string } } =
  {
    'aurora-mysql': { basic: 'mysql://', jdbc: 'jdbc:mysql://' },
    'aurora-mysql-serverless': { basic: 'mysql://', jdbc: 'jdbc:mysql://' },
    'aurora-mysql-serverless-v2': { basic: 'mysql://', jdbc: 'jdbc:mysql://' },
    'aurora-postgresql': { basic: 'postgresql://', jdbc: 'jdbc:postgresql://' },
    'aurora-postgresql-serverless': { basic: 'postgresql://', jdbc: 'jdbc:postgresql://' },
    'aurora-postgresql-serverless-v2': { basic: 'postgresql://', jdbc: 'jdbc:postgresql://' },
    mysql: { basic: 'mysql://', jdbc: 'jdbc:mysql://' },
    postgres: { basic: 'postgresql://', jdbc: 'jdbc:postgresql://' },
    'oracle-ee': { basic: '', jdbc: 'jdbc:oracle:thin:' },
    'oracle-se2': { basic: '', jdbc: 'jdbc:oracle:thin:' },
    mariadb: { basic: 'mariadb://', jdbc: 'jdbc:mariadb://' },
    'sqlserver-ee': { basic: 'sqlserver://', jdbc: 'jdbc:sqlserver://' },
    'sqlserver-ex': { basic: 'sqlserver://', jdbc: 'jdbc:sqlserver://' },
    'sqlserver-se': { basic: 'sqlserver://', jdbc: 'jdbc:sqlserver://' },
    'sqlserver-web': { basic: 'sqlserver://', jdbc: 'jdbc:sqlserver://' }
  };

export const getDatabaseConnectionString = ({
  host,
  definition
}: {
  host: IntrinsicFunction | string;
  definition: StpRelationalDatabase;
}): IntrinsicFunction => {
  const databaseName = getDatabaseName({ resource: definition });

  if (
    definition.engine.type === 'sqlserver-ee' ||
    definition.engine.type === 'sqlserver-ex' ||
    definition.engine.type === 'sqlserver-web' ||
    definition.engine.type === 'sqlserver-se'
  ) {
    return Sub(
      `${
        connectionStringProtocol[definition.engine.type].basic
      }\${host}:\${port};user=\${username};password=\${password}`,
      {
        host,
        username: getDbMasterUserName({ resource: definition }),
        password: definition.credentials.masterUserPassword,
        port: resolveDatabasePort({ definition }),
        databaseName
      }
    );
  }

  if (databaseName) {
    return Sub(
      `${connectionStringProtocol[definition.engine.type].basic}\${username}:\${password}@\${host}:\${port}/${
        databaseName ? `\${databaseName}` : ''
      }`,
      {
        host,
        username: getDbMasterUserName({ resource: definition }),
        password: definition.credentials.masterUserPassword,
        port: resolveDatabasePort({ definition }),
        databaseName
      }
    );
  }
  return Sub(`${connectionStringProtocol[definition.engine.type].basic}\${username}:\${password}@\${host}:\${port}`, {
    host,
    username: getDbMasterUserName({ resource: definition }),
    password: definition.credentials.masterUserPassword,
    port: resolveDatabasePort({ definition })
  });
};

export const getJdbcDatabaseConnectionString = ({
  host,
  definition
}: {
  host: IntrinsicFunction | string;
  definition: StpRelationalDatabase;
}): IntrinsicFunction => {
  const databaseName = getDatabaseName({ resource: definition });
  if (
    definition.engine.type === 'sqlserver-ee' ||
    definition.engine.type === 'sqlserver-ex' ||
    definition.engine.type === 'sqlserver-web' ||
    definition.engine.type === 'sqlserver-se'
  ) {
    return Sub(
      `${
        connectionStringProtocol[definition.engine.type].jdbc
      }\${host}:\${port};user=\${username};password=\${password}`,
      {
        host,
        username: getDbMasterUserName({ resource: definition }),
        password: definition.credentials.masterUserPassword,
        port: resolveDatabasePort({ definition })
      }
    );
  }

  if (definition.engine.type === 'oracle-ee' || definition.engine.type === 'oracle-se2') {
    return Sub(
      `${
        connectionStringProtocol[definition.engine.type].jdbc
      }\${username}/\${password}@\${host}:\${port}:\${databaseName}`,
      {
        host,
        username: getDbMasterUserName({ resource: definition }),
        password: definition.credentials.masterUserPassword,
        port: resolveDatabasePort({ definition }),
        databaseName
      }
    );
  }
  return Sub(
    `${
      connectionStringProtocol[definition.engine.type].jdbc
    }\${host}:\${port}/\${databaseName}?user=\${username}&password=\${password}`,
    {
      host,
      username: getDbMasterUserName({ resource: definition }),
      password: definition.credentials.masterUserPassword,
      port: resolveDatabasePort({ definition }),
      databaseName
    }
  );
};

export const getDatabaseName = ({ resource }: { resource: StpRelationalDatabase }) => {
  if (
    resource.engine.type === 'sqlserver-ee' ||
    resource.engine.type === 'sqlserver-ex' ||
    resource.engine.type === 'sqlserver-web' ||
    resource.engine.type === 'sqlserver-se'
  ) {
    if (resource.engine.properties?.dbName) {
      throw new ExpectedError(
        'CONFIG_VALIDATION',
        `Error in resource "${resource.name}". You cannot specify "dbName" when using engine type ${resource.engine.type}`
      );
    }
    return undefined;
  }
  if (
    resource.engine.type === 'oracle-ee' ||
    (resource.engine.type === 'oracle-se2' &&
      resource.engine.properties?.dbName &&
      resource.engine.properties.dbName.length > 8)
  ) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in resource "${resource.name}". Parameter "dbName" cannot be longer than 8 characters when using engine ${resource.engine.type}`
    );
  }
  return resource.engine.properties?.dbName || 'defdb';
};

export const isAuroraCluster = ({ resource }: { resource: StpRelationalDatabase }) =>
  isAuroraEngine(resource.engine.type);

export const isAuroraServerlessCluster = ({ resource }: { resource: StpRelationalDatabase }) =>
  resource.engine.type === 'aurora-mysql-serverless' ||
  resource.engine.type === 'aurora-postgresql-serverless' ||
  resource.engine.type === 'aurora-mysql-serverless-v2' ||
  resource.engine.type === 'aurora-postgresql-serverless-v2';

const encryptionUnsupportedInstanceSizes = [
  'db.m1.small',
  'db.m1.medium',
  'db.m1.large',
  'db.m1.xlarge',
  'db.m2.xlarge',
  'db.m2.2xlarge',
  'db.m2.4xlarge',
  'db.t2.micro'
];

export const getDatabaseDeletionProtectionCustomResource = ({
  resource: { engine, name }
}: {
  resource: StpRelationalDatabase;
}) => {
  return getStpServiceCustomResource<'setDatabaseDeletionProtection'>({
    setDatabaseDeletionProtection: {
      ...(isAuroraEngine(engine.type)
        ? { clusterId: Ref(cfLogicalNames.auroraDbCluster(name)) as unknown as string }
        : { instanceId: Ref(cfLogicalNames.dbInstance(name)) as unknown as string })
    }
  });
};

export const validateEngineVersion = ({ resource }: { resource: StpRelationalDatabase }) => {
  const availableVersions = versionJson.rds[resource.engine.type];
  const logicalNameOfExistingResource = resource.engine.type.startsWith('aurora')
    ? cfLogicalNames.auroraDbCluster(resource.name)
    : cfLogicalNames.dbInstance(resource.name);
  let currentDatabaseVersion: string;

  stackManager.existingStackResources?.some(({ LogicalResourceId, auroraClusterDetail, rdsInstanceDetail }) => {
    const foundResource = LogicalResourceId === logicalNameOfExistingResource;
    if (foundResource) {
      currentDatabaseVersion = (resource.engine.type.startsWith('aurora') ? auroraClusterDetail : rdsInstanceDetail)
        .EngineVersion;
    }
    return foundResource;
  });

  if (resource.engine?.type === 'aurora-mysql-serverless' || resource.engine?.type === 'aurora-postgresql-serverless') {
    return;
  }

  if (!resource.engine?.properties?.version) {
    throw stpErrors.e110({
      databaseStpResourceName: resource.name,
      availableVersions,
      currentDatabaseVersion
    });
  }

  if (
    resource.engine?.properties?.version !==
      templateManager.oldTemplate?.Resources?.[logicalNameOfExistingResource]?.Properties?.EngineVersion &&
    !availableVersions.includes(resource.engine?.properties?.version)
  ) {
    throw stpErrors.e111({
      databaseStpResourceName: resource.name,
      availableVersions,
      chosenDatabaseVersion: resource.engine?.properties?.version
    });
  }
};

const getPreferredMaintenanceWindow = (awsRegion: string): string => {
  // Map of AWS regions to their representative fixed UTC offsets (in hours).
  // IMPORTANT: This is a simplification and does NOT account for Daylight Saving Time (DST).
  // The offset used is typically for the region's standard time.
  const regionOffsets: { [key: string]: number } = {
    'us-east-1': -5, // Approx. EST (UTC-5)
    'us-east-2': -5, // Approx. EST (UTC-5)
    'us-west-1': -8, // Approx. PST (UTC-8)
    'us-west-2': -8, // Approx. PST (UTC-8)
    'ca-central-1': -5, // Approx. EST (UTC-5)
    'eu-west-1': 0, // Approx. GMT/WET (UTC+0)
    'eu-west-2': 0, // Approx. GMT (UTC+0)
    'eu-west-3': 1, // Approx. CET (UTC+1)
    'eu-central-1': 1, // Approx. CET (UTC+1)
    'eu-north-1': 2, // Approx. EET (UTC+2)
    'ap-south-1': 5.5, // IST (UTC+5:30)
    'ap-northeast-1': 9, // JST (UTC+9)
    'ap-northeast-2': 9, // KST (UTC+9)
    'ap-northeast-3': 9, // JST (UTC+9)
    'ap-southeast-1': 8, // SGT (UTC+8)
    'ap-southeast-2': 10, // AEST (UTC+10)
    'ap-southeast-3': 7, // WIB (UTC+7)
    'ap-east-1': 8, // HKT (UTC+8)
    'sa-east-1': -3, // BRT (UTC-3)
    'af-south-1': 2, // SAST (UTC+2)
    'me-south-1': 3 // GST (UTC+3) // Bahrain
    // Add more regions and their typical standard offsets as needed.
  };

  const defaultOffset = 0; // Default to UTC if region not in map or for regions like eu-west-1 (Ireland/GMT)

  const offsetHours = regionOffsets[awsRegion] !== undefined ? regionOffsets[awsRegion] : defaultOffset;

  // We aim for Sunday 02:00-04:00 local time.
  // Use a reference date that is a Sunday in UTC. The specific date doesn't matter, only day of week and time.
  // January 7, 2024, was a Sunday.
  const referenceUTCSunday = new Date(Date.UTC(2024, 0, 7, 0, 0, 0)); // Jan 7, 2024, 00:00:00 UTC

  // Create start date object representing Sunday 02:00 "local time" conceptually
  const localStartDate = new Date(referenceUTCSunday);
  localStartDate.setUTCHours(2); // Set to 02:00 on our reference Sunday

  // Adjust to actual UTC by subtracting the offset.
  // Example: If local is 02:00 and offset is -5 (EST), UTC is 02:00 - (-5) = 07:00 UTC.
  // Example: If local is 02:00 and offset is +1 (CET), UTC is 02:00 - (+1) = 01:00 UTC.
  const utcStartDate = new Date(localStartDate.getTime() - offsetHours * 60 * 60 * 1000);

  // Create end date object representing Sunday 04:00 "local time"
  const localEndDate = new Date(referenceUTCSunday);
  localEndDate.setUTCHours(4); // Set to 04:00 on our reference Sunday

  const utcEndDate = new Date(localEndDate.getTime() - offsetHours * 60 * 60 * 1000);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const formatTimePart = (date: Date): string => {
    const day = daysOfWeek[date.getUTCDay()];
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0'); // Should be "00"
    return `${day}:${hours}:${minutes}`;
  };

  return `${formatTimePart(utcStartDate)}-${formatTimePart(utcEndDate)}`;
};

const getNextDateForDayAndTime = (dayTimeStringRange: string): Date => {
  // Assuming dayTimeStringRange is validated (e.g., "Sun:02:00-Sun:04:00")
  // We only care about the start of the range for finding the next occurrence.
  const startTimeString = dayTimeStringRange.split('-')[0];

  const daysMapping: { [key: string]: number } = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };

  const [targetDayAbbr, targetHours, targetMinutes] = startTimeString.split(':');

  const targetDay = daysMapping[targetDayAbbr];

  const now = new Date();
  const resultDate = new Date(now);

  // Calculate how many days to add to get to the next occurrence of the targetDay
  const currentDay = now.getDay();
  const daysToAdd = (targetDay - currentDay + 7) % 7;

  resultDate.setUTCDate(now.getUTCDate() + daysToAdd);

  resultDate.setUTCHours(Number(targetHours), Number(targetMinutes), 0, 0);
  // If the calculated date/time is in the past (e.g., target day is today but time has passed),
  // advance to the same day and time next week.
  if (resultDate.getTime() <= now.getTime()) {
    resultDate.setUTCDate(resultDate.getUTCDate() + 7);
  }

  return resultDate;
};

const getPreferredBackupWindow = (preferredMaintenanceWindowRange: string): string => {
  // preferredMaintenanceWindowRange is like "Sun:02:00-Sun:04:00"
  // getNextDateForDayAndTime correctly parses the start of this range.
  const maintenanceWindowStartDate = getNextDateForDayAndTime(preferredMaintenanceWindowRange);

  // Calculate backup window start time (1 hour before maintenance starts)
  // getTime() returns milliseconds since epoch, so arithmetic is straightforward
  const backupWindowStartTime = new Date(maintenanceWindowStartDate.getTime() - 60 * 60 * 1000); // 1 hour in milliseconds

  // Calculate backup window end time (30 minutes after backup window starts)
  const backupWindowEndTime = new Date(backupWindowStartTime.getTime() + 30 * 60 * 1000); // 30 minutes in milliseconds

  // Format times in HH:MM UTC as per AWS requirements
  const formatToUtcHHMM = (date: Date): string => {
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return `${formatToUtcHHMM(backupWindowStartTime)}-${formatToUtcHHMM(backupWindowEndTime)}`;
};

const getDbBackupAndMaintenanceWindow = (resource: StpRelationalDatabase) => {
  let preferredMaintenanceWindow = resource.preferredMaintenanceWindow;
  if (!preferredMaintenanceWindow) {
    preferredMaintenanceWindow = getPreferredMaintenanceWindow(globalStateManager.region);
  }

  // Calculate the preferred backup window
  const preferredBackupWindow = getPreferredBackupWindow(preferredMaintenanceWindow);

  return {
    preferredMaintenanceWindow,
    preferredBackupWindow
  };
};
