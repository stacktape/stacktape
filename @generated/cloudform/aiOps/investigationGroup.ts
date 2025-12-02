import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ChatbotNotificationChannel {
  SNSTopicArn?: Value<string>;
  ChatConfigurationArns?: List<Value<string>>;
  constructor(properties: ChatbotNotificationChannel) {
    Object.assign(this, properties);
  }
}

export class CrossAccountConfiguration {
  SourceRoleArn?: Value<string>;
  constructor(properties: CrossAccountConfiguration) {
    Object.assign(this, properties);
  }
}

export class EncryptionConfigMap {
  EncryptionConfigurationType?: Value<string>;
  KmsKeyId?: Value<string>;
  constructor(properties: EncryptionConfigMap) {
    Object.assign(this, properties);
  }
}
export interface InvestigationGroupProperties {
  RetentionInDays?: Value<number>;
  CrossAccountConfigurations?: List<CrossAccountConfiguration>;
  InvestigationGroupPolicy?: Value<string>;
  ChatbotNotificationChannels?: List<ChatbotNotificationChannel>;
  IsCloudTrailEventHistoryEnabled?: Value<boolean>;
  TagKeyBoundaries?: List<Value<string>>;
  EncryptionConfig?: EncryptionConfigMap;
  RoleArn?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class InvestigationGroup extends ResourceBase<InvestigationGroupProperties> {
  static ChatbotNotificationChannel = ChatbotNotificationChannel;
  static CrossAccountConfiguration = CrossAccountConfiguration;
  static EncryptionConfigMap = EncryptionConfigMap;
  constructor(properties: InvestigationGroupProperties) {
    super('AWS::AIOps::InvestigationGroup', properties);
  }
}
