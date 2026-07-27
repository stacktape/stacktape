import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Topic {
  Description?: Value<string>;
  DisplayName!: Value<string>;
  DefaultSubscriptionStatus!: Value<string>;
  TopicName!: Value<string>;
  constructor(properties: Topic) {
    Object.assign(this, properties);
  }
}
export interface ContactListProperties {
  Description?: Value<string>;
  Topics?: List<Topic>;
  ContactListName?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class ContactList extends ResourceBase<ContactListProperties> {
  static Topic = Topic;
  constructor(properties?: ContactListProperties) {
    super('AWS::SES::ContactList', properties || {});
  }
}
