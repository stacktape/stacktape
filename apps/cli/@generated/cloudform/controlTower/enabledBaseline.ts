import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Parameter {
  Value?: { [key: string]: any };
  Key?: Value<string>;
  constructor(properties: Parameter) {
    Object.assign(this, properties);
  }
}
export interface EnabledBaselineProperties {
  BaselineVersion: Value<string>;
  Parameters?: List<Parameter>;
  BaselineIdentifier: Value<string>;
  TargetIdentifier: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class EnabledBaseline extends ResourceBase<EnabledBaselineProperties> {
  static Parameter = Parameter;
  constructor(properties: EnabledBaselineProperties) {
    super('AWS::ControlTower::EnabledBaseline', properties);
  }
}
