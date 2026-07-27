import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Compliance {
  Type?: Value<string>;
  constructor(properties: Compliance) {
    Object.assign(this, properties);
  }
}

export class CustomPolicyDetails {
  EnableDebugLogDelivery?: Value<boolean>;
  PolicyText?: Value<string>;
  PolicyRuntime?: Value<string>;
  constructor(properties: CustomPolicyDetails) {
    Object.assign(this, properties);
  }
}

export class EvaluationModeConfiguration {
  Mode?: Value<string>;
  constructor(properties: EvaluationModeConfiguration) {
    Object.assign(this, properties);
  }
}

export class Scope {
  ComplianceResourceId?: Value<string>;
  TagKey?: Value<string>;
  ComplianceResourceTypes?: List<Value<string>>;
  TagValue?: Value<string>;
  constructor(properties: Scope) {
    Object.assign(this, properties);
  }
}

export class Source {
  Owner!: Value<string>;
  CustomPolicyDetails?: CustomPolicyDetails;
  SourceIdentifier?: Value<string>;
  SourceDetails?: List<SourceDetail>;
  constructor(properties: Source) {
    Object.assign(this, properties);
  }
}

export class SourceDetail {
  EventSource!: Value<string>;
  MaximumExecutionFrequency?: Value<string>;
  MessageType!: Value<string>;
  constructor(properties: SourceDetail) {
    Object.assign(this, properties);
  }
}
export interface ConfigRuleProperties {
  EvaluationModes?: List<EvaluationModeConfiguration>;
  Description?: Value<string>;
  Scope?: Scope;
  Compliance?: Compliance;
  ConfigRuleName?: Value<string>;
  MaximumExecutionFrequency?: Value<string>;
  Source: Source;
  InputParameters?: { [key: string]: any };
}
export default class ConfigRule extends ResourceBase<ConfigRuleProperties> {
  static Compliance = Compliance;
  static CustomPolicyDetails = CustomPolicyDetails;
  static EvaluationModeConfiguration = EvaluationModeConfiguration;
  static Scope = Scope;
  static Source = Source;
  static SourceDetail = SourceDetail;
  constructor(properties: ConfigRuleProperties) {
    super('AWS::Config::ConfigRule', properties);
  }
}
