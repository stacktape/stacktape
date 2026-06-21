import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ContactFlowModuleAliasProperties {
  Description?: Value<string>;
  ContactFlowModuleId: Value<string>;
  ContactFlowModuleVersion: Value<number>;
  Name: Value<string>;
}
export default class ContactFlowModuleAlias extends ResourceBase<ContactFlowModuleAliasProperties> {
  constructor(properties: ContactFlowModuleAliasProperties) {
    super('AWS::Connect::ContactFlowModuleAlias', properties);
  }
}
