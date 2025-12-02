import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessEndpoint {
  EndpointType!: Value<string>;
  VpceId!: Value<string>;
  constructor(properties: AccessEndpoint) {
    Object.assign(this, properties);
  }
}

export class ApplicationSettings {
  SettingsGroup?: Value<string>;
  Enabled!: Value<boolean>;
  constructor(properties: ApplicationSettings) {
    Object.assign(this, properties);
  }
}

export class StorageConnector {
  Domains?: List<Value<string>>;
  ResourceIdentifier?: Value<string>;
  ConnectorType!: Value<string>;
  constructor(properties: StorageConnector) {
    Object.assign(this, properties);
  }
}

export class StreamingExperienceSettings {
  PreferredProtocol?: Value<string>;
  constructor(properties: StreamingExperienceSettings) {
    Object.assign(this, properties);
  }
}

export class UserSetting {
  Action!: Value<string>;
  MaximumLength?: Value<number>;
  Permission!: Value<string>;
  constructor(properties: UserSetting) {
    Object.assign(this, properties);
  }
}
export interface StackProperties {
  Description?: Value<string>;
  StorageConnectors?: List<StorageConnector>;
  DeleteStorageConnectors?: Value<boolean>;
  EmbedHostDomains?: List<Value<string>>;
  UserSettings?: List<UserSetting>;
  AttributesToDelete?: List<Value<string>>;
  RedirectURL?: Value<string>;
  StreamingExperienceSettings?: StreamingExperienceSettings;
  Name?: Value<string>;
  FeedbackURL?: Value<string>;
  ApplicationSettings?: ApplicationSettings;
  DisplayName?: Value<string>;
  Tags?: List<ResourceTag>;
  AccessEndpoints?: List<AccessEndpoint>;
}
export default class Stack extends ResourceBase<StackProperties> {
  static AccessEndpoint = AccessEndpoint;
  static ApplicationSettings = ApplicationSettings;
  static StorageConnector = StorageConnector;
  static StreamingExperienceSettings = StreamingExperienceSettings;
  static UserSetting = UserSetting;
  constructor(properties?: StackProperties) {
    super('AWS::AppStream::Stack', properties || {});
  }
}
