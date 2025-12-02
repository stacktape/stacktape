import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface GroupProfileProperties {
  Status?: Value<string>;
  DomainIdentifier: Value<string>;
  GroupIdentifier: Value<string>;
}
export default class GroupProfile extends ResourceBase<GroupProfileProperties> {
  constructor(properties: GroupProfileProperties) {
    super('AWS::DataZone::GroupProfile', properties);
  }
}
