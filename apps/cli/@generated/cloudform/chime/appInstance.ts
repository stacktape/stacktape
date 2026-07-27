import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface AppInstanceProperties {
  Metadata?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class AppInstance extends ResourceBase<AppInstanceProperties> {
  constructor(properties: AppInstanceProperties) {
    super('AWS::Chime::AppInstance', properties);
  }
}
