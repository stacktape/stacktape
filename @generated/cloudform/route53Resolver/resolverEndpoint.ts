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
  IpAddresses: List<IpAddressRequest>;
  Protocols?: List<Value<string>>;
  OutpostArn?: Value<string>;
  PreferredInstanceType?: Value<string>;
  ResolverEndpointType?: Value<string>;
  Direction: Value<string>;
  SecurityGroupIds: List<Value<string>>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class ResolverEndpoint extends ResourceBase<ResolverEndpointProperties> {
  static IpAddressRequest = IpAddressRequest;
  constructor(properties: ResolverEndpointProperties) {
    super('AWS::Route53Resolver::ResolverEndpoint', properties);
  }
}
