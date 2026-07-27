import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class IPSetDescriptor {
  Type!: Value<string>;
  Value!: Value<string>;
  constructor(properties: IPSetDescriptor) {
    Object.assign(this, properties);
  }
}
export interface IPSetProperties {
  IPSetDescriptors?: List<IPSetDescriptor>;
  Name: Value<string>;
}
export default class IPSet extends ResourceBase<IPSetProperties> {
  static IPSetDescriptor = IPSetDescriptor;
  constructor(properties: IPSetProperties) {
    super('AWS::WAFRegional::IPSet', properties);
  }
}
