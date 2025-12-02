import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CognitoIdentityProvider {
  ServerSideTokenCheck?: Value<boolean>;
  ProviderName!: Value<string>;
  ClientId!: Value<string>;
  constructor(properties: CognitoIdentityProvider) {
    Object.assign(this, properties);
  }
}

export class CognitoStreams {
  StreamingStatus?: Value<string>;
  StreamName?: Value<string>;
  RoleArn?: Value<string>;
  constructor(properties: CognitoStreams) {
    Object.assign(this, properties);
  }
}

export class PushSync {
  ApplicationArns?: List<Value<string>>;
  RoleArn?: Value<string>;
  constructor(properties: PushSync) {
    Object.assign(this, properties);
  }
}
export interface IdentityPoolProperties {
  PushSync?: PushSync;
  CognitoIdentityProviders?: List<CognitoIdentityProvider>;
  CognitoEvents?: { [key: string]: any };
  DeveloperProviderName?: Value<string>;
  CognitoStreams?: CognitoStreams;
  IdentityPoolName?: Value<string>;
  SupportedLoginProviders?: { [key: string]: any };
  AllowUnauthenticatedIdentities: Value<boolean>;
  IdentityPoolTags?: List<ResourceTag>;
  SamlProviderARNs?: List<Value<string>>;
  OpenIdConnectProviderARNs?: List<Value<string>>;
  AllowClassicFlow?: Value<boolean>;
}
export default class IdentityPool extends ResourceBase<IdentityPoolProperties> {
  static CognitoIdentityProvider = CognitoIdentityProvider;
  static CognitoStreams = CognitoStreams;
  static PushSync = PushSync;
  constructor(properties: IdentityPoolProperties) {
    super('AWS::Cognito::IdentityPool', properties);
  }
}
