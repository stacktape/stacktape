import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface DirectoryRegistrationProperties {
  DirectoryId: Value<string>;
  Tags?: { [key: string]: Value<string> };
}
export default class DirectoryRegistration extends ResourceBase<DirectoryRegistrationProperties> {
  constructor(properties: DirectoryRegistrationProperties) {
    super('AWS::PCAConnectorAD::DirectoryRegistration', properties);
  }
}
