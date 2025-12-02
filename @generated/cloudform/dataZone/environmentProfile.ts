import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class EnvironmentParameter {
  Value?: Value<string>;
  Name?: Value<string>;
  constructor(properties: EnvironmentParameter) {
    Object.assign(this, properties);
  }
}
export interface EnvironmentProfileProperties {
  ProjectIdentifier: Value<string>;
  UserParameters?: List<EnvironmentParameter>;
  Description?: Value<string>;
  AwsAccountRegion: Value<string>;
  AwsAccountId: Value<string>;
  EnvironmentBlueprintIdentifier: Value<string>;
  Name: Value<string>;
  DomainIdentifier: Value<string>;
}
export default class EnvironmentProfile extends ResourceBase<EnvironmentProfileProperties> {
  static EnvironmentParameter = EnvironmentParameter;
  constructor(properties: EnvironmentProfileProperties) {
    super('AWS::DataZone::EnvironmentProfile', properties);
  }
}
