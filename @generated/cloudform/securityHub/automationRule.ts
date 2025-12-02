import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AutomationRulesAction {
  Type!: Value<string>;
  FindingFieldsUpdate!: AutomationRulesFindingFieldsUpdate;
  constructor(properties: AutomationRulesAction) {
    Object.assign(this, properties);
  }
}

export class AutomationRulesFindingFieldsUpdate {
  Types?: List<Value<string>>;
  Confidence?: Value<number>;
  Note?: NoteUpdate;
  VerificationState?: Value<string>;
  RelatedFindings?: List<RelatedFinding>;
  Workflow?: WorkflowUpdate;
  Severity?: SeverityUpdate;
  UserDefinedFields?: { [key: string]: Value<string> };
  Criticality?: Value<number>;
  constructor(properties: AutomationRulesFindingFieldsUpdate) {
    Object.assign(this, properties);
  }
}

export class AutomationRulesFindingFilters {
  ProductArn?: List<StringFilter>;
  SourceUrl?: List<StringFilter>;
  ResourceDetailsOther?: List<MapFilter>;
  Description?: List<StringFilter>;
  ProductName?: List<StringFilter>;
  ResourceTags?: List<MapFilter>;
  FirstObservedAt?: List<DateFilter>;
  CreatedAt?: List<DateFilter>;
  NoteText?: List<StringFilter>;
  LastObservedAt?: List<DateFilter>;
  UserDefinedFields?: List<MapFilter>;
  NoteUpdatedAt?: List<DateFilter>;
  ComplianceSecurityControlId?: List<StringFilter>;
  CompanyName?: List<StringFilter>;
  ResourceRegion?: List<StringFilter>;
  NoteUpdatedBy?: List<StringFilter>;
  Confidence?: List<NumberFilter>;
  ResourcePartition?: List<StringFilter>;
  VerificationState?: List<StringFilter>;
  Criticality?: List<NumberFilter>;
  SeverityLabel?: List<StringFilter>;
  RelatedFindingsProductArn?: List<StringFilter>;
  ComplianceStatus?: List<StringFilter>;
  GeneratorId?: List<StringFilter>;
  RecordState?: List<StringFilter>;
  Title?: List<StringFilter>;
  ResourceType?: List<StringFilter>;
  ComplianceAssociatedStandardsId?: List<StringFilter>;
  UpdatedAt?: List<DateFilter>;
  RelatedFindingsId?: List<StringFilter>;
  WorkflowStatus?: List<StringFilter>;
  Type?: List<StringFilter>;
  ResourceId?: List<StringFilter>;
  AwsAccountId?: List<StringFilter>;
  Id?: List<StringFilter>;
  constructor(properties: AutomationRulesFindingFilters) {
    Object.assign(this, properties);
  }
}

export class DateFilter {
  DateRange?: DateRange;
  Start?: Value<string>;
  End?: Value<string>;
  constructor(properties: DateFilter) {
    Object.assign(this, properties);
  }
}

export class DateRange {
  Value!: Value<number>;
  Unit!: Value<string>;
  constructor(properties: DateRange) {
    Object.assign(this, properties);
  }
}

export class MapFilter {
  Comparison!: Value<string>;
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: MapFilter) {
    Object.assign(this, properties);
  }
}

export class NoteUpdate {
  UpdatedBy!: { [key: string]: any };
  Text!: Value<string>;
  constructor(properties: NoteUpdate) {
    Object.assign(this, properties);
  }
}

export class NumberFilter {
  Gte?: Value<number>;
  Eq?: Value<number>;
  Lte?: Value<number>;
  constructor(properties: NumberFilter) {
    Object.assign(this, properties);
  }
}

export class RelatedFinding {
  ProductArn!: Value<string>;
  Id!: { [key: string]: any };
  constructor(properties: RelatedFinding) {
    Object.assign(this, properties);
  }
}

export class SeverityUpdate {
  Normalized?: Value<number>;
  Label?: Value<string>;
  Product?: Value<number>;
  constructor(properties: SeverityUpdate) {
    Object.assign(this, properties);
  }
}

export class StringFilter {
  Comparison!: Value<string>;
  Value!: Value<string>;
  constructor(properties: StringFilter) {
    Object.assign(this, properties);
  }
}

export class WorkflowUpdate {
  Status!: Value<string>;
  constructor(properties: WorkflowUpdate) {
    Object.assign(this, properties);
  }
}
export interface AutomationRuleProperties {
  Description: Value<string>;
  Actions: List<AutomationRulesAction>;
  IsTerminal?: Value<boolean>;
  RuleStatus?: Value<string>;
  Criteria: AutomationRulesFindingFilters;
  RuleOrder: Value<number>;
  RuleName: Value<string>;
  Tags?: { [key: string]: Value<string> };
}
export default class AutomationRule extends ResourceBase<AutomationRuleProperties> {
  static AutomationRulesAction = AutomationRulesAction;
  static AutomationRulesFindingFieldsUpdate = AutomationRulesFindingFieldsUpdate;
  static AutomationRulesFindingFilters = AutomationRulesFindingFilters;
  static DateFilter = DateFilter;
  static DateRange = DateRange;
  static MapFilter = MapFilter;
  static NoteUpdate = NoteUpdate;
  static NumberFilter = NumberFilter;
  static RelatedFinding = RelatedFinding;
  static SeverityUpdate = SeverityUpdate;
  static StringFilter = StringFilter;
  static WorkflowUpdate = WorkflowUpdate;
  constructor(properties: AutomationRuleProperties) {
    super('AWS::SecurityHub::AutomationRule', properties);
  }
}
