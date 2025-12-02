import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AuthMode {
  AuthType?: Value<string>;
  constructor(properties: AuthMode) {
    Object.assign(this, properties);
  }
}

export class HandlerConfig {
  Integration!: Integration;
  Behavior!: Value<string>;
  constructor(properties: HandlerConfig) {
    Object.assign(this, properties);
  }
}

export class HandlerConfigs {
  OnPublish?: HandlerConfig;
  OnSubscribe?: HandlerConfig;
  constructor(properties: HandlerConfigs) {
    Object.assign(this, properties);
  }
}

export class Integration {
  DataSourceName!: Value<string>;
  LambdaConfig?: LambdaConfig;
  constructor(properties: Integration) {
    Object.assign(this, properties);
  }
}

export class LambdaConfig {
  InvokeType!: Value<string>;
  constructor(properties: LambdaConfig) {
    Object.assign(this, properties);
  }
}
export interface ChannelNamespaceProperties {
  SubscribeAuthModes?: List<AuthMode>;
  CodeS3Location?: Value<string>;
  PublishAuthModes?: List<AuthMode>;
  CodeHandlers?: Value<string>;
  HandlerConfigs?: HandlerConfigs;
  ApiId: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class ChannelNamespace extends ResourceBase<ChannelNamespaceProperties> {
  static AuthMode = AuthMode;
  static HandlerConfig = HandlerConfig;
  static HandlerConfigs = HandlerConfigs;
  static Integration = Integration;
  static LambdaConfig = LambdaConfig;
  constructor(properties: ChannelNamespaceProperties) {
    super('AWS::AppSync::ChannelNamespace', properties);
  }
}
