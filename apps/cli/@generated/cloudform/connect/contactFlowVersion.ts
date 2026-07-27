import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ContactFlowVersionProperties {
  Description?: Value<string>;
  ContactFlowId: Value<string>;
}
export default class ContactFlowVersion extends ResourceBase<ContactFlowVersionProperties> {
  constructor(properties: ContactFlowVersionProperties) {
    super('AWS::Connect::ContactFlowVersion', properties);
  }
}
