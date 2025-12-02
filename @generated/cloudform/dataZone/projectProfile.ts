import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AwsAccount {
  AwsAccountId!: Value<string>;
  constructor(properties: AwsAccount) {
    Object.assign(this, properties);
  }
}

export class EnvironmentConfiguration {
  Description?: Value<string>;
  EnvironmentConfigurationId?: Value<string>;
  AwsRegion!: Region;
  AwsAccount?: AwsAccount;
  DeploymentMode?: Value<string>;
  EnvironmentBlueprintId!: Value<string>;
  ConfigurationParameters?: EnvironmentConfigurationParametersDetails;
  DeploymentOrder?: Value<number>;
  Name!: Value<string>;
  constructor(properties: EnvironmentConfiguration) {
    Object.assign(this, properties);
  }
}

export class EnvironmentConfigurationParameter {
  IsEditable?: Value<boolean>;
  Value?: Value<string>;
  Name?: Value<string>;
  constructor(properties: EnvironmentConfigurationParameter) {
    Object.assign(this, properties);
  }
}

export class EnvironmentConfigurationParametersDetails {
  ParameterOverrides?: List<EnvironmentConfigurationParameter>;
  ResolvedParameters?: List<EnvironmentConfigurationParameter>;
  SsmPath?: Value<string>;
  constructor(properties: EnvironmentConfigurationParametersDetails) {
    Object.assign(this, properties);
  }
}

export class Region {
  RegionName!: Value<string>;
  constructor(properties: Region) {
    Object.assign(this, properties);
  }
}
export interface ProjectProfileProperties {
  Status?: Value<string>;
  EnvironmentConfigurations?: List<EnvironmentConfiguration>;
  Description?: Value<string>;
  DomainUnitIdentifier?: Value<string>;
  Name: Value<string>;
  DomainIdentifier?: Value<string>;
}
export default class ProjectProfile extends ResourceBase<ProjectProfileProperties> {
  static AwsAccount = AwsAccount;
  static EnvironmentConfiguration = EnvironmentConfiguration;
  static EnvironmentConfigurationParameter = EnvironmentConfigurationParameter;
  static EnvironmentConfigurationParametersDetails = EnvironmentConfigurationParametersDetails;
  static Region = Region;
  constructor(properties: ProjectProfileProperties) {
    super('AWS::DataZone::ProjectProfile', properties);
  }
}
