import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ExpiryEventsConfiguration {
  DaysBeforeExpiry?: Value<number>;
  constructor(properties: ExpiryEventsConfiguration) {
    Object.assign(this, properties);
  }
}
export interface AccountProperties {
  ExpiryEventsConfiguration: ExpiryEventsConfiguration;
}
export default class Account extends ResourceBase<AccountProperties> {
  static ExpiryEventsConfiguration = ExpiryEventsConfiguration;
  constructor(properties: AccountProperties) {
    super('AWS::CertificateManager::Account', properties);
  }
}
