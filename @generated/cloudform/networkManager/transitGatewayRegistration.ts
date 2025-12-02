import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface TransitGatewayRegistrationProperties {
  GlobalNetworkId: Value<string>;
  TransitGatewayArn: Value<string>;
}
export default class TransitGatewayRegistration extends ResourceBase<TransitGatewayRegistrationProperties> {
  constructor(properties: TransitGatewayRegistrationProperties) {
    super('AWS::NetworkManager::TransitGatewayRegistration', properties);
  }
}
