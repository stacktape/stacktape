import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Criteria {
  Regex?: Value<string>;
  S3WordsList?: S3WordsList;
  constructor(properties: Criteria) {
    Object.assign(this, properties);
  }
}

export class S3WordsList {
  BucketName!: Value<string>;
  ObjectKey!: Value<string>;
  constructor(properties: S3WordsList) {
    Object.assign(this, properties);
  }
}
export interface AllowListProperties {
  Description?: Value<string>;
  Criteria: Criteria;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class AllowList extends ResourceBase<AllowListProperties> {
  static Criteria = Criteria;
  static S3WordsList = S3WordsList;
  constructor(properties: AllowListProperties) {
    super('AWS::Macie::AllowList', properties);
  }
}
