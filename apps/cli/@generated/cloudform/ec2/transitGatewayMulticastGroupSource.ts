import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface TransitGatewayMulticastGroupSourceProperties {
  TransitGatewayMulticastDomainId: Value<string>;
  NetworkInterfaceId: Value<string>;
  GroupIpAddress: Value<string>;
}
export default class TransitGatewayMulticastGroupSource extends ResourceBase<TransitGatewayMulticastGroupSourceProperties> {
  constructor(properties: TransitGatewayMulticastGroupSourceProperties) {
    super('AWS::EC2::TransitGatewayMulticastGroupSource', properties);
  }
}
