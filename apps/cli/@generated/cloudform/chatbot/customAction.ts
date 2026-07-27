import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CustomActionAttachment {
  Variables?: { [key: string]: Value<string> };
  NotificationType?: Value<string>;
  Criteria?: List<CustomActionAttachmentCriteria>;
  ButtonText?: Value<string>;
  constructor(properties: CustomActionAttachment) {
    Object.assign(this, properties);
  }
}

export class CustomActionAttachmentCriteria {
  Operator!: Value<string>;
  VariableName!: Value<string>;
  Value?: Value<string>;
  constructor(properties: CustomActionAttachmentCriteria) {
    Object.assign(this, properties);
  }
}

export class CustomActionDefinition {
  CommandText!: Value<string>;
  constructor(properties: CustomActionDefinition) {
    Object.assign(this, properties);
  }
}
export interface CustomActionProperties {
  ActionName: Value<string>;
  AliasName?: Value<string>;
  Definition: CustomActionDefinition;
  Attachments?: List<CustomActionAttachment>;
  Tags?: List<ResourceTag>;
}
export default class CustomAction extends ResourceBase<CustomActionProperties> {
  static CustomActionAttachment = CustomActionAttachment;
  static CustomActionAttachmentCriteria = CustomActionAttachmentCriteria;
  static CustomActionDefinition = CustomActionDefinition;
  constructor(properties: CustomActionProperties) {
    super('AWS::Chatbot::CustomAction', properties);
  }
}
