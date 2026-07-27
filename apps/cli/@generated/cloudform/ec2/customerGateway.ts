import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface CustomerGatewayProperties {
  Type: Value<string>;
  IpAddress: Value<string>;
  BgpAsnExtended?: Value<number>;
  BgpAsn?: Value<number>;
  Tags?: List<ResourceTag>;
  CertificateArn?: Value<string>;
  DeviceName?: Value<string>;
}
export default class CustomerGateway extends ResourceBase<CustomerGatewayProperties> {
  constructor(properties: CustomerGatewayProperties) {
    super('AWS::EC2::CustomerGateway', properties);
  }
}
