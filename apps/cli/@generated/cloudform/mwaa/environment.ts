import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class LoggingConfiguration {
  SchedulerLogs?: ModuleLoggingConfiguration;
  TaskLogs?: ModuleLoggingConfiguration;
  DagProcessingLogs?: ModuleLoggingConfiguration;
  WebserverLogs?: ModuleLoggingConfiguration;
  WorkerLogs?: ModuleLoggingConfiguration;
  constructor(properties: LoggingConfiguration) {
    Object.assign(this, properties);
  }
}

export class ModuleLoggingConfiguration {
  CloudWatchLogGroupArn?: Value<string>;
  Enabled?: Value<boolean>;
  LogLevel?: Value<string>;
  constructor(properties: ModuleLoggingConfiguration) {
    Object.assign(this, properties);
  }
}

export class NetworkConfiguration {
  SubnetIds?: List<Value<string>>;
  SecurityGroupIds?: List<Value<string>>;
  constructor(properties: NetworkConfiguration) {
    Object.assign(this, properties);
  }
}
export interface EnvironmentProperties {
  AirflowConfigurationOptions?: { [key: string]: any };
  PluginsS3Path?: Value<string>;
  WorkerReplacementStrategy?: Value<string>;
  StartupScriptS3Path?: Value<string>;
  Name: Value<string>;
  ExecutionRoleArn?: Value<string>;
  StartupScriptS3ObjectVersion?: Value<string>;
  DagS3Path?: Value<string>;
  LoggingConfiguration?: LoggingConfiguration;
  WebserverAccessMode?: Value<string>;
  NetworkConfiguration?: NetworkConfiguration;
  KmsKey?: Value<string>;
  Tags?: { [key: string]: any };
  MaxWorkers?: Value<number>;
  EnvironmentClass?: Value<string>;
  Schedulers?: Value<number>;
  RequirementsS3Path?: Value<string>;
  MinWorkers?: Value<number>;
  AirflowVersion?: Value<string>;
  RequirementsS3ObjectVersion?: Value<string>;
  SourceBucketArn?: Value<string>;
  WeeklyMaintenanceWindowStart?: Value<string>;
  PluginsS3ObjectVersion?: Value<string>;
  EndpointManagement?: Value<string>;
  MaxWebservers?: Value<number>;
  MinWebservers?: Value<number>;
}
export default class Environment extends ResourceBase<EnvironmentProperties> {
  static LoggingConfiguration = LoggingConfiguration;
  static ModuleLoggingConfiguration = ModuleLoggingConfiguration;
  static NetworkConfiguration = NetworkConfiguration;
  constructor(properties: EnvironmentProperties) {
    super('AWS::MWAA::Environment', properties);
  }
}
