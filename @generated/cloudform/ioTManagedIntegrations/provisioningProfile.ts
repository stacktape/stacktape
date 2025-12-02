import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface ProvisioningProfileProperties {
  ProvisioningType: Value<string>;
  CaCertificate?: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name?: Value<string>;
}
export default class ProvisioningProfile extends ResourceBase<ProvisioningProfileProperties> {
  constructor(properties: ProvisioningProfileProperties) {
    super('AWS::IoTManagedIntegrations::ProvisioningProfile', properties);
  }
}
