import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class LakeFormationConfiguration {
  LocationRegistrationExcludeS3Locations?: List<Value<string>>;
  LocationRegistrationRole?: Value<string>;
  constructor(properties: LakeFormationConfiguration) {
    Object.assign(this, properties);
  }
}

export class ProvisioningConfiguration {
  LakeFormationConfiguration!: LakeFormationConfiguration;
  constructor(properties: ProvisioningConfiguration) {
    Object.assign(this, properties);
  }
}

export class RegionalParameter {
  Parameters?: { [key: string]: Value<string> };
  Region?: Value<string>;
  constructor(properties: RegionalParameter) {
    Object.assign(this, properties);
  }
}
export interface EnvironmentBlueprintConfigurationProperties {
  RegionalParameters?: List<RegionalParameter>;
  ProvisioningRoleArn?: Value<string>;
  ProvisioningConfigurations?: List<ProvisioningConfiguration>;
  EnabledRegions: List<Value<string>>;
  EnvironmentBlueprintIdentifier: Value<string>;
  DomainIdentifier: Value<string>;
  EnvironmentRolePermissionBoundary?: Value<string>;
  ManageAccessRoleArn?: Value<string>;
}
export default class EnvironmentBlueprintConfiguration extends ResourceBase<EnvironmentBlueprintConfigurationProperties> {
  static LakeFormationConfiguration = LakeFormationConfiguration;
  static ProvisioningConfiguration = ProvisioningConfiguration;
  static RegionalParameter = RegionalParameter;
  constructor(properties: EnvironmentBlueprintConfigurationProperties) {
    super('AWS::DataZone::EnvironmentBlueprintConfiguration', properties);
  }
}
