import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface DelegatedAdminProperties {
  AdminAccountId: Value<string>;
}
export default class DelegatedAdmin extends ResourceBase<DelegatedAdminProperties> {
  constructor(properties: DelegatedAdminProperties) {
    super('AWS::SecurityHub::DelegatedAdmin', properties);
  }
}
