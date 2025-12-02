import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class FieldToMatch {
  Data?: Value<string>;
  Type!: Value<string>;
  constructor(properties: FieldToMatch) {
    Object.assign(this, properties);
  }
}

export class XssMatchTuple {
  FieldToMatch!: FieldToMatch;
  TextTransformation!: Value<string>;
  constructor(properties: XssMatchTuple) {
    Object.assign(this, properties);
  }
}
export interface XssMatchSetProperties {
  Name: Value<string>;
  XssMatchTuples: List<XssMatchTuple>;
}
export default class XssMatchSet extends ResourceBase<XssMatchSetProperties> {
  static FieldToMatch = FieldToMatch;
  static XssMatchTuple = XssMatchTuple;
  constructor(properties: XssMatchSetProperties) {
    super('AWS::WAF::XssMatchSet', properties);
  }
}
