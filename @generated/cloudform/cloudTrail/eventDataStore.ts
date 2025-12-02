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

export class ContextKeySelector {
  Type!: Value<string>;
  Equals!: List<Value<string>>;
  constructor(properties: ContextKeySelector) {
    Object.assign(this, properties);
  }
}

export class InsightSelector {
  InsightType?: Value<string>;
  constructor(properties: InsightSelector) {
    Object.assign(this, properties);
  }
}
export interface EventDataStoreProperties {
  MaxEventSize?: Value<string>;
  KmsKeyId?: Value<string>;
  AdvancedEventSelectors?: List<AdvancedEventSelector>;
  TerminationProtectionEnabled?: Value<boolean>;
  MultiRegionEnabled?: Value<boolean>;
  RetentionPeriod?: Value<number>;
  FederationEnabled?: Value<boolean>;
  IngestionEnabled?: Value<boolean>;
  Name?: Value<string>;
  InsightSelectors?: List<InsightSelector>;
  OrganizationEnabled?: Value<boolean>;
  FederationRoleArn?: Value<string>;
  InsightsDestination?: Value<string>;
  BillingMode?: Value<string>;
  ContextKeySelectors?: List<ContextKeySelector>;
  Tags?: List<ResourceTag>;
}
export default class EventDataStore extends ResourceBase<EventDataStoreProperties> {
  static AdvancedEventSelector = AdvancedEventSelector;
  static AdvancedFieldSelector = AdvancedFieldSelector;
  static ContextKeySelector = ContextKeySelector;
  static InsightSelector = InsightSelector;
  constructor(properties?: EventDataStoreProperties) {
    super('AWS::CloudTrail::EventDataStore', properties || {});
  }
}
