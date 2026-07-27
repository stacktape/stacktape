import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ResourceTag {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: ResourceTag) {
    Object.assign(this, properties);
  }
}

export class Rule {
  LinkedAccounts!: List<Value<string>>;
  constructor(properties: Rule) {
    Object.assign(this, properties);
  }
}
export interface InvoiceUnitProperties {
  Description?: Value<string>;
  TaxInheritanceDisabled?: Value<boolean>;
  ResourceTags?: List<ResourceTag>;
  Rule: Rule;
  InvoiceReceiver: Value<string>;
  Name: Value<string>;
}
export default class InvoiceUnit extends ResourceBase<InvoiceUnitProperties> {
  static ResourceTag = ResourceTag;
  static Rule = Rule;
  constructor(properties: InvoiceUnitProperties) {
    super('AWS::Invoicing::InvoiceUnit', properties);
  }
}
