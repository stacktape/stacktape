import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class FieldToMatch {
  Data?: Value<string>;
  Type!: Value<string>;
  constructor(properties: FieldToMatch) {
    Object.assign(this, properties);
  }
}

export class SqlInjectionMatchTuple {
  FieldToMatch!: FieldToMatch;
  TextTransformation!: Value<string>;
  constructor(properties: SqlInjectionMatchTuple) {
    Object.assign(this, properties);
  }
}
export interface SqlInjectionMatchSetProperties {
  Name: Value<string>;
  SqlInjectionMatchTuples?: List<SqlInjectionMatchTuple>;
}
export default class SqlInjectionMatchSet extends ResourceBase<SqlInjectionMatchSetProperties> {
  static FieldToMatch = FieldToMatch;
  static SqlInjectionMatchTuple = SqlInjectionMatchTuple;
  constructor(properties: SqlInjectionMatchSetProperties) {
    super('AWS::WAF::SqlInjectionMatchSet', properties);
  }
}
