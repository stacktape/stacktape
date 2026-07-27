import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EnabledControlParameter {
  Value!: { [key: string]: any };
  Key!: Value<string>;
  constructor(properties: EnabledControlParameter) {
    Object.assign(this, properties);
  }
}
export interface EnabledControlProperties {
  Parameters?: List<EnabledControlParameter>;
  ControlIdentifier: Value<string>;
  TargetIdentifier: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class EnabledControl extends ResourceBase<EnabledControlProperties> {
  static EnabledControlParameter = EnabledControlParameter;
  constructor(properties: EnabledControlProperties) {
    super('AWS::ControlTower::EnabledControl', properties);
  }
}
