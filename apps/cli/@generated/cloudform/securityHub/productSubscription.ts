import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ProductSubscriptionProperties {
  ProductArn: Value<string>;
}
export default class ProductSubscription extends ResourceBase<ProductSubscriptionProperties> {
  constructor(properties: ProductSubscriptionProperties) {
    super('AWS::SecurityHub::ProductSubscription', properties);
  }
}
