import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class MemberId {
  UserId!: Value<string>;
  constructor(properties: MemberId) {
    Object.assign(this, properties);
  }
}
export interface GroupMembershipProperties {
  MemberId: MemberId;
  IdentityStoreId: Value<string>;
  GroupId: Value<string>;
}
export default class GroupMembership extends ResourceBase<GroupMembershipProperties> {
  static MemberId = MemberId;
  constructor(properties: GroupMembershipProperties) {
    super('AWS::IdentityStore::GroupMembership', properties);
  }
}
