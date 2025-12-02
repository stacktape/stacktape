import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CookieSpecification {
  Path?: Value<string>;
  Domain!: Value<string>;
  Name?: Value<string>;
  constructor(properties: CookieSpecification) {
    Object.assign(this, properties);
  }
}

export class CookieSynchronizationConfiguration {
  Blocklist?: List<CookieSpecification>;
  Allowlist!: List<CookieSpecification>;
  constructor(properties: CookieSynchronizationConfiguration) {
    Object.assign(this, properties);
  }
}

export class ToolbarConfiguration {
  ToolbarType?: Value<string>;
  HiddenToolbarItems?: List<Value<string>>;
  MaxDisplayResolution?: Value<string>;
  VisualMode?: Value<string>;
  constructor(properties: ToolbarConfiguration) {
    Object.assign(this, properties);
  }
}
export interface UserSettingsProperties {
  IdleDisconnectTimeoutInMinutes?: Value<number>;
  DeepLinkAllowed?: Value<string>;
  PrintAllowed: Value<string>;
  CopyAllowed: Value<string>;
  DownloadAllowed: Value<string>;
  ToolbarConfiguration?: ToolbarConfiguration;
  UploadAllowed: Value<string>;
  CustomerManagedKey?: Value<string>;
  AdditionalEncryptionContext?: { [key: string]: Value<string> };
  DisconnectTimeoutInMinutes?: Value<number>;
  CookieSynchronizationConfiguration?: CookieSynchronizationConfiguration;
  PasteAllowed: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class UserSettings extends ResourceBase<UserSettingsProperties> {
  static CookieSpecification = CookieSpecification;
  static CookieSynchronizationConfiguration = CookieSynchronizationConfiguration;
  static ToolbarConfiguration = ToolbarConfiguration;
  constructor(properties: UserSettingsProperties) {
    super('AWS::WorkSpacesWeb::UserSettings', properties);
  }
}
