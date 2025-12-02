import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface QueryDefinitionProperties {
  QueryString: Value<string>;
  LogGroupNames?: List<Value<string>>;
  QueryLanguage?: Value<string>;
  Name: Value<string>;
}
export default class QueryDefinition extends ResourceBase<QueryDefinitionProperties> {
  constructor(properties: QueryDefinitionProperties) {
    super('AWS::Logs::QueryDefinition', properties);
  }
}
