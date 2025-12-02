import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AdvancedEventSelector {
  FieldSelectors!: List<AdvancedFieldSelector>;
  Name?: Value<string>;
  constructor(properties: AdvancedEventSelector) {
    Object.assign(this, properties);
  }
}

export class AdvancedFieldSelector {
  Field!: Value<string>;
  Equals?: List<Value<string>>;
  NotStartsWith?: List<Value<string>>;
  NotEndsWith?: List<Value<string>>;
  StartsWith?: List<Value<string>>;
  EndsWith?: List<Value<string>>;
  NotEquals?: List<Value<string>>;
  constructor(properties: AdvancedFieldSelector) {
    Object.assign(this, properties);
  }
}

export class DataResource {
  Type!: Value<string>;
  Values?: List<Value<string>>;
  constructor(properties: DataResource) {
    Object.assign(this, properties);
  }
}

export class EventSelector {
  IncludeManagementEvents?: Value<boolean>;
  ReadWriteType?: Value<string>;
  ExcludeManagementEventSources?: List<Value<string>>;
  DataResources?: List<DataResource>;
  constructor(properties: EventSelector) {
    Object.assign(this, properties);
  }
}

export class InsightSelector {
  InsightType?: Value<string>;
  constructor(properties: InsightSelector) {
    Object.assign(this, properties);
  }
}
export interface TrailProperties {
  IncludeGlobalServiceEvents?: Value<boolean>;
  EventSelectors?: List<EventSelector>;
  KMSKeyId?: Value<string>;
  CloudWatchLogsRoleArn?: Value<string>;
  S3KeyPrefix?: Value<string>;
  AdvancedEventSelectors?: List<AdvancedEventSelector>;
  TrailName?: Value<string>;
  IsOrganizationTrail?: Value<boolean>;
  InsightSelectors?: List<InsightSelector>;
  CloudWatchLogsLogGroupArn?: Value<string>;
  SnsTopicName?: Value<string>;
  IsMultiRegionTrail?: Value<boolean>;
  S3BucketName: Value<string>;
  EnableLogFileValidation?: Value<boolean>;
  Tags?: List<ResourceTag>;
  IsLogging: Value<boolean>;
}
export default class Trail extends ResourceBase<TrailProperties> {
  static AdvancedEventSelector = AdvancedEventSelector;
  static AdvancedFieldSelector = AdvancedFieldSelector;
  static DataResource = DataResource;
  static EventSelector = EventSelector;
  static InsightSelector = InsightSelector;
  constructor(properties: TrailProperties) {
    super('AWS::CloudTrail::Trail', properties);
  }
}
