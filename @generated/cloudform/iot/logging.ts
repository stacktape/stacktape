import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface LoggingProperties {
  AccountId: Value<string>;
  RoleArn: Value<string>;
  DefaultLogLevel: Value<string>;
}
export default class Logging extends ResourceBase<LoggingProperties> {
  constructor(properties: LoggingProperties) {
    super('AWS::IoT::Logging', properties);
  }
}
