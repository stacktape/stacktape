import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class MessageReviewHandler {
  FallbackResult?: Value<string>;
  Uri?: Value<string>;
  constructor(properties: MessageReviewHandler) {
    Object.assign(this, properties);
  }
}
export interface RoomProperties {
  MaximumMessageRatePerSecond?: Value<number>;
  MaximumMessageLength?: Value<number>;
  MessageReviewHandler?: MessageReviewHandler;
  LoggingConfigurationIdentifiers?: List<Value<string>>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class Room extends ResourceBase<RoomProperties> {
  static MessageReviewHandler = MessageReviewHandler;
  constructor(properties?: RoomProperties) {
    super('AWS::IVSChat::Room', properties || {});
  }
}
