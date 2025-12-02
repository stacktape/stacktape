import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface AttributeGroupAssociationProperties {
  AttributeGroup: Value<string>;
  Application: Value<string>;
}
export default class AttributeGroupAssociation extends ResourceBase<AttributeGroupAssociationProperties> {
  constructor(properties: AttributeGroupAssociationProperties) {
    super('AWS::ServiceCatalogAppRegistry::AttributeGroupAssociation', properties);
  }
}
