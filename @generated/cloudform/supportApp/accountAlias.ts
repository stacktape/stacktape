import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface AccountAliasProperties {
  AccountAlias: Value<string>;
}
export default class AccountAlias extends ResourceBase<AccountAliasProperties> {
  constructor(properties: AccountAliasProperties) {
    super('AWS::SupportApp::AccountAlias', properties);
  }
}
