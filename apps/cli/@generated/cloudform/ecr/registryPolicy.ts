import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface RegistryPolicyProperties {
  PolicyText: { [key: string]: any };
}
export default class RegistryPolicy extends ResourceBase<RegistryPolicyProperties> {
  constructor(properties: RegistryPolicyProperties) {
    super('AWS::ECR::RegistryPolicy', properties);
  }
}
