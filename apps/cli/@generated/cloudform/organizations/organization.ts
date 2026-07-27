import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface OrganizationProperties {
  FeatureSet?: Value<string>;
}
export default class Organization extends ResourceBase<OrganizationProperties> {
  constructor(properties?: OrganizationProperties) {
    super('AWS::Organizations::Organization', properties || {});
  }
}
