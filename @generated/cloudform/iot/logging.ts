import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class EventConfiguration {
  EventType!: Value<string>;
  LogDestination?: Value<string>;
  LogLevel?: Value<string>;
  constructor(properties: EventConfiguration) {
    Object.assign(this, properties);
  }
}
export interface LoggingProperties {
  AccountId: Value<string>;
  EventConfigurations?: List<EventConfiguration>;
  RoleArn: Value<string>;
  DefaultLogLevel: Value<string>;
}
export default class Logging extends ResourceBase<LoggingProperties> {
  static EventConfiguration = EventConfiguration;
  constructor(properties: LoggingProperties) {
    super('AWS::IoT::Logging', properties);
  }
}
