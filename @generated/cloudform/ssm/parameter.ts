import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface ParameterProperties {
  Type: Value<string>;
  Description?: Value<string>;
  Policies?: Value<string>;
  AllowedPattern?: Value<string>;
  Tier?: Value<string>;
  Value: Value<string>;
  DataType?: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name?: Value<string>;
}
export default class Parameter extends ResourceBase<ParameterProperties> {
  constructor(properties: ParameterProperties) {
    super('AWS::SSM::Parameter', properties);
  }
}
