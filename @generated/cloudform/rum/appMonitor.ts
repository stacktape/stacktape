import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AppMonitorConfiguration {
  MetricDestinations?: List<MetricDestination>;
  IncludedPages?: List<Value<string>>;
  ExcludedPages?: List<Value<string>>;
  FavoritePages?: List<Value<string>>;
  SessionSampleRate?: Value<number>;
  AllowCookies?: Value<boolean>;
  Telemetries?: List<Value<string>>;
  IdentityPoolId?: Value<string>;
  GuestRoleArn?: Value<string>;
  EnableXRay?: Value<boolean>;
  constructor(properties: AppMonitorConfiguration) {
    Object.assign(this, properties);
  }
}

export class CustomEvents {
  Status?: Value<string>;
  constructor(properties: CustomEvents) {
    Object.assign(this, properties);
  }
}

export class DeobfuscationConfiguration {
  JavaScriptSourceMaps?: JavaScriptSourceMaps;
  constructor(properties: DeobfuscationConfiguration) {
    Object.assign(this, properties);
  }
}

export class JavaScriptSourceMaps {
  Status!: Value<string>;
  S3Uri?: Value<string>;
  constructor(properties: JavaScriptSourceMaps) {
    Object.assign(this, properties);
  }
}

export class MetricDefinition {
  EventPattern?: Value<string>;
  ValueKey?: Value<string>;
  UnitLabel?: Value<string>;
  DimensionKeys?: { [key: string]: Value<string> };
  Namespace?: Value<string>;
  Name!: Value<string>;
  constructor(properties: MetricDefinition) {
    Object.assign(this, properties);
  }
}

export class MetricDestination {
  Destination!: Value<string>;
  IamRoleArn?: Value<string>;
  MetricDefinitions?: List<MetricDefinition>;
  DestinationArn?: Value<string>;
  constructor(properties: MetricDestination) {
    Object.assign(this, properties);
  }
}

export class ResourcePolicy {
  PolicyRevisionId?: Value<string>;
  PolicyDocument!: Value<string>;
  constructor(properties: ResourcePolicy) {
    Object.assign(this, properties);
  }
}
export interface AppMonitorProperties {
  CustomEvents?: CustomEvents;
  CwLogEnabled?: Value<boolean>;
  ResourcePolicy?: ResourcePolicy;
  DomainList?: List<Value<string>>;
  DeobfuscationConfiguration?: DeobfuscationConfiguration;
  Domain?: Value<string>;
  AppMonitorConfiguration?: AppMonitorConfiguration;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class AppMonitor extends ResourceBase<AppMonitorProperties> {
  static AppMonitorConfiguration = AppMonitorConfiguration;
  static CustomEvents = CustomEvents;
  static DeobfuscationConfiguration = DeobfuscationConfiguration;
  static JavaScriptSourceMaps = JavaScriptSourceMaps;
  static MetricDefinition = MetricDefinition;
  static MetricDestination = MetricDestination;
  static ResourcePolicy = ResourcePolicy;
  constructor(properties: AppMonitorProperties) {
    super('AWS::RUM::AppMonitor', properties);
  }
}
