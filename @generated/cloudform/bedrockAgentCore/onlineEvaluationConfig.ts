import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CloudWatchLogsInputConfig {
  LogGroupNames!: List<Value<string>>;
  ServiceNames!: List<Value<string>>;
  constructor(properties: CloudWatchLogsInputConfig) {
    Object.assign(this, properties);
  }
}

export class CloudWatchOutputConfig {
  LogGroupName?: Value<string>;
  constructor(properties: CloudWatchOutputConfig) {
    Object.assign(this, properties);
  }
}

export class DataSourceConfig {
  CloudWatchLogs!: CloudWatchLogsInputConfig;
  constructor(properties: DataSourceConfig) {
    Object.assign(this, properties);
  }
}

export class EvaluatorReference {
  EvaluatorId!: Value<string>;
  constructor(properties: EvaluatorReference) {
    Object.assign(this, properties);
  }
}

export class Filter {
  Operator!: Value<string>;
  Value!: FilterValue;
  Key!: Value<string>;
  constructor(properties: Filter) {
    Object.assign(this, properties);
  }
}

export class FilterValue {
  DoubleValue?: Value<number>;
  BooleanValue?: Value<boolean>;
  StringValue?: Value<string>;
  constructor(properties: FilterValue) {
    Object.assign(this, properties);
  }
}

export class OutputConfig {
  CloudWatchConfig?: CloudWatchOutputConfig;
  constructor(properties: OutputConfig) {
    Object.assign(this, properties);
  }
}

export class Rule {
  Filters?: List<Filter>;
  SessionConfig?: SessionConfig;
  SamplingConfig!: SamplingConfig;
  constructor(properties: Rule) {
    Object.assign(this, properties);
  }
}

export class SamplingConfig {
  SamplingPercentage!: Value<number>;
  constructor(properties: SamplingConfig) {
    Object.assign(this, properties);
  }
}

export class SessionConfig {
  SessionTimeoutMinutes!: Value<number>;
  constructor(properties: SessionConfig) {
    Object.assign(this, properties);
  }
}
export interface OnlineEvaluationConfigProperties {
  OnlineEvaluationConfigName: Value<string>;
  Description?: Value<string>;
  ExecutionStatus?: Value<string>;
  DataSourceConfig: DataSourceConfig;
  EvaluationExecutionRoleArn: Value<string>;
  Evaluators: List<EvaluatorReference>;
  Rule: Rule;
  Tags?: List<ResourceTag>;
}
export default class OnlineEvaluationConfig extends ResourceBase<OnlineEvaluationConfigProperties> {
  static CloudWatchLogsInputConfig = CloudWatchLogsInputConfig;
  static CloudWatchOutputConfig = CloudWatchOutputConfig;
  static DataSourceConfig = DataSourceConfig;
  static EvaluatorReference = EvaluatorReference;
  static Filter = Filter;
  static FilterValue = FilterValue;
  static OutputConfig = OutputConfig;
  static Rule = Rule;
  static SamplingConfig = SamplingConfig;
  static SessionConfig = SessionConfig;
  constructor(properties: OnlineEvaluationConfigProperties) {
    super('AWS::BedrockAgentCore::OnlineEvaluationConfig', properties);
  }
}
