import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ExclusionByResourceTypes {
  ResourceTypes!: List<Value<string>>;
  constructor(properties: ExclusionByResourceTypes) {
    Object.assign(this, properties);
  }
}

export class RecordingGroup {
  AllSupported?: Value<boolean>;
  ExclusionByResourceTypes?: ExclusionByResourceTypes;
  IncludeGlobalResourceTypes?: Value<boolean>;
  RecordingStrategy?: RecordingStrategy;
  ResourceTypes?: List<Value<string>>;
  constructor(properties: RecordingGroup) {
    Object.assign(this, properties);
  }
}

export class RecordingMode {
  RecordingFrequency!: Value<string>;
  RecordingModeOverrides?: List<RecordingModeOverride>;
  constructor(properties: RecordingMode) {
    Object.assign(this, properties);
  }
}

export class RecordingModeOverride {
  Description?: Value<string>;
  RecordingFrequency!: Value<string>;
  ResourceTypes!: List<Value<string>>;
  constructor(properties: RecordingModeOverride) {
    Object.assign(this, properties);
  }
}

export class RecordingStrategy {
  UseOnly!: Value<string>;
  constructor(properties: RecordingStrategy) {
    Object.assign(this, properties);
  }
}
export interface ConfigurationRecorderProperties {
  Name?: Value<string>;
  RecordingGroup?: RecordingGroup;
  RecordingMode?: RecordingMode;
  RoleARN: Value<string>;
}
export default class ConfigurationRecorder extends ResourceBase<ConfigurationRecorderProperties> {
  static ExclusionByResourceTypes = ExclusionByResourceTypes;
  static RecordingGroup = RecordingGroup;
  static RecordingMode = RecordingMode;
  static RecordingModeOverride = RecordingModeOverride;
  static RecordingStrategy = RecordingStrategy;
  constructor(properties: ConfigurationRecorderProperties) {
    super('AWS::Config::ConfigurationRecorder', properties);
  }
}
