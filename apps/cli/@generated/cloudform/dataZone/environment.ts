import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class EnvironmentParameter {
  Value?: Value<string>;
  Name?: Value<string>;
  constructor(properties: EnvironmentParameter) {
    Object.assign(this, properties);
  }
}
export interface EnvironmentProperties {
  ProjectIdentifier: Value<string>;
  EnvironmentAccountRegion?: Value<string>;
  UserParameters?: List<EnvironmentParameter>;
  Description?: Value<string>;
  EnvironmentConfigurationId?: Value<string>;
  GlossaryTerms?: List<Value<string>>;
  EnvironmentBlueprintIdentifier?: Value<string>;
  Name: Value<string>;
  EnvironmentRoleArn?: Value<string>;
  EnvironmentProfileIdentifier?: Value<string>;
  DeploymentOrder?: Value<number>;
  EnvironmentAccountIdentifier?: Value<string>;
  DomainIdentifier: Value<string>;
}
export default class Environment extends ResourceBase<EnvironmentProperties> {
  static EnvironmentParameter = EnvironmentParameter;
  constructor(properties: EnvironmentProperties) {
    super('AWS::DataZone::Environment', properties);
  }
}
