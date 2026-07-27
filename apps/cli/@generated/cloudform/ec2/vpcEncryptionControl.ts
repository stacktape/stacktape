import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ResourceExclusions {
  ElasticFileSystem?: VpcEncryptionControlExclusion;
  VpcLattice?: VpcEncryptionControlExclusion;
  VpcPeering?: VpcEncryptionControlExclusion;
  InternetGateway?: VpcEncryptionControlExclusion;
  EgressOnlyInternetGateway?: VpcEncryptionControlExclusion;
  VirtualPrivateGateway?: VpcEncryptionControlExclusion;
  NatGateway?: VpcEncryptionControlExclusion;
  Lambda?: VpcEncryptionControlExclusion;
  constructor(properties: ResourceExclusions) {
    Object.assign(this, properties);
  }
}

export class VpcEncryptionControlExclusion {
  StateMessage?: Value<string>;
  State?: Value<string>;
  constructor(properties: VpcEncryptionControlExclusion) {
    Object.assign(this, properties);
  }
}
export interface VPCEncryptionControlProperties {
  VpcPeeringExclusionInput?: Value<string>;
  ElasticFileSystemExclusionInput?: Value<string>;
  VpcLatticeExclusionInput?: Value<string>;
  VpcId?: Value<string>;
  NatGatewayExclusionInput?: Value<string>;
  EgressOnlyInternetGatewayExclusionInput?: Value<string>;
  VirtualPrivateGatewayExclusionInput?: Value<string>;
  Mode?: Value<string>;
  InternetGatewayExclusionInput?: Value<string>;
  LambdaExclusionInput?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class VPCEncryptionControl extends ResourceBase<VPCEncryptionControlProperties> {
  static ResourceExclusions = ResourceExclusions;
  static VpcEncryptionControlExclusion = VpcEncryptionControlExclusion;
  constructor(properties?: VPCEncryptionControlProperties) {
    super('AWS::EC2::VPCEncryptionControl', properties || {});
  }
}
