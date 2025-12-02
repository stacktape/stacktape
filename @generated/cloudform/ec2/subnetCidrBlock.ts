import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface SubnetCidrBlockProperties {
  Ipv6NetmaskLength?: Value<number>;
  Ipv6IpamPoolId?: Value<string>;
  SubnetId: Value<string>;
  Ipv6CidrBlock?: Value<string>;
}
export default class SubnetCidrBlock extends ResourceBase<SubnetCidrBlockProperties> {
  constructor(properties: SubnetCidrBlockProperties) {
    super('AWS::EC2::SubnetCidrBlock', properties);
  }
}
