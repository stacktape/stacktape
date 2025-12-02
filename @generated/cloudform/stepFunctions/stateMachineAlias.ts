import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class DeploymentPreference {
  Type!: Value<string>;
  StateMachineVersionArn!: Value<string>;
  Percentage?: Value<number>;
  Alarms?: List<Value<string>>;
  Interval?: Value<number>;
  constructor(properties: DeploymentPreference) {
    Object.assign(this, properties);
  }
}

export class RoutingConfigurationVersion {
  StateMachineVersionArn!: Value<string>;
  Weight!: Value<number>;
  constructor(properties: RoutingConfigurationVersion) {
    Object.assign(this, properties);
  }
}
export interface StateMachineAliasProperties {
  Description?: Value<string>;
  RoutingConfiguration?: List<RoutingConfigurationVersion>;
  DeploymentPreference?: DeploymentPreference;
  Name?: Value<string>;
}
export default class StateMachineAlias extends ResourceBase<StateMachineAliasProperties> {
  static DeploymentPreference = DeploymentPreference;
  static RoutingConfigurationVersion = RoutingConfigurationVersion;
  constructor(properties?: StateMachineAliasProperties) {
    super('AWS::StepFunctions::StateMachineAlias', properties || {});
  }
}
