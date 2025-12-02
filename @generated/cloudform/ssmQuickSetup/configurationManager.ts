import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ConfigurationDefinition {
  Type!: Value<string>;
  Parameters!: { [key: string]: Value<string> };
  LocalDeploymentExecutionRoleName?: Value<string>;
  TypeVersion?: Value<string>;
  LocalDeploymentAdministrationRoleArn?: Value<string>;
  id?: Value<string>;
  constructor(properties: ConfigurationDefinition) {
    Object.assign(this, properties);
  }
}

export class StatusSummary {
  Status?: Value<string>;
  LastUpdatedAt!: Value<string>;
  StatusType!: Value<string>;
  StatusDetails?: { [key: string]: Value<string> };
  StatusMessage?: Value<string>;
  constructor(properties: StatusSummary) {
    Object.assign(this, properties);
  }
}
export interface ConfigurationManagerProperties {
  Description?: Value<string>;
  ConfigurationDefinitions: List<ConfigurationDefinition>;
  Tags?: { [key: string]: Value<string> };
  Name?: Value<string>;
}
export default class ConfigurationManager extends ResourceBase<ConfigurationManagerProperties> {
  static ConfigurationDefinition = ConfigurationDefinition;
  static StatusSummary = StatusSummary;
  constructor(properties: ConfigurationManagerProperties) {
    super('AWS::SSMQuickSetup::ConfigurationManager', properties);
  }
}
