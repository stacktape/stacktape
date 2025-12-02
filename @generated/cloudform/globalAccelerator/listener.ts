import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class PortRange {
  FromPort!: Value<number>;
  ToPort!: Value<number>;
  constructor(properties: PortRange) {
    Object.assign(this, properties);
  }
}
export interface ListenerProperties {
  PortRanges: List<PortRange>;
  AcceleratorArn: Value<string>;
  Protocol: Value<string>;
  ClientAffinity?: Value<string>;
}
export default class Listener extends ResourceBase<ListenerProperties> {
  static PortRange = PortRange;
  constructor(properties: ListenerProperties) {
    super('AWS::GlobalAccelerator::Listener', properties);
  }
}
