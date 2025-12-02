import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ContainerInfo {
  EksInfo!: EksInfo;
  constructor(properties: ContainerInfo) {
    Object.assign(this, properties);
  }
}

export class ContainerProvider {
  Type!: Value<string>;
  Id!: Value<string>;
  Info!: ContainerInfo;
  constructor(properties: ContainerProvider) {
    Object.assign(this, properties);
  }
}

export class EksInfo {
  Namespace!: Value<string>;
  constructor(properties: EksInfo) {
    Object.assign(this, properties);
  }
}
export interface VirtualClusterProperties {
  SecurityConfigurationId?: Value<string>;
  ContainerProvider: ContainerProvider;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class VirtualCluster extends ResourceBase<VirtualClusterProperties> {
  static ContainerInfo = ContainerInfo;
  static ContainerProvider = ContainerProvider;
  static EksInfo = EksInfo;
  constructor(properties: VirtualClusterProperties) {
    super('AWS::EMRContainers::VirtualCluster', properties);
  }
}
