import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface TransitGatewayRouteTablePropagationProperties {
  TransitGatewayRouteTableId: Value<string>;
  TransitGatewayAttachmentId: Value<string>;
}
export default class TransitGatewayRouteTablePropagation extends ResourceBase<TransitGatewayRouteTablePropagationProperties> {
  constructor(properties: TransitGatewayRouteTablePropagationProperties) {
    super('AWS::EC2::TransitGatewayRouteTablePropagation', properties);
  }
}
