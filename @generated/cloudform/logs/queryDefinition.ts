import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class QueryParameter {
  DefaultValue?: Value<string>;
  Description?: Value<string>;
  Name!: Value<string>;
  constructor(properties: QueryParameter) {
    Object.assign(this, properties);
  }
}
export interface QueryDefinitionProperties {
  Parameters?: List<QueryParameter>;
  QueryString: Value<string>;
  LogGroupNames?: List<Value<string>>;
  QueryLanguage?: Value<string>;
  Name: Value<string>;
}
export default class QueryDefinition extends ResourceBase<QueryDefinitionProperties> {
  static QueryParameter = QueryParameter;
  constructor(properties: QueryDefinitionProperties) {
    super('AWS::Logs::QueryDefinition', properties);
  }
}
