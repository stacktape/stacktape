import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface SlackChannelConfigurationProperties {
  UserRoleRequired?: Value<boolean>;
  LoggingLevel?: Value<string>;
  CustomizationResourceArns?: List<Value<string>>;
  SnsTopicArns?: List<Value<string>>;
  GuardrailPolicies?: List<Value<string>>;
  SlackWorkspaceId: Value<string>;
  SlackChannelId: Value<string>;
  IamRoleArn: Value<string>;
  ConfigurationName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class SlackChannelConfiguration extends ResourceBase<SlackChannelConfigurationProperties> {
  constructor(properties: SlackChannelConfigurationProperties) {
    super('AWS::Chatbot::SlackChannelConfiguration', properties);
  }
}
