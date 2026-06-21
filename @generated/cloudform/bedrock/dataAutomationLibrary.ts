import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EncryptionConfiguration {
  KmsKeyId!: Value<string>;
  KmsEncryptionContext?: { [key: string]: Value<string> };
  constructor(properties: EncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class EntityTypeInfo {
  EntityType!: Value<string>;
  EntityMetadata?: Value<string>;
  constructor(properties: EntityTypeInfo) {
    Object.assign(this, properties);
  }
}
export interface DataAutomationLibraryProperties {
  LibraryDescription?: Value<string>;
  EncryptionConfiguration?: EncryptionConfiguration;
  LibraryName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class DataAutomationLibrary extends ResourceBase<DataAutomationLibraryProperties> {
  static EncryptionConfiguration = EncryptionConfiguration;
  static EntityTypeInfo = EntityTypeInfo;
  constructor(properties: DataAutomationLibraryProperties) {
    super('AWS::Bedrock::DataAutomationLibrary', properties);
  }
}
