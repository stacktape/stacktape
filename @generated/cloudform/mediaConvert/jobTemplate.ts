import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AccelerationSettings {
  Mode!: Value<string>;
  constructor(properties: AccelerationSettings) {
    Object.assign(this, properties);
  }
}

export class HopDestination {
  WaitMinutes?: Value<number>;
  Priority?: Value<number>;
  Queue?: Value<string>;
  constructor(properties: HopDestination) {
    Object.assign(this, properties);
  }
}
export interface JobTemplateProperties {
  Category?: Value<string>;
  Description?: Value<string>;
  AccelerationSettings?: AccelerationSettings;
  Priority?: Value<number>;
  StatusUpdateInterval?: Value<string>;
  SettingsJson: { [key: string]: any };
  Queue?: Value<string>;
  HopDestinations?: List<HopDestination>;
  Tags?: { [key: string]: any };
  Name?: Value<string>;
}
export default class JobTemplate extends ResourceBase<JobTemplateProperties> {
  static AccelerationSettings = AccelerationSettings;
  static HopDestination = HopDestination;
  constructor(properties: JobTemplateProperties) {
    super('AWS::MediaConvert::JobTemplate', properties);
  }
}
