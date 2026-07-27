import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface MessageTemplateVersionProperties {
  MessageTemplateArn: Value<string>;
  MessageTemplateContentSha256?: Value<string>;
}
export default class MessageTemplateVersion extends ResourceBase<MessageTemplateVersionProperties> {
  constructor(properties: MessageTemplateVersionProperties) {
    super('AWS::Wisdom::MessageTemplateVersion', properties);
  }
}
