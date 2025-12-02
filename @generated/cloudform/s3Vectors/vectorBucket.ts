import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class EncryptionConfiguration {
  KmsKeyArn?: Value<string>;
  SseType?: Value<string>;
  constructor(properties: EncryptionConfiguration) {
    Object.assign(this, properties);
  }
}
export interface VectorBucketProperties {
  VectorBucketName?: Value<string>;
  EncryptionConfiguration?: EncryptionConfiguration;
}
export default class VectorBucket extends ResourceBase<VectorBucketProperties> {
  static EncryptionConfiguration = EncryptionConfiguration;
  constructor(properties?: VectorBucketProperties) {
    super('AWS::S3Vectors::VectorBucket', properties || {});
  }
}
