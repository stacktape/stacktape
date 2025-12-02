import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AnycastIpListInner {
  IpAddressType?: Value<string>;
  Status!: Value<string>;
  IpCount!: Value<number>;
  AnycastIps!: List<Value<string>>;
  LastModifiedTime!: Value<string>;
  Id!: Value<string>;
  Arn!: Value<string>;
  Name!: Value<string>;
  constructor(properties: AnycastIpListInner) {
    Object.assign(this, properties);
  }
}

export class Tags {
  Items?: List<ResourceTag>;
  constructor(properties: Tags) {
    Object.assign(this, properties);
  }
}
export interface AnycastIpListProperties {
  IpAddressType?: Value<string>;
  IpCount: Value<number>;
  Tags?: Tags;
  Name: Value<string>;
}
export default class AnycastIpList extends ResourceBase<AnycastIpListProperties> {
  static AnycastIpList = AnycastIpListInner;
  static Tags = Tags;
  constructor(properties: AnycastIpListProperties) {
    super('AWS::CloudFront::AnycastIpList', properties);
  }
}
