import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Action {
  Forward?: Forward;
  FixedResponse?: FixedResponse;
  constructor(properties: Action) {
    Object.assign(this, properties);
  }
}

export class FixedResponse {
  StatusCode!: Value<number>;
  constructor(properties: FixedResponse) {
    Object.assign(this, properties);
  }
}

export class Forward {
  TargetGroups!: List<WeightedTargetGroup>;
  constructor(properties: Forward) {
    Object.assign(this, properties);
  }
}

export class HeaderMatch {
  CaseSensitive?: Value<boolean>;
  Name!: Value<string>;
  Match!: HeaderMatchType;
  constructor(properties: HeaderMatch) {
    Object.assign(this, properties);
  }
}

export class HeaderMatchType {
  Contains?: Value<string>;
  Exact?: Value<string>;
  Prefix?: Value<string>;
  constructor(properties: HeaderMatchType) {
    Object.assign(this, properties);
  }
}

export class HttpMatch {
  HeaderMatches?: List<HeaderMatch>;
  PathMatch?: PathMatch;
  Method?: Value<string>;
  constructor(properties: HttpMatch) {
    Object.assign(this, properties);
  }
}

export class Match {
  HttpMatch!: HttpMatch;
  constructor(properties: Match) {
    Object.assign(this, properties);
  }
}

export class PathMatch {
  CaseSensitive?: Value<boolean>;
  Match!: PathMatchType;
  constructor(properties: PathMatch) {
    Object.assign(this, properties);
  }
}

export class PathMatchType {
  Exact?: Value<string>;
  Prefix?: Value<string>;
  constructor(properties: PathMatchType) {
    Object.assign(this, properties);
  }
}

export class WeightedTargetGroup {
  Weight?: Value<number>;
  TargetGroupIdentifier!: Value<string>;
  constructor(properties: WeightedTargetGroup) {
    Object.assign(this, properties);
  }
}
export interface RuleProperties {
  Action: Action;
  Priority: Value<number>;
  ServiceIdentifier?: Value<string>;
  ListenerIdentifier?: Value<string>;
  Tags?: List<ResourceTag>;
  Match: Match;
  Name?: Value<string>;
}
export default class Rule extends ResourceBase<RuleProperties> {
  static Action = Action;
  static FixedResponse = FixedResponse;
  static Forward = Forward;
  static HeaderMatch = HeaderMatch;
  static HeaderMatchType = HeaderMatchType;
  static HttpMatch = HttpMatch;
  static Match = Match;
  static PathMatch = PathMatch;
  static PathMatchType = PathMatchType;
  static WeightedTargetGroup = WeightedTargetGroup;
  constructor(properties: RuleProperties) {
    super('AWS::VpcLattice::Rule', properties);
  }
}
