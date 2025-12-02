import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Activity {
  SelectAttributes?: SelectAttributes;
  Datastore?: Datastore;
  Filter?: Filter;
  AddAttributes?: AddAttributes;
  Channel?: Channel;
  DeviceShadowEnrich?: DeviceShadowEnrich;
  Math?: Math;
  Lambda?: Lambda;
  DeviceRegistryEnrich?: DeviceRegistryEnrich;
  RemoveAttributes?: RemoveAttributes;
  constructor(properties: Activity) {
    Object.assign(this, properties);
  }
}

export class AddAttributes {
  Next?: Value<string>;
  Attributes!: { [key: string]: Value<string> };
  Name!: Value<string>;
  constructor(properties: AddAttributes) {
    Object.assign(this, properties);
  }
}

export class Channel {
  ChannelName!: Value<string>;
  Next?: Value<string>;
  Name!: Value<string>;
  constructor(properties: Channel) {
    Object.assign(this, properties);
  }
}

export class Datastore {
  DatastoreName!: Value<string>;
  Name!: Value<string>;
  constructor(properties: Datastore) {
    Object.assign(this, properties);
  }
}

export class DeviceRegistryEnrich {
  Attribute!: Value<string>;
  Next?: Value<string>;
  ThingName!: Value<string>;
  RoleArn!: Value<string>;
  Name!: Value<string>;
  constructor(properties: DeviceRegistryEnrich) {
    Object.assign(this, properties);
  }
}

export class DeviceShadowEnrich {
  Attribute!: Value<string>;
  Next?: Value<string>;
  ThingName!: Value<string>;
  RoleArn!: Value<string>;
  Name!: Value<string>;
  constructor(properties: DeviceShadowEnrich) {
    Object.assign(this, properties);
  }
}

export class Filter {
  Filter!: Value<string>;
  Next?: Value<string>;
  Name!: Value<string>;
  constructor(properties: Filter) {
    Object.assign(this, properties);
  }
}

export class Lambda {
  BatchSize!: Value<number>;
  Next?: Value<string>;
  LambdaName!: Value<string>;
  Name!: Value<string>;
  constructor(properties: Lambda) {
    Object.assign(this, properties);
  }
}

export class Math {
  Attribute!: Value<string>;
  Next?: Value<string>;
  Math!: Value<string>;
  Name!: Value<string>;
  constructor(properties: Math) {
    Object.assign(this, properties);
  }
}

export class RemoveAttributes {
  Next?: Value<string>;
  Attributes!: List<Value<string>>;
  Name!: Value<string>;
  constructor(properties: RemoveAttributes) {
    Object.assign(this, properties);
  }
}

export class SelectAttributes {
  Next?: Value<string>;
  Attributes!: List<Value<string>>;
  Name!: Value<string>;
  constructor(properties: SelectAttributes) {
    Object.assign(this, properties);
  }
}
export interface PipelineProperties {
  PipelineName?: Value<string>;
  Tags?: List<ResourceTag>;
  PipelineActivities: List<Activity>;
}
export default class Pipeline extends ResourceBase<PipelineProperties> {
  static Activity = Activity;
  static AddAttributes = AddAttributes;
  static Channel = Channel;
  static Datastore = Datastore;
  static DeviceRegistryEnrich = DeviceRegistryEnrich;
  static DeviceShadowEnrich = DeviceShadowEnrich;
  static Filter = Filter;
  static Lambda = Lambda;
  static Math = Math;
  static RemoveAttributes = RemoveAttributes;
  static SelectAttributes = SelectAttributes;
  constructor(properties: PipelineProperties) {
    super('AWS::IoTAnalytics::Pipeline', properties);
  }
}
