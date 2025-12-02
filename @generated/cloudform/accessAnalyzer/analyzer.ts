import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AnalysisRule {
  Exclusions?: List<AnalysisRuleCriteria>;
  constructor(properties: AnalysisRule) {
    Object.assign(this, properties);
  }
}

export class AnalysisRuleCriteria {
  AccountIds?: List<Value<string>>;
  ResourceTags?: { [key: string]: any };
  constructor(properties: AnalysisRuleCriteria) {
    Object.assign(this, properties);
  }
}

export class AnalyzerConfiguration {
  InternalAccessConfiguration?: InternalAccessConfiguration;
  UnusedAccessConfiguration?: UnusedAccessConfiguration;
  constructor(properties: AnalyzerConfiguration) {
    Object.assign(this, properties);
  }
}

export class ArchiveRule {
  Filter!: List<Filter>;
  RuleName!: Value<string>;
  constructor(properties: ArchiveRule) {
    Object.assign(this, properties);
  }
}

export class Filter {
  Exists?: Value<boolean>;
  Contains?: List<Value<string>>;
  Neq?: List<Value<string>>;
  Eq?: List<Value<string>>;
  Property!: Value<string>;
  constructor(properties: Filter) {
    Object.assign(this, properties);
  }
}

export class InternalAccessAnalysisRule {
  Inclusions?: List<InternalAccessAnalysisRuleCriteria>;
  constructor(properties: InternalAccessAnalysisRule) {
    Object.assign(this, properties);
  }
}

export class InternalAccessAnalysisRuleCriteria {
  ResourceTypes?: List<Value<string>>;
  AccountIds?: List<Value<string>>;
  ResourceArns?: List<Value<string>>;
  constructor(properties: InternalAccessAnalysisRuleCriteria) {
    Object.assign(this, properties);
  }
}

export class InternalAccessConfiguration {
  InternalAccessAnalysisRule?: InternalAccessAnalysisRule;
  constructor(properties: InternalAccessConfiguration) {
    Object.assign(this, properties);
  }
}

export class UnusedAccessConfiguration {
  UnusedAccessAge?: Value<number>;
  AnalysisRule?: AnalysisRule;
  constructor(properties: UnusedAccessConfiguration) {
    Object.assign(this, properties);
  }
}
export interface AnalyzerProperties {
  ArchiveRules?: List<ArchiveRule>;
  Type: Value<string>;
  AnalyzerName?: Value<string>;
  Tags?: List<ResourceTag>;
  AnalyzerConfiguration?: AnalyzerConfiguration;
}
export default class Analyzer extends ResourceBase<AnalyzerProperties> {
  static AnalysisRule = AnalysisRule;
  static AnalysisRuleCriteria = AnalysisRuleCriteria;
  static AnalyzerConfiguration = AnalyzerConfiguration;
  static ArchiveRule = ArchiveRule;
  static Filter = Filter;
  static InternalAccessAnalysisRule = InternalAccessAnalysisRule;
  static InternalAccessAnalysisRuleCriteria = InternalAccessAnalysisRuleCriteria;
  static InternalAccessConfiguration = InternalAccessConfiguration;
  static UnusedAccessConfiguration = UnusedAccessConfiguration;
  constructor(properties: AnalyzerProperties) {
    super('AWS::AccessAnalyzer::Analyzer', properties);
  }
}
