import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface InternetGatewayProperties {
  Tags?: List<ResourceTag>;
}
export default class InternetGateway extends ResourceBase<InternetGatewayProperties> {
  constructor(properties?: InternetGatewayProperties) {
    super('AWS::EC2::InternetGateway', properties || {});
  }
}
