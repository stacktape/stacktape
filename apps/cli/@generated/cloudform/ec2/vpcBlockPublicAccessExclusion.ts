import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface VPCBlockPublicAccessExclusionProperties {
  InternetGatewayExclusionMode: Value<string>;
  VpcId?: Value<string>;
  SubnetId?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class VPCBlockPublicAccessExclusion extends ResourceBase<VPCBlockPublicAccessExclusionProperties> {
  constructor(properties: VPCBlockPublicAccessExclusionProperties) {
    super('AWS::EC2::VPCBlockPublicAccessExclusion', properties);
  }
}
