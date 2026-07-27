import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Model {
  Smithy?: Value<string>;
  constructor(properties: Model) {
    Object.assign(this, properties);
  }
}
export interface FormTypeProperties {
  Status?: Value<string>;
  Description?: Value<string>;
  Model: Model;
  OwningProjectIdentifier: Value<string>;
  DomainIdentifier: Value<string>;
  Name: Value<string>;
}
export default class FormType extends ResourceBase<FormTypeProperties> {
  static Model = Model;
  constructor(properties: FormTypeProperties) {
    super('AWS::DataZone::FormType', properties);
  }
}
