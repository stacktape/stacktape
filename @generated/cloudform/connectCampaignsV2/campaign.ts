import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AnswerMachineDetectionConfig {
  EnableAnswerMachineDetection!: Value<boolean>;
  AwaitAnswerMachinePrompt?: Value<boolean>;
  constructor(properties: AnswerMachineDetectionConfig) {
    Object.assign(this, properties);
  }
}

export class ChannelSubtypeConfig {
  Email?: EmailChannelSubtypeConfig;
  Telephony?: TelephonyChannelSubtypeConfig;
  Sms?: SmsChannelSubtypeConfig;
  constructor(properties: ChannelSubtypeConfig) {
    Object.assign(this, properties);
  }
}

export class CommunicationLimit {
  Frequency!: Value<number>;
  MaxCountPerRecipient!: Value<number>;
  Unit!: Value<string>;
  constructor(properties: CommunicationLimit) {
    Object.assign(this, properties);
  }
}

export class CommunicationLimits {
  CommunicationLimitList?: List<CommunicationLimit>;
  constructor(properties: CommunicationLimits) {
    Object.assign(this, properties);
  }
}

export class CommunicationLimitsConfig {
  AllChannelsSubtypes?: CommunicationLimits;
  InstanceLimitsHandling?: Value<string>;
  constructor(properties: CommunicationLimitsConfig) {
    Object.assign(this, properties);
  }
}

export class CommunicationTimeConfig {
  LocalTimeZoneConfig!: LocalTimeZoneConfig;
  Email?: TimeWindow;
  Telephony?: TimeWindow;
  Sms?: TimeWindow;
  constructor(properties: CommunicationTimeConfig) {
    Object.assign(this, properties);
  }
}

export class DailyHour {
  Value?: List<TimeRange>;
  Key?: Value<string>;
  constructor(properties: DailyHour) {
    Object.assign(this, properties);
  }
}

export class EmailChannelSubtypeConfig {
  OutboundMode!: EmailOutboundMode;
  Capacity?: Value<number>;
  DefaultOutboundConfig!: EmailOutboundConfig;
  constructor(properties: EmailChannelSubtypeConfig) {
    Object.assign(this, properties);
  }
}

export class EmailOutboundConfig {
  ConnectSourceEmailAddress!: Value<string>;
  SourceEmailAddressDisplayName?: Value<string>;
  WisdomTemplateArn!: Value<string>;
  constructor(properties: EmailOutboundConfig) {
    Object.assign(this, properties);
  }
}

export class EmailOutboundMode {
  AgentlessConfig?: { [key: string]: any };
  constructor(properties: EmailOutboundMode) {
    Object.assign(this, properties);
  }
}

export class EventTrigger {
  CustomerProfilesDomainArn?: Value<string>;
  constructor(properties: EventTrigger) {
    Object.assign(this, properties);
  }
}

export class LocalTimeZoneConfig {
  DefaultTimeZone?: Value<string>;
  LocalTimeZoneDetection?: List<Value<string>>;
  constructor(properties: LocalTimeZoneConfig) {
    Object.assign(this, properties);
  }
}

export class OpenHours {
  DailyHours!: List<DailyHour>;
  constructor(properties: OpenHours) {
    Object.assign(this, properties);
  }
}

export class PredictiveConfig {
  BandwidthAllocation!: Value<number>;
  constructor(properties: PredictiveConfig) {
    Object.assign(this, properties);
  }
}

export class PreviewConfig {
  TimeoutConfig!: TimeoutConfig;
  AgentActions?: List<Value<string>>;
  BandwidthAllocation!: Value<number>;
  constructor(properties: PreviewConfig) {
    Object.assign(this, properties);
  }
}

export class ProgressiveConfig {
  BandwidthAllocation!: Value<number>;
  constructor(properties: ProgressiveConfig) {
    Object.assign(this, properties);
  }
}

export class RestrictedPeriod {
  StartDate!: Value<string>;
  EndDate!: Value<string>;
  Name?: Value<string>;
  constructor(properties: RestrictedPeriod) {
    Object.assign(this, properties);
  }
}

export class RestrictedPeriods {
  RestrictedPeriodList!: List<RestrictedPeriod>;
  constructor(properties: RestrictedPeriods) {
    Object.assign(this, properties);
  }
}

export class Schedule {
  EndTime!: Value<string>;
  StartTime!: Value<string>;
  RefreshFrequency?: Value<string>;
  constructor(properties: Schedule) {
    Object.assign(this, properties);
  }
}

export class SmsChannelSubtypeConfig {
  OutboundMode!: SmsOutboundMode;
  Capacity?: Value<number>;
  DefaultOutboundConfig!: SmsOutboundConfig;
  constructor(properties: SmsChannelSubtypeConfig) {
    Object.assign(this, properties);
  }
}

