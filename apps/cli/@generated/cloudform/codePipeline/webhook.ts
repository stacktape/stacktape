import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class WebhookAuthConfiguration {
  AllowedIPRange?: Value<string>;
  SecretToken?: Value<string>;
  constructor(properties: WebhookAuthConfiguration) {
    Object.assign(this, properties);
  }
}

export class WebhookFilterRule {
  JsonPath!: Value<string>;
  MatchEquals?: Value<string>;
  constructor(properties: WebhookFilterRule) {
    Object.assign(this, properties);
  }
}
export interface WebhookProperties {
  AuthenticationConfiguration: WebhookAuthConfiguration;
  Filters: List<WebhookFilterRule>;
  Authentication: Value<string>;
  TargetPipeline: Value<string>;
  TargetAction: Value<string>;
  Name?: Value<string>;
  TargetPipelineVersion?: Value<number>;
  RegisterWithThirdParty?: Value<boolean>;
}
export default class Webhook extends ResourceBase<WebhookProperties> {
  static WebhookAuthConfiguration = WebhookAuthConfiguration;
  static WebhookFilterRule = WebhookFilterRule;
  constructor(properties: WebhookProperties) {
    super('AWS::CodePipeline::Webhook', properties);
  }
}
