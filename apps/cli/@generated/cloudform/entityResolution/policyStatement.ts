import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface PolicyStatementProperties {
  Condition?: Value<string>;
  Action?: List<Value<string>>;
  StatementId: Value<string>;
  Effect?: Value<string>;
  Arn: Value<string>;
  Principal?: List<Value<string>>;
}
export default class PolicyStatement extends ResourceBase<PolicyStatementProperties> {
  constructor(properties: PolicyStatementProperties) {
    super('AWS::EntityResolution::PolicyStatement', properties);
  }
}
