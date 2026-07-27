import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface RouteProperties {
  DestinationIpv6CidrBlock?: Value<string>;
  RouteTableId: Value<string>;
  InstanceId?: Value<string>;
  LocalGatewayId?: Value<string>;
  CarrierGatewayId?: Value<string>;
  DestinationCidrBlock?: Value<string>;
  GatewayId?: Value<string>;
  NetworkInterfaceId?: Value<string>;
  VpcEndpointId?: Value<string>;
  CoreNetworkArn?: Value<string>;
  TransitGatewayId?: Value<string>;
  VpcPeeringConnectionId?: Value<string>;
  EgressOnlyInternetGatewayId?: Value<string>;
  DestinationPrefixListId?: Value<string>;
  NatGatewayId?: Value<string>;
}
export default class Route extends ResourceBase<RouteProperties> {
  constructor(properties: RouteProperties) {
    super('AWS::EC2::Route', properties);
  }
}
