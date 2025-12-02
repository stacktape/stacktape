import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AttributeTypesSelector {
  Address?: List<Value<string>>;
  AttributeMatchingModel!: Value<string>;
  PhoneNumber?: List<Value<string>>;
  EmailAddress?: List<Value<string>>;
  constructor(properties: AttributeTypesSelector) {
    Object.assign(this, properties);
  }
}

export class AutoMerging {
  Consolidation?: Consolidation;
  Enabled!: Value<boolean>;
  ConflictResolution?: ConflictResolution;
  MinAllowedConfidenceScoreForMerging?: Value<number>;
  constructor(properties: AutoMerging) {
    Object.assign(this, properties);
  }
}

export class ConflictResolution {
  ConflictResolvingModel!: Value<string>;
  SourceName?: Value<string>;
  constructor(properties: ConflictResolution) {
    Object.assign(this, properties);
  }
}

export class Consolidation {
  MatchingAttributesList!: { [key: string]: any };
  constructor(properties: Consolidation) {
    Object.assign(this, properties);
  }
}

export class DomainStats {
  MeteringProfileCount?: Value<number>;
  ProfileCount?: Value<number>;
  ObjectCount?: Value<number>;
  TotalSize?: Value<number>;
  constructor(properties: DomainStats) {
    Object.assign(this, properties);
  }
}

export class ExportingConfig {
  S3Exporting?: S3ExportingConfig;
  constructor(properties: ExportingConfig) {
    Object.assign(this, properties);
  }
}

export class JobSchedule {
  DayOfTheWeek!: Value<string>;
  Time!: Value<string>;
  constructor(properties: JobSchedule) {
    Object.assign(this, properties);
  }
}

export class Matching {
  AutoMerging?: AutoMerging;
  JobSchedule?: JobSchedule;
  Enabled!: Value<boolean>;
  ExportingConfig?: ExportingConfig;
  constructor(properties: Matching) {
    Object.assign(this, properties);
  }
}

export class MatchingRule {
  Rule!: List<Value<string>>;
  constructor(properties: MatchingRule) {
    Object.assign(this, properties);
  }
}

export class RuleBasedMatching {
  Status?: Value<string>;
  MaxAllowedRuleLevelForMerging?: Value<number>;
  Enabled!: Value<boolean>;
  MatchingRules?: List<MatchingRule>;
  AttributeTypesSelector?: AttributeTypesSelector;
  ConflictResolution?: ConflictResolution;
  ExportingConfig?: ExportingConfig;
  MaxAllowedRuleLevelForMatching?: Value<number>;
  constructor(properties: RuleBasedMatching) {
    Object.assign(this, properties);
  }
}

export class S3ExportingConfig {
  S3BucketName!: Value<string>;
  S3KeyName?: Value<string>;
  constructor(properties: S3ExportingConfig) {
    Object.assign(this, properties);
  }
}
export interface DomainProperties {
  Matching?: Matching;
  DefaultExpirationDays: Value<number>;
  DomainName: Value<string>;
  DeadLetterQueueUrl?: Value<string>;
  DefaultEncryptionKey?: Value<string>;
  RuleBasedMatching?: RuleBasedMatching;
  Tags?: List<ResourceTag>;
}
export default class Domain extends ResourceBase<DomainProperties> {
  static AttributeTypesSelector = AttributeTypesSelector;
  static AutoMerging = AutoMerging;
  static ConflictResolution = ConflictResolution;
  static Consolidation = Consolidation;
  static DomainStats = DomainStats;
  static ExportingConfig = ExportingConfig;
  static JobSchedule = JobSchedule;
  static Matching = Matching;
  static MatchingRule = MatchingRule;
  static RuleBasedMatching = RuleBasedMatching;
  static S3ExportingConfig = S3ExportingConfig;
  constructor(properties: DomainProperties) {
    super('AWS::CustomerProfiles::Domain', properties);
  }
}
