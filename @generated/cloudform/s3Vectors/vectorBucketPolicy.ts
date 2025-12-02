import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface VectorBucketPolicyProperties {
  Policy: { [key: string]: any };
  VectorBucketArn?: Value<string>;
  VectorBucketName?: Value<string>;
}
export default class VectorBucketPolicy extends ResourceBase<VectorBucketPolicyProperties> {
  constructor(properties: VectorBucketPolicyProperties) {
    super('AWS::S3Vectors::VectorBucketPolicy', properties);
  }
}
