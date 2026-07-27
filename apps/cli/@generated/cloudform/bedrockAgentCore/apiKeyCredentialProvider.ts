import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ApiKeySecretArn {
  SecretArn!: Value<string>;
  constructor(properties: ApiKeySecretArn) {
    Object.assign(this, properties);
  }
}
export interface ApiKeyCredentialProviderProperties {
  ApiKey?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class ApiKeyCredentialProvider extends ResourceBase<ApiKeyCredentialProviderProperties> {
  static ApiKeySecretArn = ApiKeySecretArn;
  constructor(properties: ApiKeyCredentialProviderProperties) {
    super('AWS::BedrockAgentCore::ApiKeyCredentialProvider', properties);
  }
}
