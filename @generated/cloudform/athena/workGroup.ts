import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AclConfiguration {
  S3AclOption!: Value<string>;
  constructor(properties: AclConfiguration) {
    Object.assign(this, properties);
  }
}

export class CustomerContentEncryptionConfiguration {
  KmsKey!: Value<string>;
  constructor(properties: CustomerContentEncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class EncryptionConfiguration {
  EncryptionOption!: Value<string>;
  KmsKey?: Value<string>;
  constructor(properties: EncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class EngineVersion {
  SelectedEngineVersion?: Value<string>;
  EffectiveEngineVersion?: Value<string>;
  constructor(properties: EngineVersion) {
    Object.assign(this, properties);
  }
}

export class ManagedQueryResultsConfiguration {
  EncryptionConfiguration?: ManagedStorageEncryptionConfiguration;
  Enabled?: Value<boolean>;
  constructor(properties: ManagedQueryResultsConfiguration) {
    Object.assign(this, properties);
  }
}

export class ManagedStorageEncryptionConfiguration {
  KmsKey?: Value<string>;
  constructor(properties: ManagedStorageEncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class ResultConfiguration {
  EncryptionConfiguration?: EncryptionConfiguration;
  OutputLocation?: Value<string>;
  AclConfiguration?: AclConfiguration;
  ExpectedBucketOwner?: Value<string>;
  constructor(properties: ResultConfiguration) {
    Object.assign(this, properties);
  }
}

export class WorkGroupConfiguration {
  EnforceWorkGroupConfiguration?: Value<boolean>;
  EngineVersion?: EngineVersion;
  PublishCloudWatchMetricsEnabled?: Value<boolean>;
  ResultConfiguration?: ResultConfiguration;
  AdditionalConfiguration?: Value<string>;
  CustomerContentEncryptionConfiguration?: CustomerContentEncryptionConfiguration;
  BytesScannedCutoffPerQuery?: Value<number>;
  RequesterPaysEnabled?: Value<boolean>;
  ManagedQueryResultsConfiguration?: ManagedQueryResultsConfiguration;
  ExecutionRole?: Value<string>;
  constructor(properties: WorkGroupConfiguration) {
    Object.assign(this, properties);
  }
}
export interface WorkGroupProperties {
  RecursiveDeleteOption?: Value<boolean>;
  WorkGroupConfiguration?: WorkGroupConfiguration;
  Description?: Value<string>;
  State?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class WorkGroup extends ResourceBase<WorkGroupProperties> {
  static AclConfiguration = AclConfiguration;
  static CustomerContentEncryptionConfiguration = CustomerContentEncryptionConfiguration;
  static EncryptionConfiguration = EncryptionConfiguration;
  static EngineVersion = EngineVersion;
  static ManagedQueryResultsConfiguration = ManagedQueryResultsConfiguration;
  static ManagedStorageEncryptionConfiguration = ManagedStorageEncryptionConfiguration;
  static ResultConfiguration = ResultConfiguration;
  static WorkGroupConfiguration = WorkGroupConfiguration;
  constructor(properties: WorkGroupProperties) {
    super('AWS::Athena::WorkGroup', properties);
  }
}
