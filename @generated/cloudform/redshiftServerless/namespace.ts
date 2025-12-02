import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class NamespaceInner {
  Status?: Value<string>;
  CreationDate?: Value<string>;
  IamRoles?: List<Value<string>>;
  KmsKeyId?: Value<string>;
  AdminPasswordSecretKmsKeyId?: Value<string>;
  DefaultIamRoleArn?: Value<string>;
  AdminPasswordSecretArn?: Value<string>;
  NamespaceName?: Value<string>;
  AdminUsername?: Value<string>;
  NamespaceArn?: Value<string>;
  DbName?: Value<string>;
  NamespaceId?: Value<string>;
  LogExports?: List<Value<string>>;
  constructor(properties: NamespaceInner) {
    Object.assign(this, properties);
  }
}

export class SnapshotCopyConfiguration {
  SnapshotRetentionPeriod?: Value<number>;
  DestinationKmsKeyId?: Value<string>;
  DestinationRegion!: Value<string>;
  constructor(properties: SnapshotCopyConfiguration) {
    Object.assign(this, properties);
  }
}
export interface NamespaceProperties {
  ManageAdminPassword?: Value<boolean>;
  IamRoles?: List<Value<string>>;
  SnapshotCopyConfigurations?: List<SnapshotCopyConfiguration>;
  KmsKeyId?: Value<string>;
  FinalSnapshotName?: Value<string>;
  FinalSnapshotRetentionPeriod?: Value<number>;
  AdminUserPassword?: Value<string>;
  AdminPasswordSecretKmsKeyId?: Value<string>;
  DefaultIamRoleArn?: Value<string>;
  AdminUsername?: Value<string>;
  NamespaceName: Value<string>;
  NamespaceResourcePolicy?: { [key: string]: any };
  RedshiftIdcApplicationArn?: Value<string>;
  DbName?: Value<string>;
  Tags?: List<ResourceTag>;
  LogExports?: List<Value<string>>;
}
export default class Namespace extends ResourceBase<NamespaceProperties> {
  static Namespace = NamespaceInner;
  static SnapshotCopyConfiguration = SnapshotCopyConfiguration;
  constructor(properties: NamespaceProperties) {
    super('AWS::RedshiftServerless::Namespace', properties);
  }
}
