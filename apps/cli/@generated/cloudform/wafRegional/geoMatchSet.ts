import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class GeoMatchConstraint {
  Type!: Value<string>;
  Value!: Value<string>;
  constructor(properties: GeoMatchConstraint) {
    Object.assign(this, properties);
  }
}
export interface GeoMatchSetProperties {
  GeoMatchConstraints?: List<GeoMatchConstraint>;
  Name: Value<string>;
}
export default class GeoMatchSet extends ResourceBase<GeoMatchSetProperties> {
  static GeoMatchConstraint = GeoMatchConstraint;
  constructor(properties: GeoMatchSetProperties) {
    super('AWS::WAFRegional::GeoMatchSet', properties);
  }
}
