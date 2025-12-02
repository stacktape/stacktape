import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ActionCondition {
  Action!: Value<string>;
  constructor(properties: ActionCondition) {
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

export class FieldToMatch {
  QueryString?: { [key: string]: any };
  UriPath?: { [key: string]: any };
  Method?: { [key: string]: any };
  SingleHeader?: SingleHeader;
  constructor(properties: FieldToMatch) {
    Object.assign(this, properties);
  }
}

export class Filter {
  Requirement!: Value<string>;
  Behavior!: Value<string>;
  Conditions!: List<Condition>;
  constructor(properties: Filter) {
    Object.assign(this, properties);
  }
}

export class LabelNameCondition {
  LabelName!: Value<string>;
  constructor(properties: LabelNameCondition) {
    Object.assign(this, properties);
  }
}

export class LoggingFilter {
  Filters!: List<Filter>;
  DefaultBehavior!: Value<string>;
  constructor(properties: LoggingFilter) {
    Object.assign(this, properties);
  }
}

export class SingleHeader {
  Name!: Value<string>;
  constructor(properties: SingleHeader) {
    Object.assign(this, properties);
  }
}
export interface LoggingConfigurationProperties {
  ResourceArn: Value<string>;
  LogDestinationConfigs: List<Value<string>>;
  RedactedFields?: List<FieldToMatch>;
  LoggingFilter?: LoggingFilter;
}
export default class LoggingConfiguration extends ResourceBase<LoggingConfigurationProperties> {
  static ActionCondition = ActionCondition;
  static Condition = Condition;
  static FieldToMatch = FieldToMatch;
  static Filter = Filter;
  static LabelNameCondition = LabelNameCondition;
  static LoggingFilter = LoggingFilter;
  static SingleHeader = SingleHeader;
  constructor(properties: LoggingConfigurationProperties) {
    super('AWS::WAFv2::LoggingConfiguration', properties);
  }
}
