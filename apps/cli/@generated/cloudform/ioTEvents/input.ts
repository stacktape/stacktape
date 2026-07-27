import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Attribute {
  JsonPath!: Value<string>;
  constructor(properties: Attribute) {
    Object.assign(this, properties);
  }
}

export class InputDefinition {
  Attributes!: List<Attribute>;
  constructor(properties: InputDefinition) {
    Object.assign(this, properties);
  }
}
export interface InputProperties {
  InputDefinition: InputDefinition;
  InputName?: Value<string>;
  InputDescription?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Input extends ResourceBase<InputProperties> {
  static Attribute = Attribute;
  static InputDefinition = InputDefinition;
  constructor(properties: InputProperties) {
    super('AWS::IoTEvents::Input', properties);
  }
}
