import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface AccountProperties {
  CloudWatchRoleArn?: Value<string>;
}
export default class Account extends ResourceBase<AccountProperties> {
  constructor(properties?: AccountProperties) {
    super('AWS::ApiGateway::Account', properties || {});
  }
}
