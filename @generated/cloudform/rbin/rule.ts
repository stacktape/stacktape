import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ResourceTag {
  ResourceTagValue!: Value<string>;
  ResourceTagKey!: Value<string>;
  constructor(properties: ResourceTag) {
    Object.assign(this, properties);
  }
}

export class RetentionPeriod {
  RetentionPeriodUnit!: Value<string>;
  RetentionPeriodValue!: Value<number>;
  constructor(properties: RetentionPeriod) {
    Object.assign(this, properties);
  }
}

export class UnlockDelay {
  UnlockDelayValue?: Value<number>;
  UnlockDelayUnit?: Value<string>;
  constructor(properties: UnlockDelay) {
    Object.assign(this, properties);
  }
}
export interface RuleProperties {
  Status?: Value<string>;
  Description?: Value<string>;
  ResourceTags?: List<ResourceTag>;
  LockConfiguration?: UnlockDelay;
  ExcludeResourceTags?: List<ResourceTag>;
  ResourceType: Value<string>;
  RetentionPeriod: RetentionPeriod;
  Tags?: List<ResourceTag>;
}
export default class Rule extends ResourceBase<RuleProperties> {
  static ResourceTag = ResourceTag;
  static RetentionPeriod = RetentionPeriod;
  static UnlockDelay = UnlockDelay;
  constructor(properties: RuleProperties) {
    super('AWS::Rbin::Rule', properties);
  }
}
