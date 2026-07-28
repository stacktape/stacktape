import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EncryptionConfiguration {
  KmsKeyArn?: Value<string>;
  SseType?: Value<string>;
  constructor(properties: EncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class MetadataConfiguration {
  NonFilterableMetadataKeys?: List<Value<string>>;
  constructor(properties: MetadataConfiguration) {
    Object.assign(this, properties);
  }
}
export interface IndexProperties {
  DistanceMetric: Value<string>;
  IndexName?: Value<string>;
  VectorBucketArn?: Value<string>;
  VectorBucketName?: Value<string>;
  EncryptionConfiguration?: EncryptionConfiguration;
  DataType: Value<string>;
  MetadataConfiguration?: MetadataConfiguration;
  Dimension: Value<number>;
  Tags?: List<ResourceTag>;
}
export default class Index extends ResourceBase<IndexProperties> {
  static EncryptionConfiguration = EncryptionConfiguration;
  static MetadataConfiguration = MetadataConfiguration;
  constructor(properties: IndexProperties) {
    super('AWS::S3Vectors::Index', properties);
  }
}
