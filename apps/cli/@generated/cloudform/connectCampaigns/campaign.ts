import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AgentlessDialerConfig {
  DialingCapacity?: Value<number>;
  constructor(properties: AgentlessDialerConfig) {
    Object.assign(this, properties);
  }
}

export class AnswerMachineDetectionConfig {
  EnableAnswerMachineDetection!: Value<boolean>;
  AwaitAnswerMachinePrompt?: Value<boolean>;
  constructor(properties: AnswerMachineDetectionConfig) {
    Object.assign(this, properties);
  }
}

export class DialerConfig {
  AgentlessDialerConfig?: AgentlessDialerConfig;
  PredictiveDialerConfig?: PredictiveDialerConfig;
  ProgressiveDialerConfig?: ProgressiveDialerConfig;
  constructor(properties: DialerConfig) {
    Object.assign(this, properties);
  }
}

export class OutboundCallConfig {
  ConnectContactFlowArn!: Value<string>;
  ConnectQueueArn?: Value<string>;
  AnswerMachineDetectionConfig?: AnswerMachineDetectionConfig;
  ConnectSourcePhoneNumber?: Value<string>;
  constructor(properties: OutboundCallConfig) {
    Object.assign(this, properties);
  }
}

export class PredictiveDialerConfig {
  DialingCapacity?: Value<number>;
  BandwidthAllocation!: Value<number>;
  constructor(properties: PredictiveDialerConfig) {
    Object.assign(this, properties);
  }
}

export class ProgressiveDialerConfig {
  DialingCapacity?: Value<number>;
  BandwidthAllocation!: Value<number>;
  constructor(properties: ProgressiveDialerConfig) {
    Object.assign(this, properties);
  }
}
export interface CampaignProperties {
  OutboundCallConfig: OutboundCallConfig;
  ConnectInstanceArn: Value<string>;
  DialerConfig: DialerConfig;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Campaign extends ResourceBase<CampaignProperties> {
  static AgentlessDialerConfig = AgentlessDialerConfig;
  static AnswerMachineDetectionConfig = AnswerMachineDetectionConfig;
  static DialerConfig = DialerConfig;
  static OutboundCallConfig = OutboundCallConfig;
  static PredictiveDialerConfig = PredictiveDialerConfig;
  static ProgressiveDialerConfig = ProgressiveDialerConfig;
  constructor(properties: CampaignProperties) {
    super('AWS::ConnectCampaigns::Campaign', properties);
  }
}
