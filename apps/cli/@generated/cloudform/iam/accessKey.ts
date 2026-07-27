import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface AccessKeyProperties {
  Serial?: Value<number>;
  Status?: Value<string>;
  UserName: Value<string>;
}
export default class AccessKey extends ResourceBase<AccessKeyProperties> {
  constructor(properties: AccessKeyProperties) {
    super('AWS::IAM::AccessKey', properties);
  }
}
