import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ProjectProperties {
  ProjectName: Value<string>;
}
export default class Project extends ResourceBase<ProjectProperties> {
  constructor(properties: ProjectProperties) {
    super('AWS::LookoutVision::Project', properties);
  }
}
