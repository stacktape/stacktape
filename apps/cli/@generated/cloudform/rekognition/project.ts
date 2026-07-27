import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface ProjectProperties {
  ProjectName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Project extends ResourceBase<ProjectProperties> {
  constructor(properties: ProjectProperties) {
    super('AWS::Rekognition::Project', properties);
  }
}
