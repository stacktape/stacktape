import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface CredentialLockerProperties {
  Tags?: { [key: string]: Value<string> };
  Name?: Value<string>;
}
export default class CredentialLocker extends ResourceBase<CredentialLockerProperties> {
  constructor(properties?: CredentialLockerProperties) {
    super('AWS::IoTManagedIntegrations::CredentialLocker', properties || {});
  }
}
