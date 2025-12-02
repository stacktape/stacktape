import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface BucketPolicyProperties {
  Bucket: Value<string>;
  PolicyDocument: { [key: string]: any };
}
export default class BucketPolicy extends ResourceBase<BucketPolicyProperties> {
  constructor(properties: BucketPolicyProperties) {
    super('AWS::S3Express::BucketPolicy', properties);
  }
}
