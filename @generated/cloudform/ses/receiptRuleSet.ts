import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ReceiptRuleSetProperties {
  RuleSetName?: Value<string>;
}
export default class ReceiptRuleSet extends ResourceBase<ReceiptRuleSetProperties> {
  constructor(properties?: ReceiptRuleSetProperties) {
    super('AWS::SES::ReceiptRuleSet', properties || {});
  }
}
