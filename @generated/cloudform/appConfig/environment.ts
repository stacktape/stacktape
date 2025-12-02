import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Monitor {
  AlarmArn!: Value<string>;
  AlarmRoleArn?: Value<string>;
  constructor(properties: Monitor) {
    Object.assign(this, properties);
  }
}
export interface EnvironmentProperties {
  Description?: Value<string>;
  Monitors?: List<Monitor>;
  DeletionProtectionCheck?: Value<string>;
  ApplicationId: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Environment extends ResourceBase<EnvironmentProperties> {
  static Monitor = Monitor;
  constructor(properties: EnvironmentProperties) {
    super('AWS::AppConfig::Environment', properties);
  }
}
