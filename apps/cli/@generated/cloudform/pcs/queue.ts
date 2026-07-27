import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ComputeNodeGroupConfiguration {
  ComputeNodeGroupId?: Value<string>;
  constructor(properties: ComputeNodeGroupConfiguration) {
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
export interface QueueProperties {
  ClusterId: Value<string>;
  ComputeNodeGroupConfigurations?: List<ComputeNodeGroupConfiguration>;
  SlurmConfiguration?: SlurmConfiguration;
  Tags?: { [key: string]: Value<string> };
  Name?: Value<string>;
}
export default class Queue extends ResourceBase<QueueProperties> {
  static ComputeNodeGroupConfiguration = ComputeNodeGroupConfiguration;
  static ErrorInfo = ErrorInfo;
  static SlurmConfiguration = SlurmConfiguration;
  static SlurmCustomSetting = SlurmCustomSetting;
  constructor(properties: QueueProperties) {
    super('AWS::PCS::Queue', properties);
  }
}
