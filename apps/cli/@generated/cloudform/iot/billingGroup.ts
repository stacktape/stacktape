import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BillingGroupProperties {
  BillingGroupDescription?: Value<string>;
  constructor(properties: BillingGroupProperties) {
    Object.assign(this, properties);
  }
}
export interface BillingGroupProperties {
  BillingGroupName?: Value<string>;
  BillingGroupProperties?: BillingGroupProperties;
  Tags?: List<ResourceTag>;
}
export default class BillingGroup extends ResourceBase<BillingGroupProperties> {
  static BillingGroupProperties = BillingGroupProperties;
  constructor(properties?: BillingGroupProperties) {
    super('AWS::IoT::BillingGroup', properties || {});
  }
}
