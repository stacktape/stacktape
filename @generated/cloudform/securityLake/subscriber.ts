import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AwsLogSource {
  SourceName?: Value<string>;
  SourceVersion?: Value<string>;
  constructor(properties: AwsLogSource) {
    Object.assign(this, properties);
  }
}

export class CustomLogSource {
  SourceName?: Value<string>;
  SourceVersion?: Value<string>;
  constructor(properties: CustomLogSource) {
    Object.assign(this, properties);
  }
}

export class Source {
  AwsLogSource?: AwsLogSource;
  CustomLogSource?: CustomLogSource;
  constructor(properties: Source) {
    Object.assign(this, properties);
  }
}

export class SubscriberIdentity {
  ExternalId!: Value<string>;
  Principal!: Value<string>;
  constructor(properties: SubscriberIdentity) {
    Object.assign(this, properties);
  }
}
export interface SubscriberProperties {
  SubscriberIdentity: SubscriberIdentity;
  SubscriberName: Value<string>;
  SubscriberDescription?: Value<string>;
  AccessTypes: List<Value<string>>;
  Sources: List<Source>;
  DataLakeArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Subscriber extends ResourceBase<SubscriberProperties> {
  static AwsLogSource = AwsLogSource;
  static CustomLogSource = CustomLogSource;
  static Source = Source;
  static SubscriberIdentity = SubscriberIdentity;
  constructor(properties: SubscriberProperties) {
    super('AWS::SecurityLake::Subscriber', properties);
  }
}
