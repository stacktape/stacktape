import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface LogGroupProperties {
  FieldIndexPolicies?: List<{ [key: string]: any }>;
  RetentionInDays?: Value<number>;
  KmsKeyId?: Value<string>;
  LogGroupClass?: Value<string>;
  ResourcePolicyDocument?: { [key: string]: any };
  LogGroupName?: Value<string>;
  Tags?: List<ResourceTag>;
  DataProtectionPolicy?: { [key: string]: any };
}
export default class LogGroup extends ResourceBase<LogGroupProperties> {
  constructor(properties?: LogGroupProperties) {
    super('AWS::Logs::LogGroup', properties || {});
  }
}
