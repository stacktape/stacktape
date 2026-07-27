import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ApplicationSettings {
  Status!: Value<string>;
  SettingsGroup?: Value<string>;
  constructor(properties: ApplicationSettings) {
    Object.assign(this, properties);
  }
}

export class Capacity {
  DesiredUserSessions!: Value<number>;
  constructor(properties: Capacity) {
    Object.assign(this, properties);
  }
}

export class TimeoutSettings {
  MaxUserDurationInSeconds?: Value<number>;
  IdleDisconnectTimeoutInSeconds?: Value<number>;
  DisconnectTimeoutInSeconds?: Value<number>;
  constructor(properties: TimeoutSettings) {
    Object.assign(this, properties);
  }
}
export interface WorkspacesPoolProperties {
  ApplicationSettings?: ApplicationSettings;
  BundleId: Value<string>;
  Description?: Value<string>;
  DirectoryId: Value<string>;
  TimeoutSettings?: TimeoutSettings;
  Capacity: Capacity;
  PoolName: Value<string>;
  RunningMode?: Value<string>;
}
export default class WorkspacesPool extends ResourceBase<WorkspacesPoolProperties> {
  static ApplicationSettings = ApplicationSettings;
  static Capacity = Capacity;
  static TimeoutSettings = TimeoutSettings;
  constructor(properties: WorkspacesPoolProperties) {
    super('AWS::WorkSpaces::WorkspacesPool', properties);
  }
}
