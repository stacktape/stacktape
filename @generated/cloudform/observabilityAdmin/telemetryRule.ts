import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ActionCondition {
  Action?: Value<string>;
  constructor(properties: ActionCondition) {
    Object.assign(this, properties);
  }
}

export class AdvancedEventSelector {
  FieldSelectors!: List<AdvancedFieldSelector>;
  Name?: Value<string>;
  constructor(properties: AdvancedEventSelector) {
    Object.assign(this, properties);
  }
}

export class AdvancedFieldSelector {
  Field?: Value<string>;
  Equals?: List<Value<string>>;
  NotStartsWith?: List<Value<string>>;
  NotEndsWith?: List<Value<string>>;
  StartsWith?: List<Value<string>>;
  EndsWith?: List<Value<string>>;
  NotEquals?: List<Value<string>>;
  constructor(properties: AdvancedFieldSelector) {
    Object.assign(this, properties);
  }
}

export class CloudtrailParameters {
  AdvancedEventSelectors!: List<AdvancedEventSelector>;
  constructor(properties: CloudtrailParameters) {
    Object.assign(this, properties);
  }
}

export class Condition {
  LabelNameCondition?: LabelNameCondition;
  ActionCondition?: ActionCondition;
  constructor(properties: Condition) {
    Object.assign(this, properties);
  }
}

export class ELBLoadBalancerLoggingParameters {
  FieldDelimiter?: Value<string>;
  OutputFormat?: Value<string>;
  constructor(properties: ELBLoadBalancerLoggingParameters) {
    Object.assign(this, properties);
  }
}

export class FieldToMatch {
  UriPath?: Value<string>;
  QueryString?: Value<string>;
  Method?: Value<string>;
  SingleHeader?: SingleHeader;
  constructor(properties: FieldToMatch) {
    Object.assign(this, properties);
  }
}

export class Filter {
  Requirement?: Value<string>;
  Behavior?: Value<string>;
  Conditions?: List<Condition>;
  constructor(properties: Filter) {
    Object.assign(this, properties);
  }
}

export class LabelNameCondition {
  LabelName?: Value<string>;
  constructor(properties: LabelNameCondition) {
    Object.assign(this, properties);
  }
}

export class LogDeliveryParameters {
  LogTypes?: List<Value<string>>;
  constructor(properties: LogDeliveryParameters) {
    Object.assign(this, properties);
  }
}

export class LoggingFilter {
  Filters?: List<Filter>;
  DefaultBehavior?: Value<string>;
  constructor(properties: LoggingFilter) {
    Object.assign(this, properties);
  }
}

export class RegionStatus {
  Status?: Value<string>;
  RuleArn?: Value<string>;
  Region?: Value<string>;
  constructor(properties: RegionStatus) {
    Object.assign(this, properties);
  }
}

export class SingleHeader {
  Name!: Value<string>;
  constructor(properties: SingleHeader) {
    Object.assign(this, properties);
  }
}

export class TelemetryDestinationConfiguration {
  RetentionInDays?: Value<number>;
  DestinationPattern?: Value<string>;
  ELBLoadBalancerLoggingParameters?: ELBLoadBalancerLoggingParameters;
  VPCFlowLogParameters?: VPCFlowLogParameters;
  CloudtrailParameters?: CloudtrailParameters;
  WAFLoggingParameters?: WAFLoggingParameters;
  LogDeliveryParameters?: LogDeliveryParameters;
  DestinationType?: Value<string>;
  constructor(properties: TelemetryDestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class TelemetryRuleInner {
  TelemetrySourceTypes?: List<Value<string>>;
  DestinationConfiguration?: TelemetryDestinationConfiguration;
  AllowFieldUpdates?: Value<boolean>;
  AllRegions?: Value<boolean>;
  SelectionCriteria?: Value<string>;
  ResourceType!: Value<string>;
  Regions?: List<Value<string>>;
  TelemetryType!: Value<string>;
  constructor(properties: TelemetryRuleInner) {
    Object.assign(this, properties);
  }
}

export class VPCFlowLogParameters {
  LogFormat?: Value<string>;
  MaxAggregationInterval?: Value<number>;
  TrafficType?: Value<string>;
  constructor(properties: VPCFlowLogParameters) {
    Object.assign(this, properties);
  }
}

export class WAFLoggingParameters {
  RedactedFields?: List<FieldToMatch>;
  LoggingFilter?: LoggingFilter;
  LogType?: Value<string>;
  constructor(properties: WAFLoggingParameters) {
    Object.assign(this, properties);
  }
}
export interface TelemetryRuleProperties {
  Rule: TelemetryRule;
  RuleName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class TelemetryRule extends ResourceBase<TelemetryRuleProperties> {
  static ActionCondition = ActionCondition;
  static AdvancedEventSelector = AdvancedEventSelector;
  static AdvancedFieldSelector = AdvancedFieldSelector;
  static CloudtrailParameters = CloudtrailParameters;
  static Condition = Condition;
  static ELBLoadBalancerLoggingParameters = ELBLoadBalancerLoggingParameters;
  static FieldToMatch = FieldToMatch;
  static Filter = Filter;
  static LabelNameCondition = LabelNameCondition;
  static LogDeliveryParameters = LogDeliveryParameters;
  static LoggingFilter = LoggingFilter;
  static RegionStatus = RegionStatus;
  static SingleHeader = SingleHeader;
  static TelemetryDestinationConfiguration = TelemetryDestinationConfiguration;
  static TelemetryRule = TelemetryRuleInner;
  static VPCFlowLogParameters = VPCFlowLogParameters;
  static WAFLoggingParameters = WAFLoggingParameters;
  constructor(properties: TelemetryRuleProperties) {
    super('AWS::ObservabilityAdmin::TelemetryRule', properties);
  }
}
