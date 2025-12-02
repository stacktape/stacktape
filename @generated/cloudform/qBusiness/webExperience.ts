import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BrowserExtensionConfiguration {
  EnabledBrowserExtensions!: List<Value<string>>;
  constructor(properties: BrowserExtensionConfiguration) {
    Object.assign(this, properties);
  }
}

export class CustomizationConfiguration {
  FaviconUrl?: Value<string>;
  FontUrl?: Value<string>;
  CustomCSSUrl?: Value<string>;
  LogoUrl?: Value<string>;
  constructor(properties: CustomizationConfiguration) {
    Object.assign(this, properties);
  }
}

export class IdentityProviderConfiguration {
  OpenIDConnectConfiguration?: OpenIDConnectProviderConfiguration;
  SamlConfiguration?: SamlProviderConfiguration;
  constructor(properties: IdentityProviderConfiguration) {
    Object.assign(this, properties);
  }
}

export class OpenIDConnectProviderConfiguration {
  SecretsArn!: Value<string>;
  SecretsRole!: Value<string>;
  constructor(properties: OpenIDConnectProviderConfiguration) {
    Object.assign(this, properties);
  }
}

export class SamlProviderConfiguration {
  AuthenticationUrl!: Value<string>;
  constructor(properties: SamlProviderConfiguration) {
    Object.assign(this, properties);
  }
}
export interface WebExperienceProperties {
  Origins?: List<Value<string>>;
  Subtitle?: Value<string>;
  CustomizationConfiguration?: CustomizationConfiguration;
  SamplePromptsControlMode?: Value<string>;
  Title?: Value<string>;
  IdentityProviderConfiguration?: IdentityProviderConfiguration;
  WelcomeMessage?: Value<string>;
  ApplicationId: Value<string>;
  RoleArn?: Value<string>;
  Tags?: List<ResourceTag>;
  BrowserExtensionConfiguration?: BrowserExtensionConfiguration;
}
export default class WebExperience extends ResourceBase<WebExperienceProperties> {
  static BrowserExtensionConfiguration = BrowserExtensionConfiguration;
  static CustomizationConfiguration = CustomizationConfiguration;
  static IdentityProviderConfiguration = IdentityProviderConfiguration;
  static OpenIDConnectProviderConfiguration = OpenIDConnectProviderConfiguration;
  static SamlProviderConfiguration = SamlProviderConfiguration;
  constructor(properties: WebExperienceProperties) {
    super('AWS::QBusiness::WebExperience', properties);
  }
}
