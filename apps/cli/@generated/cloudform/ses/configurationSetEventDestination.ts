import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class CloudWatchDestination {
  DimensionConfigurations?: List<DimensionConfiguration>;
  constructor(properties: CloudWatchDestination) {
    Object.assign(this, properties);
  }
}

export class DimensionConfiguration {
  DimensionValueSource!: Value<string>;
  DefaultDimensionValue!: Value<string>;
  DimensionName!: Value<string>;
  constructor(properties: DimensionConfiguration) {
    Object.assign(this, properties);
  }
}

export class EventBridgeDestination {
  EventBusArn!: Value<string>;
  constructor(properties: EventBridgeDestination) {
    Object.assign(this, properties);
  }
}

export class EventDestination {
  SnsDestination?: SnsDestination;
  CloudWatchDestination?: CloudWatchDestination;
  Enabled?: Value<boolean>;
  MatchingEventTypes!: List<Value<string>>;
  EventBridgeDestination?: EventBridgeDestination;
  Name?: Value<string>;
  KinesisFirehoseDestination?: KinesisFirehoseDestination;
  constructor(properties: EventDestination) {
    Object.assign(this, properties);
  }
}

export class KinesisFirehoseDestination {
  IAMRoleARN!: Value<string>;
  DeliveryStreamARN!: Value<string>;
  constructor(properties: KinesisFirehoseDestination) {
    Object.assign(this, properties);
  }
}

export class SnsDestination {
  TopicARN!: Value<string>;
  constructor(properties: SnsDestination) {
    Object.assign(this, properties);
  }
}
export interface ConfigurationSetEventDestinationProperties {
  ConfigurationSetName: Value<string>;
  EventDestination: EventDestination;
}
export default class ConfigurationSetEventDestination extends ResourceBase<ConfigurationSetEventDestinationProperties> {
  static CloudWatchDestination = CloudWatchDestination;
  static DimensionConfiguration = DimensionConfiguration;
  static EventBridgeDestination = EventBridgeDestination;
  static EventDestination = EventDestination;
  static KinesisFirehoseDestination = KinesisFirehoseDestination;
  static SnsDestination = SnsDestination;
  constructor(properties: ConfigurationSetEventDestinationProperties) {
    super('AWS::SES::ConfigurationSetEventDestination', properties);
  }
}
