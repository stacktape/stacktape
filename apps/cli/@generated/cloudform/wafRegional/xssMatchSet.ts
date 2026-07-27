import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class FieldToMatch {
  Type!: Value<string>;
  Data?: Value<string>;
  constructor(properties: FieldToMatch) {
    Object.assign(this, properties);
  }
}

export class XssMatchTuple {
  TextTransformation!: Value<string>;
  FieldToMatch!: FieldToMatch;
  constructor(properties: XssMatchTuple) {
    Object.assign(this, properties);
  }
}
export interface XssMatchSetProperties {
  XssMatchTuples?: List<XssMatchTuple>;
  Name: Value<string>;
}
export default class XssMatchSet extends ResourceBase<XssMatchSetProperties> {
  static FieldToMatch = FieldToMatch;
  static XssMatchTuple = XssMatchTuple;
  constructor(properties: XssMatchSetProperties) {
    super('AWS::WAFRegional::XssMatchSet', properties);
  }
}
