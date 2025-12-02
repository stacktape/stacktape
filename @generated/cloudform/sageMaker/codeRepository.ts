import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class GitConfig {
  SecretArn?: Value<string>;
  Branch?: Value<string>;
  RepositoryUrl!: Value<string>;
  constructor(properties: GitConfig) {
    Object.assign(this, properties);
  }
}
export interface CodeRepositoryProperties {
  CodeRepositoryName?: Value<string>;
  GitConfig: GitConfig;
  Tags?: List<ResourceTag>;
}
export default class CodeRepository extends ResourceBase<CodeRepositoryProperties> {
  static GitConfig = GitConfig;
  constructor(properties: CodeRepositoryProperties) {
    super('AWS::SageMaker::CodeRepository', properties);
  }
}
