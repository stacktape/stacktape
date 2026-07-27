import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Tags {
  Value?: Value<string>;
  Key!: Value<string>;
  constructor(properties: Tags) {
    Object.assign(this, properties);
  }
}
export interface DeploymentProperties {
  Specifications?: { [key: string]: Value<string> };
  WorkloadName: Value<string>;
  Tags?: List<Tags>;
  DeploymentPatternName: Value<string>;
  Name: Value<string>;
}
export default class Deployment extends ResourceBase<DeploymentProperties> {
  static Tags = Tags;
  constructor(properties: DeploymentProperties) {
    super('AWS::LaunchWizard::Deployment', properties);
  }
}
