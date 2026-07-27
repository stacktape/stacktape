import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class NodeConfiguration {
  AvailabilityZone!: Value<string>;
  InstanceType!: Value<string>;
  constructor(properties: NodeConfiguration) {
    Object.assign(this, properties);
  }
}
export interface NodeProperties {
  MemberId?: Value<string>;
  NetworkId: Value<string>;
  NodeConfiguration: NodeConfiguration;
}
export default class Node extends ResourceBase<NodeProperties> {
  static NodeConfiguration = NodeConfiguration;
  constructor(properties: NodeProperties) {
    super('AWS::ManagedBlockchain::Node', properties);
  }
}
