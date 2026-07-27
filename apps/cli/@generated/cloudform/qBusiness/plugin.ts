import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class APISchema {
  S3?: S3;
  Payload?: Value<string>;
  constructor(properties: APISchema) {
    Object.assign(this, properties);
  }
}

export class BasicAuthConfiguration {
  SecretArn!: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: BasicAuthConfiguration) {
    Object.assign(this, properties);
  }
}

export class CustomPluginConfiguration {
  Description!: Value<string>;
  ApiSchema!: APISchema;
  ApiSchemaType!: Value<string>;
  constructor(properties: CustomPluginConfiguration) {
    Object.assign(this, properties);
  }
}

export class OAuth2ClientCredentialConfiguration {
  SecretArn!: Value<string>;
  AuthorizationUrl?: Value<string>;
  TokenUrl?: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: OAuth2ClientCredentialConfiguration) {
    Object.assign(this, properties);
  }
}

export class PluginAuthConfiguration {
  NoAuthConfiguration?: { [key: string]: any };
  BasicAuthConfiguration?: BasicAuthConfiguration;
  OAuth2ClientCredentialConfiguration?: OAuth2ClientCredentialConfiguration;
  constructor(properties: PluginAuthConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3 {
  Bucket!: Value<string>;
  Key!: Value<string>;
  constructor(properties: S3) {
    Object.assign(this, properties);
  }
}
export interface PluginProperties {
  ServerUrl?: Value<string>;
  CustomPluginConfiguration?: CustomPluginConfiguration;
  Type: Value<string>;
  State?: Value<string>;
  DisplayName: Value<string>;
  AuthConfiguration: PluginAuthConfiguration;
  ApplicationId?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Plugin extends ResourceBase<PluginProperties> {
  static APISchema = APISchema;
  static BasicAuthConfiguration = BasicAuthConfiguration;
  static CustomPluginConfiguration = CustomPluginConfiguration;
  static OAuth2ClientCredentialConfiguration = OAuth2ClientCredentialConfiguration;
  static PluginAuthConfiguration = PluginAuthConfiguration;
  static S3 = S3;
  constructor(properties: PluginProperties) {
    super('AWS::QBusiness::Plugin', properties);
  }
}
