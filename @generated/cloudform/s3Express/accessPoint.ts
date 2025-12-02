import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class PublicAccessBlockConfiguration {
  RestrictPublicBuckets?: Value<boolean>;
  BlockPublicPolicy?: Value<boolean>;
  BlockPublicAcls?: Value<boolean>;
  IgnorePublicAcls?: Value<boolean>;
  constructor(properties: PublicAccessBlockConfiguration) {
    Object.assign(this, properties);
  }
}

export class Scope {
  Permissions?: List<Value<string>>;
  Prefixes?: List<Value<string>>;
  constructor(properties: Scope) {
    Object.assign(this, properties);
  }
}

export class VpcConfiguration {
  VpcId?: Value<string>;
  constructor(properties: VpcConfiguration) {
    Object.assign(this, properties);
  }
}
export interface AccessPointProperties {
  Policy?: { [key: string]: any };
  PublicAccessBlockConfiguration?: PublicAccessBlockConfiguration;
  Scope?: Scope;
  Bucket: Value<string>;
  BucketAccountId?: Value<string>;
  VpcConfiguration?: VpcConfiguration;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class AccessPoint extends ResourceBase<AccessPointProperties> {
  static PublicAccessBlockConfiguration = PublicAccessBlockConfiguration;
  static Scope = Scope;
  static VpcConfiguration = VpcConfiguration;
  constructor(properties: AccessPointProperties) {
    super('AWS::S3Express::AccessPoint', properties);
  }
}
