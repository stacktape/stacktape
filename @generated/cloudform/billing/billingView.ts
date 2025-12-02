import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DataFilterExpression {
  Dimensions?: Dimensions;
  Tags?: Tags;
  constructor(properties: DataFilterExpression) {
    Object.assign(this, properties);
  }
}

export class Dimensions {
  Values?: List<Value<string>>;
  Key?: Value<string>;
  constructor(properties: Dimensions) {
    Object.assign(this, properties);
  }
}

export class Tags {
  Values?: List<Value<string>>;
  Key?: Value<string>;
  constructor(properties: Tags) {
    Object.assign(this, properties);
  }
}
export interface BillingViewProperties {
  Description?: Value<string>;
  SourceViews: List<Value<string>>;
  DataFilterExpression?: DataFilterExpression;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class BillingView extends ResourceBase<BillingViewProperties> {
  static DataFilterExpression = DataFilterExpression;
  static Dimensions = Dimensions;
  static Tags = Tags;
  constructor(properties: BillingViewProperties) {
    super('AWS::Billing::BillingView', properties);
  }
}
