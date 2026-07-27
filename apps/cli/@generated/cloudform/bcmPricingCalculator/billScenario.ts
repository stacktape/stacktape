import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BillInterval {
  Start?: Value<string>;
  End?: Value<string>;
  constructor(properties: BillInterval) {
    Object.assign(this, properties);
  }
}
export interface BillScenarioProperties {
  CostCategoryGroupSharingPreferenceArn?: Value<string>;
  GroupSharingPreference?: Value<string>;
  ExpiresAt?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class BillScenario extends ResourceBase<BillScenarioProperties> {
  static BillInterval = BillInterval;
  constructor(properties?: BillScenarioProperties) {
    super('AWS::BcmPricingCalculator::BillScenario', properties || {});
  }
}
