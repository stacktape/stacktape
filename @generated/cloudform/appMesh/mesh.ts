import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EgressFilter {
  Type!: Value<string>;
  constructor(properties: EgressFilter) {
    Object.assign(this, properties);
  }
}

export class MeshServiceDiscovery {
  IpPreference?: Value<string>;
  constructor(properties: MeshServiceDiscovery) {
    Object.assign(this, properties);
  }
}

export class MeshSpec {
  EgressFilter?: EgressFilter;
  ServiceDiscovery?: MeshServiceDiscovery;
  constructor(properties: MeshSpec) {
    Object.assign(this, properties);
  }
}
export interface MeshProperties {
  MeshName?: Value<string>;
  Spec?: MeshSpec;
  Tags?: List<ResourceTag>;
}
export default class Mesh extends ResourceBase<MeshProperties> {
  static EgressFilter = EgressFilter;
  static MeshServiceDiscovery = MeshServiceDiscovery;
  static MeshSpec = MeshSpec;
  constructor(properties?: MeshProperties) {
    super('AWS::AppMesh::Mesh', properties || {});
  }
}
