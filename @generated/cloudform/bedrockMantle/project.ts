import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface ProjectProperties {
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Project extends ResourceBase<ProjectProperties> {
  constructor(properties: ProjectProperties) {
    super('AWS::BedrockMantle::Project', properties);
  }
}
