import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class NotificationContent {
  DeDE?: Value<string>;
  PtBR?: Value<string>;
  ZhCN?: Value<string>;
  IdID?: Value<string>;
  ItIT?: Value<string>;
  EnUS?: Value<string>;
  KoKR?: Value<string>;
  FrFR?: Value<string>;
  ZhTW?: Value<string>;
  EsES?: Value<string>;
  JaJP?: Value<string>;
  constructor(properties: NotificationContent) {
    Object.assign(this, properties);
  }
}
export interface NotificationProperties {
  Recipients?: List<Value<string>>;
  Content: NotificationContent;
  Priority?: Value<string>;
  InstanceArn: Value<string>;
  ExpiresAt?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Notification extends ResourceBase<NotificationProperties> {
  static NotificationContent = NotificationContent;
  constructor(properties: NotificationProperties) {
    super('AWS::Connect::Notification', properties);
  }
}
