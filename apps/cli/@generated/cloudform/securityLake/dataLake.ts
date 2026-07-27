import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EncryptionConfiguration {
  KmsKeyId?: Value<string>;
  constructor(properties: EncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class Expiration {
  Days?: Value<number>;
  constructor(properties: Expiration) {
    Object.assign(this, properties);
  }
}

export class LifecycleConfiguration {
  Transitions?: List<Transitions>;
  Expiration?: Expiration;
  constructor(properties: LifecycleConfiguration) {
    Object.assign(this, properties);
  }
}

export class ReplicationConfiguration {
  Regions?: List<Value<string>>;
  RoleArn?: Value<string>;
  constructor(properties: ReplicationConfiguration) {
    Object.assign(this, properties);
  }
}

export class Transitions {
  StorageClass?: Value<string>;
  Days?: Value<number>;
  constructor(properties: Transitions) {
    Object.assign(this, properties);
  }
}
export interface DataLakeProperties {
  EncryptionConfiguration?: EncryptionConfiguration;
  LifecycleConfiguration?: LifecycleConfiguration;
  ReplicationConfiguration?: ReplicationConfiguration;
  MetaStoreManagerRoleArn?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class DataLake extends ResourceBase<DataLakeProperties> {
  static EncryptionConfiguration = EncryptionConfiguration;
  static Expiration = Expiration;
  static LifecycleConfiguration = LifecycleConfiguration;
  static ReplicationConfiguration = ReplicationConfiguration;
  static Transitions = Transitions;
  constructor(properties?: DataLakeProperties) {
    super('AWS::SecurityLake::DataLake', properties || {});
  }
}
