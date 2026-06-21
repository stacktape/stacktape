import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface WorkloadIdentityProperties {
  AllowedResourceOauth2ReturnUrls?: List<Value<string>>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class WorkloadIdentity extends ResourceBase<WorkloadIdentityProperties> {
  constructor(properties: WorkloadIdentityProperties) {
    super('AWS::BedrockAgentCore::WorkloadIdentity', properties);
  }
}
