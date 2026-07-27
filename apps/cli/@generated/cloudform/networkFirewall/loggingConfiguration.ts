import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class LogDestinationConfig {
  LogType!: Value<string>;
  LogDestination!: { [key: string]: Value<string> };
  LogDestinationType!: Value<string>;
  constructor(properties: LogDestinationConfig) {
    Object.assign(this, properties);
  }
}

export class LoggingConfigurationInner {
  LogDestinationConfigs!: List<LogDestinationConfig>;
  constructor(properties: LoggingConfigurationInner) {
    Object.assign(this, properties);
  }
}
export interface LoggingConfigurationProperties {
  EnableMonitoringDashboard?: Value<boolean>;
  FirewallName?: Value<string>;
  FirewallArn: Value<string>;
  LoggingConfiguration: LoggingConfiguration;
}
export default class LoggingConfiguration extends ResourceBase<LoggingConfigurationProperties> {
  static LogDestinationConfig = LogDestinationConfig;
  static LoggingConfiguration = LoggingConfigurationInner;
  constructor(properties: LoggingConfigurationProperties) {
    super('AWS::NetworkFirewall::LoggingConfiguration', properties);
  }
}
