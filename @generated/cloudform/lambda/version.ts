import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class FunctionScalingConfig {
  MinExecutionEnvironments?: Value<number>;
  MaxExecutionEnvironments?: Value<number>;
  constructor(properties: FunctionScalingConfig) {
    Object.assign(this, properties);
  }
}

export class ProvisionedConcurrencyConfiguration {
  ProvisionedConcurrentExecutions!: Value<number>;
  constructor(properties: ProvisionedConcurrencyConfiguration) {
    Object.assign(this, properties);
  }
}

export class RuntimePolicy {
  UpdateRuntimeOn!: Value<string>;
  RuntimeVersionArn?: Value<string>;
  constructor(properties: RuntimePolicy) {
    Object.assign(this, properties);
  }
}
export interface VersionProperties {
  FunctionScalingConfig?: FunctionScalingConfig;
  FunctionName: Value<string>;
  ProvisionedConcurrencyConfig?: ProvisionedConcurrencyConfiguration;
  Description?: Value<string>;
  RuntimePolicy?: RuntimePolicy;
  CodeSha256?: Value<string>;
}
export default class Version extends ResourceBase<VersionProperties> {
  static FunctionScalingConfig = FunctionScalingConfig;
  static ProvisionedConcurrencyConfiguration = ProvisionedConcurrencyConfiguration;
  static RuntimePolicy = RuntimePolicy;
  constructor(properties: VersionProperties) {
    super('AWS::Lambda::Version', properties);
  }
}
