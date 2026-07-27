import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ControlInputParameter {
  ParameterValue!: Value<string>;
  ParameterName!: Value<string>;
  constructor(properties: ControlInputParameter) {
    Object.assign(this, properties);
  }
}

export class ControlScope {
  ComplianceResourceTypes?: List<Value<string>>;
  Tags?: List<ResourceTag>;
  ComplianceResourceIds?: List<Value<string>>;
  constructor(properties: ControlScope) {
    Object.assign(this, properties);
  }
}

export class FrameworkControl {
  ControlName!: Value<string>;
  ControlInputParameters?: List<ControlInputParameter>;
  ControlScope?: ControlScope;
  constructor(properties: FrameworkControl) {
    Object.assign(this, properties);
  }
}
export interface FrameworkProperties {
  FrameworkControls: List<FrameworkControl>;
  FrameworkName?: Value<string>;
  FrameworkTags?: List<ResourceTag>;
  FrameworkDescription?: Value<string>;
}
export default class Framework extends ResourceBase<FrameworkProperties> {
  static ControlInputParameter = ControlInputParameter;
  static ControlScope = ControlScope;
  static FrameworkControl = FrameworkControl;
  constructor(properties: FrameworkProperties) {
    super('AWS::Backup::Framework', properties);
  }
}
