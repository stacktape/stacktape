import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class PortMapping {
  Port!: Value<number>;
  Protocol!: Value<string>;
  constructor(properties: PortMapping) {
    Object.assign(this, properties);
  }
}

export class VirtualRouterListener {
  PortMapping!: PortMapping;
  constructor(properties: VirtualRouterListener) {
    Object.assign(this, properties);
  }
}

export class VirtualRouterSpec {
  Listeners!: List<VirtualRouterListener>;
  constructor(properties: VirtualRouterSpec) {
    Object.assign(this, properties);
  }
}
export interface VirtualRouterProperties {
  MeshName: Value<string>;
  VirtualRouterName?: Value<string>;
  MeshOwner?: Value<string>;
  Spec: VirtualRouterSpec;
  Tags?: List<ResourceTag>;
}
export default class VirtualRouter extends ResourceBase<VirtualRouterProperties> {
  static PortMapping = PortMapping;
  static VirtualRouterListener = VirtualRouterListener;
  static VirtualRouterSpec = VirtualRouterSpec;
  constructor(properties: VirtualRouterProperties) {
    super('AWS::AppMesh::VirtualRouter', properties);
  }
}
