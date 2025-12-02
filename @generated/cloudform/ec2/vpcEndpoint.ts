import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DnsOptionsSpecification {
  PrivateDnsOnlyForInboundResolverEndpoint?: Value<string>;
  DnsRecordIpType?: Value<string>;
  constructor(properties: DnsOptionsSpecification) {
    Object.assign(this, properties);
  }
}
export interface VPCEndpointProperties {
  PrivateDnsEnabled?: Value<boolean>;
  IpAddressType?: Value<string>;
  ServiceRegion?: Value<string>;
  DnsOptions?: DnsOptionsSpecification;
  ResourceConfigurationArn?: Value<string>;
  SecurityGroupIds?: List<Value<string>>;
  SubnetIds?: List<Value<string>>;
  ServiceNetworkArn?: Value<string>;
  VpcId: Value<string>;
  RouteTableIds?: List<Value<string>>;
  ServiceName?: Value<string>;
  PolicyDocument?: { [key: string]: any };
  VpcEndpointType?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class VPCEndpoint extends ResourceBase<VPCEndpointProperties> {
  static DnsOptionsSpecification = DnsOptionsSpecification;
  constructor(properties: VPCEndpointProperties) {
    super('AWS::EC2::VPCEndpoint', properties);
  }
}
