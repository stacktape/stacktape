import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Configuration {
  Lex!: LexConfiguration;
  constructor(properties: Configuration) {
    Object.assign(this, properties);
  }
}

export class InvokedBy {
  StandardMessages!: Value<string>;
  TargetedMessages!: Value<string>;
  constructor(properties: InvokedBy) {
    Object.assign(this, properties);
  }
}

export class LexConfiguration {
  LexBotAliasArn!: Value<string>;
  InvokedBy?: InvokedBy;
  LocaleId!: Value<string>;
  RespondsTo?: Value<string>;
  WelcomeIntent?: Value<string>;
  constructor(properties: LexConfiguration) {
    Object.assign(this, properties);
  }
}
export interface AppInstanceBotProperties {
  Configuration: Configuration;
  Metadata?: Value<string>;
  AppInstanceArn: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class AppInstanceBot extends ResourceBase<AppInstanceBotProperties> {
  static Configuration = Configuration;
  static InvokedBy = InvokedBy;
  static LexConfiguration = LexConfiguration;
  constructor(properties: AppInstanceBotProperties) {
    super('AWS::Chime::AppInstanceBot', properties);
  }
}
