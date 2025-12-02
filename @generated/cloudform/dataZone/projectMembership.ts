import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Member {
  UserIdentifier?: Value<string>;
  GroupIdentifier?: Value<string>;
  constructor(properties: Member) {
    Object.assign(this, properties);
  }
}
export interface ProjectMembershipProperties {
  ProjectIdentifier: Value<string>;
  Designation: Value<string>;
  Member: Member;
  DomainIdentifier: Value<string>;
}
export default class ProjectMembership extends ResourceBase<ProjectMembershipProperties> {
  static Member = Member;
  constructor(properties: ProjectMembershipProperties) {
    super('AWS::DataZone::ProjectMembership', properties);
  }
}
