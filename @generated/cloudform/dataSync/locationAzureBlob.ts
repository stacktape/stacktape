import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AzureBlobSasConfiguration {
  AzureBlobSasToken!: Value<string>;
  constructor(properties: AzureBlobSasConfiguration) {
    Object.assign(this, properties);
  }
}

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
export interface LocationAzureBlobProperties {
  CmkSecretConfig?: CmkSecretConfig;
  AzureAccessTier?: Value<string>;
  Subdirectory?: Value<string>;
  AzureBlobSasConfiguration?: AzureBlobSasConfiguration;
  AzureBlobType?: Value<string>;
  AzureBlobContainerUrl?: Value<string>;
  CustomSecretConfig?: CustomSecretConfig;
  AgentArns?: List<Value<string>>;
  Tags?: List<ResourceTag>;
  AzureBlobAuthenticationType: Value<string>;
}
export default class LocationAzureBlob extends ResourceBase<LocationAzureBlobProperties> {
  static AzureBlobSasConfiguration = AzureBlobSasConfiguration;
  static CmkSecretConfig = CmkSecretConfig;
  static CustomSecretConfig = CustomSecretConfig;
  static ManagedSecretConfig = ManagedSecretConfig;
  constructor(properties: LocationAzureBlobProperties) {
    super('AWS::DataSync::LocationAzureBlob', properties);
  }
}
