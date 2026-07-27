import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ServerSideEncryptionConfiguration {
  KmsKeyId!: Value<string>;
  constructor(properties: ServerSideEncryptionConfiguration) {
    Object.assign(this, properties);
  }
}
export interface DomainProperties {
  Description?: Value<string>;
  ServerSideEncryptionConfiguration: ServerSideEncryptionConfiguration;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Domain extends ResourceBase<DomainProperties> {
  static ServerSideEncryptionConfiguration = ServerSideEncryptionConfiguration;
  constructor(properties: DomainProperties) {
    super('AWS::VoiceID::Domain', properties);
  }
}
