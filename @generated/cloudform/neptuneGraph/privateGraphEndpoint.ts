import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface PrivateGraphEndpointProperties {
  VpcId: Value<string>;
  GraphIdentifier: Value<string>;
  SecurityGroupIds?: List<Value<string>>;
  SubnetIds?: List<Value<string>>;
}
export default class PrivateGraphEndpoint extends ResourceBase<PrivateGraphEndpointProperties> {
  constructor(properties: PrivateGraphEndpointProperties) {
    super('AWS::NeptuneGraph::PrivateGraphEndpoint', properties);
  }
}
