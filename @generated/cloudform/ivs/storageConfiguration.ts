import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class S3StorageConfiguration {
  BucketName!: Value<string>;
  constructor(properties: S3StorageConfiguration) {
    Object.assign(this, properties);
  }
}
export interface StorageConfigurationProperties {
  S3: S3StorageConfiguration;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class StorageConfiguration extends ResourceBase<StorageConfigurationProperties> {
  static S3StorageConfiguration = S3StorageConfiguration;
  constructor(properties: StorageConfigurationProperties) {
    super('AWS::IVS::StorageConfiguration', properties);
  }
}
