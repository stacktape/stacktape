import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ServerSideEncryptionConfiguration {
  KmsKeyId?: Value<string>;
  constructor(properties: ServerSideEncryptionConfiguration) {
    Object.assign(this, properties);
  }
}
export interface AssistantProperties {
  Type: Value<string>;
  Description?: Value<string>;
  ServerSideEncryptionConfiguration?: ServerSideEncryptionConfiguration;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Assistant extends ResourceBase<AssistantProperties> {
  static ServerSideEncryptionConfiguration = ServerSideEncryptionConfiguration;
  constructor(properties: AssistantProperties) {
    super('AWS::Wisdom::Assistant', properties);
  }
}
