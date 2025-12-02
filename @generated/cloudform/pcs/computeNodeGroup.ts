import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CustomLaunchTemplate {
  Version!: Value<string>;
  TemplateId?: Value<string>;
  constructor(properties: CustomLaunchTemplate) {
    Object.assign(this, properties);
  }
}

export class ErrorInfo {
  Message?: Value<string>;
  Code?: Value<string>;
  constructor(properties: ErrorInfo) {
    Object.assign(this, properties);
  }
}

export class InstanceConfig {
  InstanceType?: Value<string>;
  constructor(properties: InstanceConfig) {
    Object.assign(this, properties);
  }
}

export class ScalingConfiguration {
  MaxInstanceCount!: Value<number>;
  MinInstanceCount!: Value<number>;
  constructor(properties: ScalingConfiguration) {
    Object.assign(this, properties);
  }
}

export class SlurmConfiguration {
  SlurmCustomSettings?: List<SlurmCustomSetting>;
  constructor(properties: SlurmConfiguration) {
    Object.assign(this, properties);
  }
}

export class SlurmCustomSetting {
  ParameterValue!: Value<string>;
  ParameterName!: Value<string>;
  constructor(properties: SlurmCustomSetting) {
    Object.assign(this, properties);
  }
}

export class SpotOptions {
  AllocationStrategy?: Value<string>;
  constructor(properties: SpotOptions) {
    Object.assign(this, properties);
  }
}
export interface ComputeNodeGroupProperties {
  ClusterId: Value<string>;
  SpotOptions?: SpotOptions;
  SlurmConfiguration?: SlurmConfiguration;
  ScalingConfiguration: ScalingConfiguration;
  InstanceConfigs: List<InstanceConfig>;
  PurchaseOption?: Value<string>;
  CustomLaunchTemplate: CustomLaunchTemplate;
  SubnetIds: List<Value<string>>;
  Tags?: { [key: string]: Value<string> };
  Name?: Value<string>;
  AmiId?: Value<string>;
  IamInstanceProfileArn: Value<string>;
}
export default class ComputeNodeGroup extends ResourceBase<ComputeNodeGroupProperties> {
  static CustomLaunchTemplate = CustomLaunchTemplate;
  static ErrorInfo = ErrorInfo;
  static InstanceConfig = InstanceConfig;
  static ScalingConfiguration = ScalingConfiguration;
  static SlurmConfiguration = SlurmConfiguration;
  static SlurmCustomSetting = SlurmCustomSetting;
  static SpotOptions = SpotOptions;
  constructor(properties: ComputeNodeGroupProperties) {
    super('AWS::PCS::ComputeNodeGroup', properties);
  }
}
