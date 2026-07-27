import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Label {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: Label) {
    Object.assign(this, properties);
  }
}

export class Selector {
  Labels?: List<Label>;
  Namespace!: Value<string>;
  constructor(properties: Selector) {
    Object.assign(this, properties);
  }
}
export interface FargateProfileProperties {
  Subnets?: List<Value<string>>;
  FargateProfileName?: Value<string>;
  ClusterName: Value<string>;
  PodExecutionRoleArn: Value<string>;
  Selectors: List<Selector>;
  Tags?: List<ResourceTag>;
}
export default class FargateProfile extends ResourceBase<FargateProfileProperties> {
  static Label = Label;
  static Selector = Selector;
  constructor(properties: FargateProfileProperties) {
    super('AWS::EKS::FargateProfile', properties);
  }
}
