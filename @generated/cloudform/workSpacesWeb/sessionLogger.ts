import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EventFilter {
  All?: { [key: string]: any };
  Include?: List<Value<string>>;
  constructor(properties: EventFilter) {
    Object.assign(this, properties);
  }
}

export class LogConfiguration {
  S3?: S3LogConfiguration;
  constructor(properties: LogConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3LogConfiguration {
  Bucket!: Value<string>;
  FolderStructure!: Value<string>;
  LogFileFormat!: Value<string>;
  BucketOwner?: Value<string>;
  KeyPrefix?: Value<string>;
  constructor(properties: S3LogConfiguration) {
    Object.assign(this, properties);
  }
}
export interface SessionLoggerProperties {
  CustomerManagedKey?: Value<string>;
  AdditionalEncryptionContext?: { [key: string]: Value<string> };
  DisplayName?: Value<string>;
  EventFilter: EventFilter;
  LogConfiguration: LogConfiguration;
  Tags?: List<ResourceTag>;
}
export default class SessionLogger extends ResourceBase<SessionLoggerProperties> {
  static EventFilter = EventFilter;
  static LogConfiguration = LogConfiguration;
  static S3LogConfiguration = S3LogConfiguration;
  constructor(properties: SessionLoggerProperties) {
    super('AWS::WorkSpacesWeb::SessionLogger', properties);
  }
}
