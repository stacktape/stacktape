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
export interface ProjectProperties {
  DomainUnitId?: Value<string>;
  ProjectProfileId?: Value<string>;
  UserParameters?: List<EnvironmentConfigurationUserParameter>;
  Description?: Value<string>;
  GlossaryTerms?: List<Value<string>>;
  ProjectProfileVersion?: Value<string>;
  Name: Value<string>;
  DomainIdentifier: Value<string>;
}
export default class Project extends ResourceBase<ProjectProperties> {
  static EnvironmentConfigurationUserParameter = EnvironmentConfigurationUserParameter;
  static EnvironmentParameter = EnvironmentParameter;
  constructor(properties: ProjectProperties) {
    super('AWS::DataZone::Project', properties);
  }
}
