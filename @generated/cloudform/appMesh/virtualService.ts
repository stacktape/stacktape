import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class VirtualNodeServiceProvider {
  VirtualNodeName!: Value<string>;
  constructor(properties: VirtualNodeServiceProvider) {
    Object.assign(this, properties);
  }
}

export class VirtualRouterServiceProvider {
  VirtualRouterName!: Value<string>;
  constructor(properties: VirtualRouterServiceProvider) {
    Object.assign(this, properties);
  }
}

export class VirtualServiceProvider {
  VirtualNode?: VirtualNodeServiceProvider;
  VirtualRouter?: VirtualRouterServiceProvider;
  constructor(properties: VirtualServiceProvider) {
    Object.assign(this, properties);
  }
}

export class VirtualServiceSpec {
  Provider?: VirtualServiceProvider;
  constructor(properties: VirtualServiceSpec) {
    Object.assign(this, properties);
  }
}
export interface VirtualServiceProperties {
  MeshName: Value<string>;
  MeshOwner?: Value<string>;
  VirtualServiceName: Value<string>;
  Spec: VirtualServiceSpec;
  Tags?: List<ResourceTag>;
}
export default class VirtualService extends ResourceBase<VirtualServiceProperties> {
  static VirtualNodeServiceProvider = VirtualNodeServiceProvider;
  static VirtualRouterServiceProvider = VirtualRouterServiceProvider;
  static VirtualServiceProvider = VirtualServiceProvider;
  static VirtualServiceSpec = VirtualServiceSpec;
  constructor(properties: VirtualServiceProperties) {
    super('AWS::AppMesh::VirtualService', properties);
  }
}
