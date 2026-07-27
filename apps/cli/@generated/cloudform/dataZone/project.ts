import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class EnvironmentConfigurationUserParameter {
  EnvironmentId?: Value<string>;
  EnvironmentParameters?: List<EnvironmentParameter>;
  EnvironmentConfigurationName?: Value<string>;
  constructor(properties: EnvironmentConfigurationUserParameter) {
    Object.assign(this, properties);
  }
}

export class EnvironmentParameter {
  Value?: Value<string>;
  Name?: Value<string>;
  constructor(properties: EnvironmentParameter) {
    Object.assign(this, properties);
  }
}

export class Member {
  UserIdentifier?: Value<string>;
  GroupIdentifier?: Value<string>;
  constructor(properties: Member) {
    Object.assign(this, properties);
  }
}

export class ProjectMembershipAssignment {
  Designation!: Value<string>;
  Member!: Member;
  constructor(properties: ProjectMembershipAssignment) {
    Object.assign(this, properties);
  }
}

export class ResourceTag {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: ResourceTag) {
    Object.assign(this, properties);
  }
}
export interface ProjectProperties {
  DomainUnitId?: Value<string>;
  ProjectProfileId?: Value<string>;
  UserParameters?: List<EnvironmentConfigurationUserParameter>;
  Description?: Value<string>;
  ProjectCategory?: Value<string>;
  ResourceTags?: List<ResourceTag>;
  GlossaryTerms?: List<Value<string>>;
  ProjectExecutionRole?: Value<string>;
  ProjectProfileVersion?: Value<string>;
  MembershipAssignments?: List<ProjectMembershipAssignment>;
  Name: Value<string>;
  DomainIdentifier: Value<string>;
}
export default class Project extends ResourceBase<ProjectProperties> {
  static EnvironmentConfigurationUserParameter = EnvironmentConfigurationUserParameter;
  static EnvironmentParameter = EnvironmentParameter;
  static Member = Member;
  static ProjectMembershipAssignment = ProjectMembershipAssignment;
  static ResourceTag = ResourceTag;
  constructor(properties: ProjectProperties) {
    super('AWS::DataZone::Project', properties);
  }
}
