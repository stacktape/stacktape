import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IpAddressRequest {
  Ipv6?: Value<string>;
  Ip?: Value<string>;
  SubnetId!: Value<string>;
  constructor(properties: IpAddressRequest) {
    Object.assign(this, properties);
  }
}
export interface ResolverEndpointProperties {
  Protocols?: List<Value<string>>;
  OutpostArn?: Value<string>;
  ResolverEndpointType?: Value<string>;
  Direction: Value<string>;
  SecurityGroupIds: List<Value<string>>;
  Name?: Value<string>;
  IpAddresses: List<IpAddressRequest>;
  TargetNameServerMetricsEnabled?: Value<boolean>;
  RniEnhancedMetricsEnabled?: Value<boolean>;
  Ipv6InternetAccessEnabled?: Value<boolean>;
  PreferredInstanceType?: Value<string>;
  Dns64Enabled?: Value<boolean>;
  Tags?: List<ResourceTag>;
}
export default class ResolverEndpoint extends ResourceBase<ResolverEndpointProperties> {
  static IpAddressRequest = IpAddressRequest;
  constructor(properties: ResolverEndpointProperties) {
    super('AWS::Route53Resolver::ResolverEndpoint', properties);
  }
}
