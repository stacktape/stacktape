import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface SchemaProperties {
  Schema: Value<string>;
  Domain?: Value<string>;
  Name: Value<string>;
}
export default class Schema extends ResourceBase<SchemaProperties> {
  constructor(properties: SchemaProperties) {
    super('AWS::Personalize::Schema', properties);
  }
}
