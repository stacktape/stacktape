import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface DirectConnectGatewayProperties {
  DirectConnectGatewayName: Value<string>;
  Tags?: List<ResourceTag>;
  AmazonSideAsn?: Value<string>;
}
export default class DirectConnectGateway extends ResourceBase<DirectConnectGatewayProperties> {
  constructor(properties: DirectConnectGatewayProperties) {
    super('AWS::DirectConnect::DirectConnectGateway', properties);
  }
}
