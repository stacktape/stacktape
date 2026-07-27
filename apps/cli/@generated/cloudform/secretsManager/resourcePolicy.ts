import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ResourcePolicyProperties {
  BlockPublicPolicy?: Value<boolean>;
  SecretId: Value<string>;
  ResourcePolicy: { [key: string]: any };
}
export default class ResourcePolicy extends ResourceBase<ResourcePolicyProperties> {
  constructor(properties: ResourcePolicyProperties) {
    super('AWS::SecretsManager::ResourcePolicy', properties);
  }
}
