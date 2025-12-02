import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface PreparedStatementProperties {
  StatementName: Value<string>;
  WorkGroup: Value<string>;
  Description?: Value<string>;
  QueryStatement: Value<string>;
}
export default class PreparedStatement extends ResourceBase<PreparedStatementProperties> {
  constructor(properties: PreparedStatementProperties) {
    super('AWS::Athena::PreparedStatement', properties);
  }
}
