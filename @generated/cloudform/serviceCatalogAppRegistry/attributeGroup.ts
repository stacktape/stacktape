import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface AttributeGroupProperties {
  Description?: Value<string>;
  Attributes: { [key: string]: any };
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class AttributeGroup extends ResourceBase<AttributeGroupProperties> {
  constructor(properties: AttributeGroupProperties) {
    super('AWS::ServiceCatalogAppRegistry::AttributeGroup', properties);
  }
}
