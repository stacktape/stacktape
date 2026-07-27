import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Code {
  S3!: S3;
  BranchName?: Value<string>;
  constructor(properties: Code) {
    Object.assign(this, properties);
  }
}

export class RepositoryTrigger {
  Events!: List<Value<string>>;
  Branches?: List<Value<string>>;
  CustomData?: Value<string>;
  DestinationArn!: Value<string>;
  Name!: Value<string>;
  constructor(properties: RepositoryTrigger) {
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
export interface RepositoryProperties {
  KmsKeyId?: Value<string>;
  RepositoryName: Value<string>;
  Triggers?: List<RepositoryTrigger>;
  Code?: Code;
  RepositoryDescription?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Repository extends ResourceBase<RepositoryProperties> {
  static Code = Code;
  static RepositoryTrigger = RepositoryTrigger;
  static S3 = S3;
  constructor(properties: RepositoryProperties) {
    super('AWS::CodeCommit::Repository', properties);
  }
}
