import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface LogStreamProperties {
  LogStreamName?: Value<string>;
  LogGroupName: Value<string>;
}
export default class LogStream extends ResourceBase<LogStreamProperties> {
  constructor(properties: LogStreamProperties) {
    super('AWS::Logs::LogStream', properties);
  }
}
