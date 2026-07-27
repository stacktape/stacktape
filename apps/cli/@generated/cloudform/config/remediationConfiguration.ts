import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ExecutionControls {
  SsmControls?: SsmControls;
  constructor(properties: ExecutionControls) {
    Object.assign(this, properties);
  }
}

export class RemediationParameterValue {
  ResourceValue?: ResourceValue;
  StaticValue?: StaticValue;
  constructor(properties: RemediationParameterValue) {
    Object.assign(this, properties);
  }
}

export class ResourceValue {
  Value?: Value<string>;
  constructor(properties: ResourceValue) {
    Object.assign(this, properties);
  }
}

export class SsmControls {
  ErrorPercentage?: Value<number>;
  ConcurrentExecutionRatePercentage?: Value<number>;
  constructor(properties: SsmControls) {
    Object.assign(this, properties);
  }
}

export class StaticValue {
  Values?: List<Value<string>>;
  constructor(properties: StaticValue) {
    Object.assign(this, properties);
  }
}
export interface RemediationConfigurationProperties {
  TargetVersion?: Value<string>;
  ExecutionControls?: ExecutionControls;
  Parameters?: { [key: string]: any };
  TargetType: Value<string>;
  ConfigRuleName: Value<string>;
  ResourceType?: Value<string>;
  RetryAttemptSeconds?: Value<number>;
  MaximumAutomaticAttempts?: Value<number>;
  TargetId: Value<string>;
  Automatic?: Value<boolean>;
}
export default class RemediationConfiguration extends ResourceBase<RemediationConfigurationProperties> {
  static ExecutionControls = ExecutionControls;
  static RemediationParameterValue = RemediationParameterValue;
  static ResourceValue = ResourceValue;
  static SsmControls = SsmControls;
  static StaticValue = StaticValue;
  constructor(properties: RemediationConfigurationProperties) {
    super('AWS::Config::RemediationConfiguration', properties);
  }
}
