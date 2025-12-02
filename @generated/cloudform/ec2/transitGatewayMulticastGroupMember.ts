import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface TransitGatewayMulticastGroupMemberProperties {
  TransitGatewayMulticastDomainId: Value<string>;
  NetworkInterfaceId: Value<string>;
  GroupIpAddress: Value<string>;
}
export default class TransitGatewayMulticastGroupMember extends ResourceBase<TransitGatewayMulticastGroupMemberProperties> {
  constructor(properties: TransitGatewayMulticastGroupMemberProperties) {
    super('AWS::EC2::TransitGatewayMulticastGroupMember', properties);
  }
}
