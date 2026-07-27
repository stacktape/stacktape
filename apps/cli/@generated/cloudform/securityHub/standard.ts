import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class StandardsControl {
  StandardsControlArn!: Value<string>;
  Reason?: Value<string>;
  constructor(properties: StandardsControl) {
    Object.assign(this, properties);
  }
}
export interface StandardProperties {
  StandardsArn: Value<string>;
  DisabledStandardsControls?: List<StandardsControl>;
}
export default class Standard extends ResourceBase<StandardProperties> {
  static StandardsControl = StandardsControl;
  constructor(properties: StandardProperties) {
    super('AWS::SecurityHub::Standard', properties);
  }
}
