import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Condition {
  Equals?: List<Value<string>>;
  LessThan?: Value<number>;
  LessThanOrEqual?: Value<number>;
  GreaterThan?: Value<number>;
  Lt?: Value<number>;
  Gte?: Value<number>;
  Neq?: List<Value<string>>;
  GreaterThanOrEqual?: Value<number>;
  Eq?: List<Value<string>>;
  Lte?: Value<number>;
  Gt?: Value<number>;
  NotEquals?: List<Value<string>>;
  constructor(properties: Condition) {
    Object.assign(this, properties);
  }
}

export class FindingCriteria {
  Criterion?: { [key: string]: Condition };
  constructor(properties: FindingCriteria) {
    Object.assign(this, properties);
  }
}

export class TagItem {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: TagItem) {
    Object.assign(this, properties);
  }
}
export interface FilterProperties {
  Action?: Value<string>;
  Description?: Value<string>;
  DetectorId: Value<string>;
  FindingCriteria: FindingCriteria;
  Rank?: Value<number>;
  Tags?: List<TagItem>;
  Name: Value<string>;
}
export default class Filter extends ResourceBase<FilterProperties> {
  static Condition = Condition;
  static FindingCriteria = FindingCriteria;
  static TagItem = TagItem;
  constructor(properties: FilterProperties) {
    super('AWS::GuardDuty::Filter', properties);
  }
}
