import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class And {
  MatchObjectAge?: MatchObjectAge;
  MatchAnyPrefix?: List<Value<string>>;
  MatchAnyTag?: List<ResourceTag>;
  MatchAnySuffix?: List<Value<string>>;
  MatchObjectSize?: MatchObjectSize;
  constructor(properties: And) {
    Object.assign(this, properties);
  }
}

export class Filter {
  MatchObjectAge?: MatchObjectAge;
  Or?: Or;
  And?: And;
  MatchAnyPrefix?: List<Value<string>>;
  MatchAnyTag?: List<ResourceTag>;
  MatchAnySuffix?: List<Value<string>>;
  MatchObjectSize?: MatchObjectSize;
  constructor(properties: Filter) {
    Object.assign(this, properties);
  }
}

export class MatchObjectAge {
  DaysLessThan?: Value<number>;
  DaysGreaterThan?: Value<number>;
  constructor(properties: MatchObjectAge) {
    Object.assign(this, properties);
  }
}

export class MatchObjectSize {
  BytesLessThan?: Value<number>;
  BytesGreaterThan?: Value<number>;
  constructor(properties: MatchObjectSize) {
    Object.assign(this, properties);
  }
}

export class Or {
  MatchObjectAge?: MatchObjectAge;
  MatchAnyPrefix?: List<Value<string>>;
  MatchAnyTag?: List<ResourceTag>;
  MatchAnySuffix?: List<Value<string>>;
  MatchObjectSize?: MatchObjectSize;
  constructor(properties: Or) {
    Object.assign(this, properties);
  }
}
export interface StorageLensGroupProperties {
  Filter: Filter;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class StorageLensGroup extends ResourceBase<StorageLensGroupProperties> {
  static And = And;
  static Filter = Filter;
  static MatchObjectAge = MatchObjectAge;
  static MatchObjectSize = MatchObjectSize;
  static Or = Or;
  constructor(properties: StorageLensGroupProperties) {
    super('AWS::S3::StorageLensGroup', properties);
  }
}
