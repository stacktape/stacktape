import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface VPCBlockPublicAccessOptionsProperties {
  InternetGatewayBlockMode: Value<string>;
}
export default class VPCBlockPublicAccessOptions extends ResourceBase<VPCBlockPublicAccessOptionsProperties> {
  constructor(properties: VPCBlockPublicAccessOptionsProperties) {
    super('AWS::EC2::VPCBlockPublicAccessOptions', properties);
  }
}
