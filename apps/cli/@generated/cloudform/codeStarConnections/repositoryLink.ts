import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface RepositoryLinkProperties {
  OwnerId: Value<string>;
  EncryptionKeyArn?: Value<string>;
  ConnectionArn: Value<string>;
  RepositoryName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class RepositoryLink extends ResourceBase<RepositoryLinkProperties> {
  constructor(properties: RepositoryLinkProperties) {
    super('AWS::CodeStarConnections::RepositoryLink', properties);
  }
}
