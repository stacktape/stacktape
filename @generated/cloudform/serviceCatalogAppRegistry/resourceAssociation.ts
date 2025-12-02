import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ResourceAssociationProperties {
  Resource: Value<string>;
  ResourceType: Value<string>;
  Application: Value<string>;
}
export default class ResourceAssociation extends ResourceBase<ResourceAssociationProperties> {
  constructor(properties: ResourceAssociationProperties) {
    super('AWS::ServiceCatalogAppRegistry::ResourceAssociation', properties);
  }
}
