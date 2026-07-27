import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AbortIncompleteMultipartUpload {
  DaysAfterInitiation!: Value<number>;
  constructor(properties: AbortIncompleteMultipartUpload) {
    Object.assign(this, properties);
  }
}

export class Filter {
  AndOperator?: FilterAndOperator;
  Prefix?: Value<string>;
  Tag?: FilterTag;
  constructor(properties: Filter) {
    Object.assign(this, properties);
  }
}

export class FilterAndOperator {
  Prefix?: Value<string>;
  Tags!: List<FilterTag>;
  constructor(properties: FilterAndOperator) {
    Object.assign(this, properties);
  }
}

export class FilterTag {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: FilterTag) {
    Object.assign(this, properties);
  }
}

export class LifecycleConfiguration {
  Rules!: List<Rule>;
  constructor(properties: LifecycleConfiguration) {
    Object.assign(this, properties);
  }
}

export class Rule {
  Status!: Value<string>;
  ExpirationDate?: Value<string>;
  Filter?: Filter;
  ExpirationInDays?: Value<number>;
  Id?: Value<string>;
  AbortIncompleteMultipartUpload?: AbortIncompleteMultipartUpload;
  constructor(properties: Rule) {
    Object.assign(this, properties);
  }
}
export interface BucketProperties {
  OutpostId: Value<string>;
  BucketName: Value<string>;
  LifecycleConfiguration?: LifecycleConfiguration;
  Tags?: List<ResourceTag>;
}
export default class Bucket extends ResourceBase<BucketProperties> {
  static AbortIncompleteMultipartUpload = AbortIncompleteMultipartUpload;
  static Filter = Filter;
  static FilterAndOperator = FilterAndOperator;
  static FilterTag = FilterTag;
  static LifecycleConfiguration = LifecycleConfiguration;
  static Rule = Rule;
  constructor(properties: BucketProperties) {
    super('AWS::S3Outposts::Bucket', properties);
  }
}
