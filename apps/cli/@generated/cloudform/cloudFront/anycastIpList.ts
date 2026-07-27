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
  IpamCidrConfigResults?: List<IpamCidrConfigResult>;
  Name!: Value<string>;
  constructor(properties: AnycastIpListInner) {
    Object.assign(this, properties);
  }
}

export class IpamCidrConfig {
  Cidr!: Value<string>;
  IpamPoolArn!: Value<string>;
  constructor(properties: IpamCidrConfig) {
    Object.assign(this, properties);
  }
}

export class IpamCidrConfigResult {
  Status?: Value<string>;
  AnycastIp?: Value<string>;
  Cidr?: Value<string>;
  IpamPoolArn?: Value<string>;
  constructor(properties: IpamCidrConfigResult) {
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
  IpamCidrConfigs?: List<IpamCidrConfig>;
  Tags?: Tags;
  Name: Value<string>;
}
export default class AnycastIpList extends ResourceBase<AnycastIpListProperties> {
  static AnycastIpList = AnycastIpListInner;
  static IpamCidrConfig = IpamCidrConfig;
  static IpamCidrConfigResult = IpamCidrConfigResult;
  static Tags = Tags;
  constructor(properties: AnycastIpListProperties) {
    super('AWS::CloudFront::AnycastIpList', properties);
  }
}
