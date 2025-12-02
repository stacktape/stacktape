import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface PortalProperties {
  TrustStoreArn?: Value<string>;
  UserAccessLoggingSettingsArn?: Value<string>;
  BrowserSettingsArn?: Value<string>;
  IpAccessSettingsArn?: Value<string>;
  NetworkSettingsArn?: Value<string>;
  CustomerManagedKey?: Value<string>;
  AdditionalEncryptionContext?: { [key: string]: Value<string> };
  DisplayName?: Value<string>;
  UserSettingsArn?: Value<string>;
  DataProtectionSettingsArn?: Value<string>;
  InstanceType?: Value<string>;
  SessionLoggerArn?: Value<string>;
  MaxConcurrentSessions?: Value<number>;
  Tags?: List<ResourceTag>;
  AuthenticationType?: Value<string>;
}
export default class Portal extends ResourceBase<PortalProperties> {
  constructor(properties?: PortalProperties) {
    super('AWS::WorkSpacesWeb::Portal', properties || {});
  }
}
