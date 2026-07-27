import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DefaultAction {
  Forward?: Forward;
  FixedResponse?: FixedResponse;
  constructor(properties: DefaultAction) {
    Object.assign(this, properties);
  }
}

export class FixedResponse {
  StatusCode!: Value<number>;
  constructor(properties: FixedResponse) {
    Object.assign(this, properties);
  }
}

export class Forward {
  TargetGroups!: List<WeightedTargetGroup>;
  constructor(properties: Forward) {
    Object.assign(this, properties);
  }
}

export class WeightedTargetGroup {
  Weight?: Value<number>;
  TargetGroupIdentifier!: Value<string>;
  constructor(properties: WeightedTargetGroup) {
    Object.assign(this, properties);
  }
}
export interface ListenerProperties {
  DefaultAction: DefaultAction;
  Port?: Value<number>;
  ServiceIdentifier?: Value<string>;
  Protocol: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class Listener extends ResourceBase<ListenerProperties> {
  static DefaultAction = DefaultAction;
  static FixedResponse = FixedResponse;
  static Forward = Forward;
  static WeightedTargetGroup = WeightedTargetGroup;
  constructor(properties: ListenerProperties) {
    super('AWS::VpcLattice::Listener', properties);
  }
}
