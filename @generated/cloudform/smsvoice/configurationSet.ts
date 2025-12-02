import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CloudWatchLogsDestination {
  IamRoleArn!: Value<string>;
  LogGroupArn!: Value<string>;
  constructor(properties: CloudWatchLogsDestination) {
    Object.assign(this, properties);
  }
}

export class EventDestination {
  EventDestinationName!: Value<string>;
  SnsDestination?: SnsDestination;
  Enabled!: Value<boolean>;
  MatchingEventTypes!: List<Value<string>>;
  CloudWatchLogsDestination?: CloudWatchLogsDestination;
  KinesisFirehoseDestination?: KinesisFirehoseDestination;
  constructor(properties: EventDestination) {
    Object.assign(this, properties);
  }
}

export class KinesisFirehoseDestination {
  DeliveryStreamArn!: Value<string>;
  IamRoleArn!: Value<string>;
  constructor(properties: KinesisFirehoseDestination) {
    Object.assign(this, properties);
  }
}

export class SnsDestination {
  TopicArn!: Value<string>;
  constructor(properties: SnsDestination) {
    Object.assign(this, properties);
  }
}
export interface ConfigurationSetProperties {
  EventDestinations?: List<EventDestination>;
  MessageFeedbackEnabled?: Value<boolean>;
  ConfigurationSetName?: Value<string>;
  DefaultSenderId?: Value<string>;
  ProtectConfigurationId?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class ConfigurationSet extends ResourceBase<ConfigurationSetProperties> {
  static CloudWatchLogsDestination = CloudWatchLogsDestination;
  static EventDestination = EventDestination;
  static KinesisFirehoseDestination = KinesisFirehoseDestination;
  static SnsDestination = SnsDestination;
  constructor(properties?: ConfigurationSetProperties) {
    super('AWS::SMSVOICE::ConfigurationSet', properties || {});
  }
}
