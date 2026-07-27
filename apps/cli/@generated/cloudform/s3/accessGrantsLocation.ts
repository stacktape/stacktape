import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface AccessGrantsLocationProperties {
  LocationScope: Value<string>;
  IamRoleArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class AccessGrantsLocation extends ResourceBase<AccessGrantsLocationProperties> {
  constructor(properties: AccessGrantsLocationProperties) {
    super('AWS::S3::AccessGrantsLocation', properties);
  }
}
