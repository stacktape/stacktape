import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ClusterNetworkSettings {
  InterfaceMappings?: List<InterfaceMapping>;
  DefaultRoute?: Value<string>;
  constructor(properties: ClusterNetworkSettings) {
    Object.assign(this, properties);
  }
}

export class InterfaceMapping {
  NetworkId?: Value<string>;
  LogicalInterfaceName?: Value<string>;
  constructor(properties: InterfaceMapping) {
    Object.assign(this, properties);
  }
}

export class Tags {
  Value?: Value<string>;
  Key?: Value<string>;
  constructor(properties: Tags) {
    Object.assign(this, properties);
  }
}
export interface ClusterProperties {
  NetworkSettings?: ClusterNetworkSettings;
  InstanceRoleArn?: Value<string>;
  ClusterType?: Value<string>;
  Tags?: List<Tags>;
  Name?: Value<string>;
}
export default class Cluster extends ResourceBase<ClusterProperties> {
  static ClusterNetworkSettings = ClusterNetworkSettings;
  static InterfaceMapping = InterfaceMapping;
  static Tags = Tags;
  constructor(properties?: ClusterProperties) {
    super('AWS::MediaLive::Cluster', properties || {});
  }
}
