import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ContactFlowModuleVersionProperties {
  Description?: Value<string>;
  ContactFlowModuleId: Value<string>;
}
export default class ContactFlowModuleVersion extends ResourceBase<ContactFlowModuleVersionProperties> {
  constructor(properties: ContactFlowModuleVersionProperties) {
    super('AWS::Connect::ContactFlowModuleVersion', properties);
  }
}
