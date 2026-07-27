import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface TagSyncTaskProperties {
  Group: Value<string>;
  TagKey: Value<string>;
  TagValue: Value<string>;
  RoleArn: Value<string>;
}
export default class TagSyncTask extends ResourceBase<TagSyncTaskProperties> {
  constructor(properties: TagSyncTaskProperties) {
    super('AWS::ResourceGroups::TagSyncTask', properties);
  }
}
