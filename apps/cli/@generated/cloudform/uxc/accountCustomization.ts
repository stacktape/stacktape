import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface AccountCustomizationProperties {
  AccountColor?: Value<string>;
  VisibleServices?: List<Value<string>>;
  VisibleRegions?: List<Value<string>>;
}
export default class AccountCustomization extends ResourceBase<AccountCustomizationProperties> {
  constructor(properties?: AccountCustomizationProperties) {
    super('AWS::UXC::AccountCustomization', properties || {});
  }
}
