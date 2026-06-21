import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AtlassianOauth2ProviderConfigInput {
  ClientSecret!: Value<string>;
  ClientId!: Value<string>;
  constructor(properties: AtlassianOauth2ProviderConfigInput) {
    Object.assign(this, properties);
  }
}

export class ClientSecretArn {
  SecretArn!: Value<string>;
  constructor(properties: ClientSecretArn) {
    Object.assign(this, properties);
  }
}

export class CustomOauth2ProviderConfigInput {
  OnBehalfOfTokenExchangeConfig?: OnBehalfOfTokenExchangeConfig;
  ClientSecret?: Value<string>;
  ClientId?: Value<string>;
  OauthDiscovery!: Oauth2Discovery;
  constructor(properties: CustomOauth2ProviderConfigInput) {
    Object.assign(this, properties);
  }
}

export class GithubOauth2ProviderConfigInput {
  ClientSecret!: Value<string>;
  ClientId!: Value<string>;
  constructor(properties: GithubOauth2ProviderConfigInput) {
    Object.assign(this, properties);
  }
}

export class GoogleOauth2ProviderConfigInput {
  ClientSecret!: Value<string>;
  ClientId!: Value<string>;
  constructor(properties: GoogleOauth2ProviderConfigInput) {
    Object.assign(this, properties);
  }
}

export class IncludedOauth2ProviderConfigInput {
  TokenEndpoint?: Value<string>;
  Issuer?: Value<string>;
  ClientSecret!: Value<string>;
  ClientId!: Value<string>;
  AuthorizationEndpoint?: Value<string>;
  constructor(properties: IncludedOauth2ProviderConfigInput) {
    Object.assign(this, properties);
  }
}

export class LinkedinOauth2ProviderConfigInput {
  ClientSecret!: Value<string>;
  ClientId!: Value<string>;
  constructor(properties: LinkedinOauth2ProviderConfigInput) {
    Object.assign(this, properties);
  }
}

export class MicrosoftOauth2ProviderConfigInput {
  TenantId?: Value<string>;
  ClientSecret!: Value<string>;
  ClientId!: Value<string>;
  constructor(properties: MicrosoftOauth2ProviderConfigInput) {
    Object.assign(this, properties);
  }
}

export class Oauth2AuthorizationServerMetadata {
  TokenEndpoint!: Value<string>;
  ResponseTypes?: List<Value<string>>;
  Issuer!: Value<string>;
  AuthorizationEndpoint!: Value<string>;
  constructor(properties: Oauth2AuthorizationServerMetadata) {
    Object.assign(this, properties);
  }
}

export class Oauth2Discovery {
  DiscoveryUrl?: Value<string>;
  AuthorizationServerMetadata?: Oauth2AuthorizationServerMetadata;
  constructor(properties: Oauth2Discovery) {
    Object.assign(this, properties);
  }
}

export class Oauth2ProviderConfigInput {
  IncludedOauth2ProviderConfig?: IncludedOauth2ProviderConfigInput;
  GoogleOauth2ProviderConfig?: GoogleOauth2ProviderConfigInput;
  GithubOauth2ProviderConfig?: GithubOauth2ProviderConfigInput;
  MicrosoftOauth2ProviderConfig?: MicrosoftOauth2ProviderConfigInput;
  SlackOauth2ProviderConfig?: SlackOauth2ProviderConfigInput;
  SalesforceOauth2ProviderConfig?: SalesforceOauth2ProviderConfigInput;
  AtlassianOauth2ProviderConfig?: AtlassianOauth2ProviderConfigInput;
  CustomOauth2ProviderConfig?: CustomOauth2ProviderConfigInput;
  LinkedinOauth2ProviderConfig?: LinkedinOauth2ProviderConfigInput;
  constructor(properties: Oauth2ProviderConfigInput) {
    Object.assign(this, properties);
  }
}

export class Oauth2ProviderConfigOutput {
  OnBehalfOfTokenExchangeConfig?: OnBehalfOfTokenExchangeConfig;
  ClientId?: Value<string>;
  OauthDiscovery?: Oauth2Discovery;
  constructor(properties: Oauth2ProviderConfigOutput) {
    Object.assign(this, properties);
  }
}

export class OnBehalfOfTokenExchangeConfig {
  GrantType!: Value<string>;
  TokenExchangeGrantTypeConfig?: TokenExchangeGrantTypeConfig;
  constructor(properties: OnBehalfOfTokenExchangeConfig) {
    Object.assign(this, properties);
  }
}

export class SalesforceOauth2ProviderConfigInput {
  ClientSecret!: Value<string>;
  ClientId!: Value<string>;
  constructor(properties: SalesforceOauth2ProviderConfigInput) {
    Object.assign(this, properties);
  }
}

export class SlackOauth2ProviderConfigInput {
  ClientSecret!: Value<string>;
  ClientId!: Value<string>;
  constructor(properties: SlackOauth2ProviderConfigInput) {
    Object.assign(this, properties);
  }
}

export class TokenExchangeGrantTypeConfig {
  ActorTokenContent!: Value<string>;
  ActorTokenScopes?: List<Value<string>>;
  constructor(properties: TokenExchangeGrantTypeConfig) {
    Object.assign(this, properties);
  }
}
export interface OAuth2CredentialProviderProperties {
  CredentialProviderVendor: Value<string>;
  Oauth2ProviderConfigInput?: Oauth2ProviderConfigInput;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class OAuth2CredentialProvider extends ResourceBase<OAuth2CredentialProviderProperties> {
  static AtlassianOauth2ProviderConfigInput = AtlassianOauth2ProviderConfigInput;
  static ClientSecretArn = ClientSecretArn;
  static CustomOauth2ProviderConfigInput = CustomOauth2ProviderConfigInput;
  static GithubOauth2ProviderConfigInput = GithubOauth2ProviderConfigInput;
  static GoogleOauth2ProviderConfigInput = GoogleOauth2ProviderConfigInput;
  static IncludedOauth2ProviderConfigInput = IncludedOauth2ProviderConfigInput;
  static LinkedinOauth2ProviderConfigInput = LinkedinOauth2ProviderConfigInput;
  static MicrosoftOauth2ProviderConfigInput = MicrosoftOauth2ProviderConfigInput;
  static Oauth2AuthorizationServerMetadata = Oauth2AuthorizationServerMetadata;
  static Oauth2Discovery = Oauth2Discovery;
  static Oauth2ProviderConfigInput = Oauth2ProviderConfigInput;
  static Oauth2ProviderConfigOutput = Oauth2ProviderConfigOutput;
  static OnBehalfOfTokenExchangeConfig = OnBehalfOfTokenExchangeConfig;
  static SalesforceOauth2ProviderConfigInput = SalesforceOauth2ProviderConfigInput;
  static SlackOauth2ProviderConfigInput = SlackOauth2ProviderConfigInput;
  static TokenExchangeGrantTypeConfig = TokenExchangeGrantTypeConfig;
  constructor(properties: OAuth2CredentialProviderProperties) {
    super('AWS::BedrockAgentCore::OAuth2CredentialProvider', properties);
  }
}
