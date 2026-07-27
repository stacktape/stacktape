import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EmailContactInner {
  Status!: Value<string>;
  Address!: Value<string>;
  CreationTime!: Value<string>;
  UpdateTime!: Value<string>;
  Arn!: Value<string>;
  Name!: Value<string>;
  constructor(properties: EmailContactInner) {
    Object.assign(this, properties);
  }
}
export interface EmailContactProperties {
  EmailAddress: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class EmailContact extends ResourceBase<EmailContactProperties> {
  static EmailContact = EmailContactInner;
  constructor(properties: EmailContactProperties) {
    super('AWS::NotificationsContacts::EmailContact', properties);
  }
}
