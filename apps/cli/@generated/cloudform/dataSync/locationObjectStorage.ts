import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CmkSecretConfig {
  SecretArn?: Value<string>;
  KmsKeyArn?: Value<string>;
  constructor(properties: CmkSecretConfig) {
    Object.assign(this, properties);
  }
}

export class CustomSecretConfig {
  SecretArn!: Value<string>;
  SecretAccessRoleArn!: Value<string>;
  constructor(properties: CustomSecretConfig) {
    Object.assign(this, properties);
  }
}

export class ManagedSecretConfig {
  SecretArn!: Value<string>;
  constructor(properties: ManagedSecretConfig) {
    Object.assign(this, properties);
  }
}
export interface LocationObjectStorageProperties {
  ServerCertificate?: Value<string>;
  SecretKey?: Value<string>;
  BucketName?: Value<string>;
  CmkSecretConfig?: CmkSecretConfig;
  Subdirectory?: Value<string>;
  ServerHostname?: Value<string>;
  AccessKey?: Value<string>;
  CustomSecretConfig?: CustomSecretConfig;
  ServerProtocol?: Value<string>;
  AgentArns?: List<Value<string>>;
  ServerPort?: Value<number>;
  Tags?: List<ResourceTag>;
}
export default class LocationObjectStorage extends ResourceBase<LocationObjectStorageProperties> {
  static CmkSecretConfig = CmkSecretConfig;
  static CustomSecretConfig = CustomSecretConfig;
  static ManagedSecretConfig = ManagedSecretConfig;
  constructor(properties?: LocationObjectStorageProperties) {
    super('AWS::DataSync::LocationObjectStorage', properties || {});
  }
}