export class SmsOutboundConfig {
  ConnectSourcePhoneNumberArn!: Value<string>;
  WisdomTemplateArn!: Value<string>;
  constructor(properties: SmsOutboundConfig) {
    Object.assign(this, properties);
  }
}

export class SmsOutboundMode {
  AgentlessConfig?: { [key: string]: any };
  constructor(properties: SmsOutboundMode) {
    Object.assign(this, properties);
  }
}

export class Source {
  CustomerProfilesSegmentArn?: Value<string>;
  EventTrigger?: EventTrigger;
  constructor(properties: Source) {
    Object.assign(this, properties);
  }
}

export class TelephonyChannelSubtypeConfig {
  OutboundMode!: TelephonyOutboundMode;
  Capacity?: Value<number>;
  ConnectQueueId?: Value<string>;
  DefaultOutboundConfig!: TelephonyOutboundConfig;
  constructor(properties: TelephonyChannelSubtypeConfig) {
    Object.assign(this, properties);
  }
}

export class TelephonyOutboundConfig {
  ConnectContactFlowId!: Value<string>;
  AnswerMachineDetectionConfig?: AnswerMachineDetectionConfig;
  ConnectSourcePhoneNumber?: Value<string>;
  constructor(properties: TelephonyOutboundConfig) {
    Object.assign(this, properties);
  }
}

export class TelephonyOutboundMode {
  ProgressiveConfig?: ProgressiveConfig;
  PredictiveConfig?: PredictiveConfig;
  AgentlessConfig?: { [key: string]: any };
  PreviewConfig?: PreviewConfig;
  constructor(properties: TelephonyOutboundMode) {
    Object.assign(this, properties);
  }
}

export class TimeRange {
  EndTime!: Value<string>;
  StartTime!: Value<string>;
  constructor(properties: TimeRange) {
    Object.assign(this, properties);
  }
}

export class TimeWindow {
  OpenHours!: OpenHours;
  RestrictedPeriods?: RestrictedPeriods;
  constructor(properties: TimeWindow) {
    Object.assign(this, properties);
  }
}

export class TimeoutConfig {
  DurationInSeconds?: Value<number>;
  constructor(properties: TimeoutConfig) {
    Object.assign(this, properties);
  }
}
export interface CampaignProperties {
  CommunicationLimitsOverride?: CommunicationLimitsConfig;
  ChannelSubtypeConfig: ChannelSubtypeConfig;
  ConnectCampaignFlowArn?: Value<string>;
  Schedule?: Schedule;
  CommunicationTimeConfig?: CommunicationTimeConfig;
  ConnectInstanceId: Value<string>;
  Source?: Source;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Campaign extends ResourceBase<CampaignProperties> {
  static AnswerMachineDetectionConfig = AnswerMachineDetectionConfig;
  static ChannelSubtypeConfig = ChannelSubtypeConfig;
  static CommunicationLimit = CommunicationLimit;
  static CommunicationLimits = CommunicationLimits;
  static CommunicationLimitsConfig = CommunicationLimitsConfig;
  static CommunicationTimeConfig = CommunicationTimeConfig;
  static DailyHour = DailyHour;
  static EmailChannelSubtypeConfig = EmailChannelSubtypeConfig;
  static EmailOutboundConfig = EmailOutboundConfig;
  static EmailOutboundMode = EmailOutboundMode;
  static EventTrigger = EventTrigger;
  static LocalTimeZoneConfig = LocalTimeZoneConfig;
  static OpenHours = OpenHours;
  static PredictiveConfig = PredictiveConfig;
  static PreviewConfig = PreviewConfig;
  static ProgressiveConfig = ProgressiveConfig;
  static RestrictedPeriod = RestrictedPeriod;
  static RestrictedPeriods = RestrictedPeriods;
  static Schedule = Schedule;
  static SmsChannelSubtypeConfig = SmsChannelSubtypeConfig;
  static SmsOutboundConfig = SmsOutboundConfig;
  static SmsOutboundMode = SmsOutboundMode;
  static Source = Source;
  static TelephonyChannelSubtypeConfig = TelephonyChannelSubtypeConfig;
  static TelephonyOutboundConfig = TelephonyOutboundConfig;
  static TelephonyOutboundMode = TelephonyOutboundMode;
  static TimeRange = TimeRange;
  static TimeWindow = TimeWindow;
  static TimeoutConfig = TimeoutConfig;
  constructor(properties: CampaignProperties) {
    super('AWS::ConnectCampaignsV2::Campaign', properties);
  }
}
