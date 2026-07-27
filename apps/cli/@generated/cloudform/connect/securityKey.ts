import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface SecurityKeyProperties {
  InstanceId: Value<string>;
  Key: Value<string>;
}
export default class SecurityKey extends ResourceBase<SecurityKeyProperties> {
  constructor(properties: SecurityKeyProperties) {
    super('AWS::Connect::SecurityKey', properties);
  }
}
