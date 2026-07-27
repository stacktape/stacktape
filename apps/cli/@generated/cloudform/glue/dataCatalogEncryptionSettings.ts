import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ConnectionPasswordEncryption {
  ReturnConnectionPasswordEncrypted?: Value<boolean>;
  KmsKeyId?: Value<string>;
  constructor(properties: ConnectionPasswordEncryption) {
    Object.assign(this, properties);
  }
}

export class DataCatalogEncryptionSettingsInner {
  ConnectionPasswordEncryption?: ConnectionPasswordEncryption;
  EncryptionAtRest?: EncryptionAtRest;
  constructor(properties: DataCatalogEncryptionSettingsInner) {
    Object.assign(this, properties);
  }
}

export class EncryptionAtRest {
  CatalogEncryptionMode?: Value<string>;
  CatalogEncryptionServiceRole?: Value<string>;
  SseAwsKmsKeyId?: Value<string>;
  constructor(properties: EncryptionAtRest) {
    Object.assign(this, properties);
  }
}
export interface DataCatalogEncryptionSettingsProperties {
  DataCatalogEncryptionSettings: DataCatalogEncryptionSettings;
  CatalogId: Value<string>;
}
export default class DataCatalogEncryptionSettings extends ResourceBase<DataCatalogEncryptionSettingsProperties> {
  static ConnectionPasswordEncryption = ConnectionPasswordEncryption;
  static DataCatalogEncryptionSettings = DataCatalogEncryptionSettingsInner;
  static EncryptionAtRest = EncryptionAtRest;
  constructor(properties: DataCatalogEncryptionSettingsProperties) {
    super('AWS::Glue::DataCatalogEncryptionSettings', properties);
  }
}
