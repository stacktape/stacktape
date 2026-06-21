import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DaemonAlarmConfiguration {
  AlarmNames?: List<Value<string>>;
  Enable?: Value<boolean>;
  constructor(properties: DaemonAlarmConfiguration) {
    Object.assign(this, properties);
  }
}

export class DaemonDeploymentConfiguration {
  DrainPercent?: Value<number>;
  BakeTimeInMinutes?: Value<number>;
  Alarms?: DaemonAlarmConfiguration;
  constructor(properties: DaemonDeploymentConfiguration) {
    Object.assign(this, properties);
  }
}
export interface DaemonProperties {
  ClusterArn?: Value<string>;
  DaemonTaskDefinitionArn?: Value<string>;
  DaemonName?: Value<string>;
  EnableECSManagedTags?: Value<boolean>;
  CapacityProviderArns?: List<Value<string>>;
  EnableExecuteCommand?: Value<boolean>;
  PropagateTags?: Value<string>;
  DeploymentConfiguration?: DaemonDeploymentConfiguration;
  Tags?: List<ResourceTag>;
}
export default class Daemon extends ResourceBase<DaemonProperties> {
  static DaemonAlarmConfiguration = DaemonAlarmConfiguration;
  static DaemonDeploymentConfiguration = DaemonDeploymentConfiguration;
  constructor(properties?: DaemonProperties) {
    super('AWS::ECS::Daemon', properties || {});
  }
}
