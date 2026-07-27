import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Code {
  S3!: S3;
  constructor(properties: Code) {
    Object.assign(this, properties);
  }
}

export class S3 {
  ObjectVersion?: Value<string>;
  Bucket!: Value<string>;
  Key!: Value<string>;
  constructor(properties: S3) {
    Object.assign(this, properties);
  }
}
export interface GitHubRepositoryProperties {
  EnableIssues?: Value<boolean>;
  ConnectionArn?: Value<string>;
  RepositoryName: Value<string>;
  RepositoryAccessToken?: Value<string>;
  RepositoryOwner: Value<string>;
  IsPrivate?: Value<boolean>;
  Code?: Code;
  RepositoryDescription?: Value<string>;
}
export default class GitHubRepository extends ResourceBase<GitHubRepositoryProperties> {
  static Code = Code;
  static S3 = S3;
  constructor(properties: GitHubRepositoryProperties) {
    super('AWS::CodeStar::GitHubRepository', properties);
  }
}
