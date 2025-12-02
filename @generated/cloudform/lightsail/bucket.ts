import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessRules {
  AllowPublicOverrides?: Value<boolean>;
  GetObject?: Value<string>;
  constructor(properties: AccessRules) {
    Object.assign(this, properties);
  }
}
export interface BucketProperties {
  ObjectVersioning?: Value<boolean>;
  ReadOnlyAccessAccounts?: List<Value<string>>;
  BundleId: Value<string>;
  BucketName: Value<string>;
  AccessRules?: AccessRules;
  ResourcesReceivingAccess?: List<Value<string>>;
  Tags?: List<ResourceTag>;
}
export default class Bucket extends ResourceBase<BucketProperties> {
  static AccessRules = AccessRules;
  constructor(properties: BucketProperties) {
    super('AWS::Lightsail::Bucket', properties);
  }
}
