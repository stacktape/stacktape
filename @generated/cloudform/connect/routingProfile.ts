import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CrossChannelBehavior {
  BehaviorType!: Value<string>;
  constructor(properties: CrossChannelBehavior) {
    Object.assign(this, properties);
  }
}

export class MediaConcurrency {
  Concurrency!: Value<number>;
  Channel!: Value<string>;
  CrossChannelBehavior?: CrossChannelBehavior;
  constructor(properties: MediaConcurrency) {
    Object.assign(this, properties);
  }
}

export class RoutingProfileManualAssignmentQueueConfig {
  QueueReference!: RoutingProfileQueueReference;
  constructor(properties: RoutingProfileManualAssignmentQueueConfig) {
    Object.assign(this, properties);
  }
}

export class RoutingProfileQueueConfig {
  Priority!: Value<number>;
  QueueReference!: RoutingProfileQueueReference;
  Delay!: Value<number>;
  constructor(properties: RoutingProfileQueueConfig) {
    Object.assign(this, properties);
  }
}

export class RoutingProfileQueueReference {
  Channel!: Value<string>;
  QueueArn!: Value<string>;
  constructor(properties: RoutingProfileQueueReference) {
    Object.assign(this, properties);
  }
}
export interface RoutingProfileProperties {
  ManualAssignmentQueueConfigs?: List<RoutingProfileManualAssignmentQueueConfig>;
  Description: Value<string>;
  MediaConcurrencies: List<MediaConcurrency>;
  InstanceArn: Value<string>;
  AgentAvailabilityTimer?: Value<string>;
  QueueConfigs?: List<RoutingProfileQueueConfig>;
  DefaultOutboundQueueArn: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class RoutingProfile extends ResourceBase<RoutingProfileProperties> {
  static CrossChannelBehavior = CrossChannelBehavior;
  static MediaConcurrency = MediaConcurrency;
  static RoutingProfileManualAssignmentQueueConfig = RoutingProfileManualAssignmentQueueConfig;
  static RoutingProfileQueueConfig = RoutingProfileQueueConfig;
  static RoutingProfileQueueReference = RoutingProfileQueueReference;
  constructor(properties: RoutingProfileProperties) {
    super('AWS::Connect::RoutingProfile', properties);
  }
}
