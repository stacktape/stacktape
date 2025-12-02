import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ServerlessV2ScalingConfiguration {
  MinCapacity!: Value<number>;
  MaxCapacity!: Value<number>;
  constructor(properties: ServerlessV2ScalingConfiguration) {
    Object.assign(this, properties);
  }
}
export interface DBClusterProperties {
  StorageEncrypted?: Value<boolean>;
  RestoreToTime?: Value<string>;
  SnapshotIdentifier?: Value<string>;
  Port?: Value<number>;
  DBClusterIdentifier?: Value<string>;
  PreferredBackupWindow?: Value<string>;
  RotateMasterUserPassword?: Value<boolean>;
  VpcSecurityGroupIds?: List<Value<string>>;
  NetworkType?: Value<string>;
  CopyTagsToSnapshot?: Value<boolean>;
  GlobalClusterIdentifier?: Value<string>;
  RestoreType?: Value<string>;
  Tags?: List<ResourceTag>;
  EngineVersion?: Value<string>;
  StorageType?: Value<string>;
  KmsKeyId?: Value<string>;
  AvailabilityZones?: List<Value<string>>;
  ServerlessV2ScalingConfiguration?: ServerlessV2ScalingConfiguration;
  PreferredMaintenanceWindow?: Value<string>;
  MasterUserSecretKmsKeyId?: Value<string>;
  DBSubnetGroupName?: Value<string>;
  DeletionProtection?: Value<boolean>;
  UseLatestRestorableTime?: Value<boolean>;
  ManageMasterUserPassword?: Value<boolean>;
  MasterUserPassword?: Value<string>;
  SourceDBClusterIdentifier?: Value<string>;
  MasterUsername?: Value<string>;
  DBClusterParameterGroupName?: Value<string>;
  BackupRetentionPeriod?: Value<number>;
  EnableCloudwatchLogsExports?: List<Value<string>>;
}
export default class DBCluster extends ResourceBase<DBClusterProperties> {
  static ServerlessV2ScalingConfiguration = ServerlessV2ScalingConfiguration;
  constructor(properties?: DBClusterProperties) {
    super('AWS::DocDB::DBCluster', properties || {});
  }
}
