import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DestinationConfiguration {
  S3Configuration?: S3Configuration;
  constructor(properties: DestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3Configuration {
  DestinationIdentifier!: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: S3Configuration) {
    Object.assign(this, properties);
  }
}

export class TagsItems {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: TagsItems) {
    Object.assign(this, properties);
  }
}
export interface ScheduledQueryProperties {
  Timezone?: Value<string>;
  ScheduleExpression: Value<string>;
  DestinationConfiguration?: DestinationConfiguration;
  Description?: Value<string>;
  StartTimeOffset?: Value<number>;
  ScheduleStartTime?: Value<number>;
  QueryString: Value<string>;
  Name: Value<string>;
  ScheduleEndTime?: Value<number>;
  ExecutionRoleArn: Value<string>;
  State?: Value<string>;
  QueryLanguage: Value<string>;
  LogGroupIdentifiers?: List<Value<string>>;
  Tags?: List<TagsItems>;
}
export default class ScheduledQuery extends ResourceBase<ScheduledQueryProperties> {
  static DestinationConfiguration = DestinationConfiguration;
  static S3Configuration = S3Configuration;
  static TagsItems = TagsItems;
  constructor(properties: ScheduledQueryProperties) {
    super('AWS::Logs::ScheduledQuery', properties);
  }
}
