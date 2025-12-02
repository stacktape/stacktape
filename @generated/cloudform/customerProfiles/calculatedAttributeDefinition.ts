import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AttributeDetails {
  Expression!: Value<string>;
  Attributes!: List<AttributeItem>;
  constructor(properties: AttributeDetails) {
    Object.assign(this, properties);
  }
}

export class AttributeItem {
  Name!: Value<string>;
  constructor(properties: AttributeItem) {
    Object.assign(this, properties);
  }
}

export class Conditions {
  Range?: Range;
  ObjectCount?: Value<number>;
  Threshold?: Threshold;
  constructor(properties: Conditions) {
    Object.assign(this, properties);
  }
}

export class Range {
  ValueRange?: ValueRange;
  TimestampSource?: Value<string>;
  Value?: Value<number>;
  TimestampFormat?: Value<string>;
  Unit!: Value<string>;
  constructor(properties: Range) {
    Object.assign(this, properties);
  }
}

export class Readiness {
  Message?: Value<string>;
  ProgressPercentage?: Value<number>;
  constructor(properties: Readiness) {
    Object.assign(this, properties);
  }
}

export class Threshold {
  Operator!: Value<string>;
  Value!: Value<string>;
  constructor(properties: Threshold) {
    Object.assign(this, properties);
  }
}

export class ValueRange {
  Start!: Value<number>;
  End!: Value<number>;
  constructor(properties: ValueRange) {
    Object.assign(this, properties);
  }
}
export interface CalculatedAttributeDefinitionProperties {
  UseHistoricalData?: Value<boolean>;
  Description?: Value<string>;
  AttributeDetails: AttributeDetails;
  Statistic: Value<string>;
  DomainName: Value<string>;
  DisplayName?: Value<string>;
  CalculatedAttributeName: Value<string>;
  Conditions?: Conditions;
  Tags?: List<ResourceTag>;
}
export default class CalculatedAttributeDefinition extends ResourceBase<CalculatedAttributeDefinitionProperties> {
  static AttributeDetails = AttributeDetails;
  static AttributeItem = AttributeItem;
  static Conditions = Conditions;
  static Range = Range;
  static Readiness = Readiness;
  static Threshold = Threshold;
  static ValueRange = ValueRange;
  constructor(properties: CalculatedAttributeDefinitionProperties) {
    super('AWS::CustomerProfiles::CalculatedAttributeDefinition', properties);
  }
}
