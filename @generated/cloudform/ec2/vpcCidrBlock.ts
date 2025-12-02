import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface VPCCidrBlockProperties {
  Ipv6NetmaskLength?: Value<number>;
  Ipv6IpamPoolId?: Value<string>;
  VpcId: Value<string>;
  Ipv4NetmaskLength?: Value<number>;
  Ipv6CidrBlockNetworkBorderGroup?: Value<string>;
  CidrBlock?: Value<string>;
  Ipv6Pool?: Value<string>;
  Ipv4IpamPoolId?: Value<string>;
  Ipv6CidrBlock?: Value<string>;
  AmazonProvidedIpv6CidrBlock?: Value<boolean>;
}
export default class VPCCidrBlock extends ResourceBase<VPCCidrBlockProperties> {
  constructor(properties: VPCCidrBlockProperties) {
    super('AWS::EC2::VPCCidrBlock', properties);
  }
}
