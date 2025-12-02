import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Alarm {
  AlarmName!: Value<string>;
  Severity?: Value<string>;
  constructor(properties: Alarm) {
    Object.assign(this, properties);
  }
}

export class AlarmMetric {
  AlarmMetricName!: Value<string>;
  constructor(properties: AlarmMetric) {
    Object.assign(this, properties);
  }
}

export class ComponentConfiguration {
  SubComponentTypeConfigurations?: List<SubComponentTypeConfiguration>;
  ConfigurationDetails?: ConfigurationDetails;
  constructor(properties: ComponentConfiguration) {
    Object.assign(this, properties);
  }
}

export class ComponentMonitoringSetting {
  CustomComponentConfiguration?: ComponentConfiguration;
  Tier!: Value<string>;
  ComponentConfigurationMode!: Value<string>;
  DefaultOverwriteComponentConfiguration?: ComponentConfiguration;
  ComponentName?: Value<string>;
  ComponentARN?: Value<string>;
  constructor(properties: ComponentMonitoringSetting) {
    Object.assign(this, properties);
  }
}

export class ConfigurationDetails {
  NetWeaverPrometheusExporter?: NetWeaverPrometheusExporter;
  WindowsEvents?: List<WindowsEvent>;
  AlarmMetrics?: List<AlarmMetric>;
  Alarms?: List<Alarm>;
  SQLServerPrometheusExporter?: SQLServerPrometheusExporter;
  HAClusterPrometheusExporter?: HAClusterPrometheusExporter;
  HANAPrometheusExporter?: HANAPrometheusExporter;
  Logs?: List<Log>;
  Processes?: List<Process>;
  JMXPrometheusExporter?: JMXPrometheusExporter;
  constructor(properties: ConfigurationDetails) {
    Object.assign(this, properties);
  }
}

export class CustomComponent {
  ResourceList!: List<Value<string>>;
  ComponentName!: Value<string>;
  constructor(properties: CustomComponent) {
    Object.assign(this, properties);
  }
}

export class HAClusterPrometheusExporter {
  PrometheusPort?: Value<string>;
  constructor(properties: HAClusterPrometheusExporter) {
    Object.assign(this, properties);
  }
}

export class HANAPrometheusExporter {
  HANAPort!: Value<string>;
  PrometheusPort?: Value<string>;
  HANASecretName!: Value<string>;
  HANASID!: Value<string>;
  AgreeToInstallHANADBClient!: Value<boolean>;
  constructor(properties: HANAPrometheusExporter) {
    Object.assign(this, properties);
  }
}

export class JMXPrometheusExporter {
  PrometheusPort?: Value<string>;
  JMXURL?: Value<string>;
  HostPort?: Value<string>;
  constructor(properties: JMXPrometheusExporter) {
    Object.assign(this, properties);
  }
}

export class Log {
  LogType!: Value<string>;
  Encoding?: Value<string>;
  LogGroupName?: Value<string>;
  LogPath?: Value<string>;
  PatternSet?: Value<string>;
  constructor(properties: Log) {
    Object.assign(this, properties);
  }
}

export class LogPattern {
  Pattern!: Value<string>;
  Rank!: Value<number>;
  PatternName!: Value<string>;
  constructor(properties: LogPattern) {
    Object.assign(this, properties);
  }
}

export class LogPatternSet {
  PatternSetName!: Value<string>;
  LogPatterns!: List<LogPattern>;
  constructor(properties: LogPatternSet) {
    Object.assign(this, properties);
  }
}

export class NetWeaverPrometheusExporter {
  PrometheusPort?: Value<string>;
  InstanceNumbers!: List<Value<string>>;
  SAPSID!: Value<string>;
  constructor(properties: NetWeaverPrometheusExporter) {
    Object.assign(this, properties);
  }
}

export class Process {
  ProcessName!: Value<string>;
  AlarmMetrics!: List<AlarmMetric>;
  constructor(properties: Process) {
    Object.assign(this, properties);
  }
}

export class SQLServerPrometheusExporter {
  PrometheusPort!: Value<string>;
  SQLSecretName!: Value<string>;
  constructor(properties: SQLServerPrometheusExporter) {
    Object.assign(this, properties);
  }
}

export class SubComponentConfigurationDetails {
  WindowsEvents?: List<WindowsEvent>;
  AlarmMetrics?: List<AlarmMetric>;
  Logs?: List<Log>;
  Processes?: List<Process>;
  constructor(properties: SubComponentConfigurationDetails) {
    Object.assign(this, properties);
  }
}

export class SubComponentTypeConfiguration {
  SubComponentType!: Value<string>;
  SubComponentConfigurationDetails!: SubComponentConfigurationDetails;
  constructor(properties: SubComponentTypeConfiguration) {
    Object.assign(this, properties);
  }
}

export class WindowsEvent {
  EventLevels!: List<Value<string>>;
  LogGroupName!: Value<string>;
  EventName!: Value<string>;
  PatternSet?: Value<string>;
  constructor(properties: WindowsEvent) {
    Object.assign(this, properties);
  }
}
export interface ApplicationProperties {
  AutoConfigurationEnabled?: Value<boolean>;
  OpsItemSNSTopicArn?: Value<string>;
  OpsCenterEnabled?: Value<boolean>;
  CustomComponents?: List<CustomComponent>;
  SNSNotificationArn?: Value<string>;
  AttachMissingPermission?: Value<boolean>;
  LogPatternSets?: List<LogPatternSet>;
  GroupingType?: Value<string>;
  ComponentMonitoringSettings?: List<ComponentMonitoringSetting>;
  CWEMonitorEnabled?: Value<boolean>;
  Tags?: List<ResourceTag>;
  ResourceGroupName: Value<string>;
}
export default class Application extends ResourceBase<ApplicationProperties> {
  static Alarm = Alarm;
  static AlarmMetric = AlarmMetric;
  static ComponentConfiguration = ComponentConfiguration;
  static ComponentMonitoringSetting = ComponentMonitoringSetting;
  static ConfigurationDetails = ConfigurationDetails;
  static CustomComponent = CustomComponent;
  static HAClusterPrometheusExporter = HAClusterPrometheusExporter;
  static HANAPrometheusExporter = HANAPrometheusExporter;
  static JMXPrometheusExporter = JMXPrometheusExporter;
  static Log = Log;
  static LogPattern = LogPattern;
  static LogPatternSet = LogPatternSet;
  static NetWeaverPrometheusExporter = NetWeaverPrometheusExporter;
  static Process = Process;
  static SQLServerPrometheusExporter = SQLServerPrometheusExporter;
  static SubComponentConfigurationDetails = SubComponentConfigurationDetails;
  static SubComponentTypeConfiguration = SubComponentTypeConfiguration;
  static WindowsEvent = WindowsEvent;
  constructor(properties: ApplicationProperties) {
    super('AWS::ApplicationInsights::Application', properties);
  }
}
