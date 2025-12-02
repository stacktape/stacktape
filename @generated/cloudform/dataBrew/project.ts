import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Sample {
  Type!: Value<string>;
  Size?: Value<number>;
  constructor(properties: Sample) {
    Object.assign(this, properties);
  }
}
export interface ProjectProperties {
  RecipeName: Value<string>;
  DatasetName: Value<string>;
  Sample?: Sample;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Project extends ResourceBase<ProjectProperties> {
  static Sample = Sample;
  constructor(properties: ProjectProperties) {
    super('AWS::DataBrew::Project', properties);
  }
}
