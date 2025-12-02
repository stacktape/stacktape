import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ApplicationConfig {
  ContactHandling?: ContactHandling;
  constructor(properties: ApplicationConfig) {
    Object.assign(this, properties);
  }
}

export class ApplicationSourceConfig {
  ExternalUrlConfig!: ExternalUrlConfig;
  constructor(properties: ApplicationSourceConfig) {
    Object.assign(this, properties);
  }
}

export class ContactHandling {
  Scope!: Value<string>;
  constructor(properties: ContactHandling) {
    Object.assign(this, properties);
  }
}

export class ExternalUrlConfig {
  ApprovedOrigins?: List<Value<string>>;
  AccessUrl!: Value<string>;
  constructor(properties: ExternalUrlConfig) {
    Object.assign(this, properties);
  }
}

export class IframeConfig {
  Allow?: List<Value<string>>;
  Sandbox?: List<Value<string>>;
  constructor(properties: IframeConfig) {
    Object.assign(this, properties);
  }
}
export interface ApplicationProperties {
  ApplicationSourceConfig: ApplicationSourceConfig;
  Description: Value<string>;
  InitializationTimeout?: Value<number>;
  ApplicationConfig?: ApplicationConfig;
  IframeConfig?: IframeConfig;
  Permissions?: List<Value<string>>;
  IsService?: Value<boolean>;
  Namespace: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Application extends ResourceBase<ApplicationProperties> {
  static ApplicationConfig = ApplicationConfig;
  static ApplicationSourceConfig = ApplicationSourceConfig;
  static ContactHandling = ContactHandling;
  static ExternalUrlConfig = ExternalUrlConfig;
  static IframeConfig = IframeConfig;
  constructor(properties: ApplicationProperties) {
    super('AWS::AppIntegrations::Application', properties);
  }
}
