import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface TransitGatewayProperties {
  Description?: Value<string>;
  AssociationDefaultRouteTableId?: Value<string>;
  AutoAcceptSharedAttachments?: Value<string>;
  DefaultRouteTablePropagation?: Value<string>;
  TransitGatewayCidrBlocks?: List<Value<string>>;
  PropagationDefaultRouteTableId?: Value<string>;
  DefaultRouteTableAssociation?: Value<string>;
  VpnEcmpSupport?: Value<string>;
  SecurityGroupReferencingSupport?: Value<string>;
  DnsSupport?: Value<string>;
  MulticastSupport?: Value<string>;
  AmazonSideAsn?: Value<number>;
  Tags?: List<ResourceTag>;
}
export default class TransitGateway extends ResourceBase<TransitGatewayProperties> {
  constructor(properties?: TransitGatewayProperties) {
    super('AWS::EC2::TransitGateway', properties || {});
  }
}
