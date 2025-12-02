import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface ServiceNetworkResourceAssociationProperties {
  ResourceConfigurationId?: Value<string>;
  ServiceNetworkId?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class ServiceNetworkResourceAssociation extends ResourceBase<ServiceNetworkResourceAssociationProperties> {
  constructor(properties?: ServiceNetworkResourceAssociationProperties) {
    super('AWS::VpcLattice::ServiceNetworkResourceAssociation', properties || {});
  }
}
