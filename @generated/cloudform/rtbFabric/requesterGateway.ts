import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface RequesterGatewayProperties {
  Description?: Value<string>;
  VpcId: Value<string>;
  SubnetIds: List<Value<string>>;
  SecurityGroupIds: List<Value<string>>;
  Tags?: List<ResourceTag>;
}
export default class RequesterGateway extends ResourceBase<RequesterGatewayProperties> {
  constructor(properties: RequesterGatewayProperties) {
    super('AWS::RTBFabric::RequesterGateway', properties);
  }
}
