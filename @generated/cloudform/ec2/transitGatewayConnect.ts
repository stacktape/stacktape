import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class TransitGatewayConnectOptions {
  Protocol?: Value<string>;
  constructor(properties: TransitGatewayConnectOptions) {
    Object.assign(this, properties);
  }
}
export interface TransitGatewayConnectProperties {
  Options: TransitGatewayConnectOptions;
  TransportTransitGatewayAttachmentId: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class TransitGatewayConnect extends ResourceBase<TransitGatewayConnectProperties> {
  static TransitGatewayConnectOptions = TransitGatewayConnectOptions;
  constructor(properties: TransitGatewayConnectProperties) {
    super('AWS::EC2::TransitGatewayConnect', properties);
  }
}
