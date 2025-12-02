import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface EgressOnlyInternetGatewayProperties {
  VpcId: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class EgressOnlyInternetGateway extends ResourceBase<EgressOnlyInternetGatewayProperties> {
  constructor(properties: EgressOnlyInternetGatewayProperties) {
    super('AWS::EC2::EgressOnlyInternetGateway', properties);
  }
}
