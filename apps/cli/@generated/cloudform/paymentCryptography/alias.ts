import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface AliasProperties {
  AliasName: Value<string>;
  KeyArn?: Value<string>;
}
export default class Alias extends ResourceBase<AliasProperties> {
  constructor(properties: AliasProperties) {
    super('AWS::PaymentCryptography::Alias', properties);
  }
}
