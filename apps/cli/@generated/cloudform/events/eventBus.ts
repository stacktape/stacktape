import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DeadLetterConfig {
  Arn?: Value<string>;
  constructor(properties: DeadLetterConfig) {
    Object.assign(this, properties);
  }
}

export class LogConfig {
  IncludeDetail?: Value<string>;
  Level?: Value<string>;
  constructor(properties: LogConfig) {
    Object.assign(this, properties);
  }
}
export interface EventBusProperties {
  Policy?: { [key: string]: any };
  KmsKeyIdentifier?: Value<string>;
  Description?: Value<string>;
  EventSourceName?: Value<string>;
  DeadLetterConfig?: DeadLetterConfig;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
  LogConfig?: LogConfig;
}
export default class EventBus extends ResourceBase<EventBusProperties> {
  static DeadLetterConfig = DeadLetterConfig;
  static LogConfig = LogConfig;
  constructor(properties: EventBusProperties) {
    super('AWS::Events::EventBus', properties);
  }
}
