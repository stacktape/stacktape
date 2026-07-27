import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface IPAMPoolCidrProperties {
  Cidr?: Value<string>;
  NetmaskLength?: Value<number>;
  IpamPoolId: Value<string>;
}
export default class IPAMPoolCidr extends ResourceBase<IPAMPoolCidrProperties> {
  constructor(properties: IPAMPoolCidrProperties) {
    super('AWS::EC2::IPAMPoolCidr', properties);
  }
}
