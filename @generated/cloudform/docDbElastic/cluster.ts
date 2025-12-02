import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface ClusterProperties {
  AdminUserName: Value<string>;
  KmsKeyId?: Value<string>;
  AdminUserPassword?: Value<string>;
  PreferredMaintenanceWindow?: Value<string>;
  ShardInstanceCount?: Value<number>;
  SubnetIds?: List<Value<string>>;
  PreferredBackupWindow?: Value<string>;
  ShardCount: Value<number>;
  ShardCapacity: Value<number>;
  VpcSecurityGroupIds?: List<Value<string>>;
  ClusterName: Value<string>;
  BackupRetentionPeriod?: Value<number>;
  AuthType: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Cluster extends ResourceBase<ClusterProperties> {
  constructor(properties: ClusterProperties) {
    super('AWS::DocDBElastic::Cluster', properties);
  }
}
