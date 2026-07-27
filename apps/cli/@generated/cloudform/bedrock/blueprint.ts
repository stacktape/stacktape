import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface BlueprintProperties {
  Type: Value<string>;
  BlueprintName: Value<string>;
  KmsKeyId?: Value<string>;
  Schema: { [key: string]: any };
  KmsEncryptionContext?: { [key: string]: Value<string> };
  Tags?: List<ResourceTag>;
}
export default class Blueprint extends ResourceBase<BlueprintProperties> {
  constructor(properties: BlueprintProperties) {
    super('AWS::Bedrock::Blueprint', properties);
  }
}
