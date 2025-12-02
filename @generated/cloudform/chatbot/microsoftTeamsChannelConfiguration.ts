import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface MicrosoftTeamsChannelConfigurationProperties {
  UserRoleRequired?: Value<boolean>;
  LoggingLevel?: Value<string>;
  TeamsChannelName?: Value<string>;
  CustomizationResourceArns?: List<Value<string>>;
  SnsTopicArns?: List<Value<string>>;
  GuardrailPolicies?: List<Value<string>>;
  IamRoleArn: Value<string>;
  TeamId: Value<string>;
  ConfigurationName: Value<string>;
  TeamsTenantId: Value<string>;
  Tags?: List<ResourceTag>;
  TeamsChannelId: Value<string>;
}
export default class MicrosoftTeamsChannelConfiguration extends ResourceBase<MicrosoftTeamsChannelConfigurationProperties> {
  constructor(properties: MicrosoftTeamsChannelConfigurationProperties) {
    super('AWS::Chatbot::MicrosoftTeamsChannelConfiguration', properties);
  }
}
