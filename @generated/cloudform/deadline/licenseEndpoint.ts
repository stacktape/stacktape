import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface LicenseEndpointProperties {
  VpcId: Value<string>;
  SecurityGroupIds: List<Value<string>>;
  SubnetIds: List<Value<string>>;
  Tags?: List<ResourceTag>;
}
export default class LicenseEndpoint extends ResourceBase<LicenseEndpointProperties> {
  constructor(properties: LicenseEndpointProperties) {
    super('AWS::Deadline::LicenseEndpoint', properties);
  }
}
