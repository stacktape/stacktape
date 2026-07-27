import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ConnectionsList {
  Connections?: List<Value<string>>;
  constructor(properties: ConnectionsList) {
    Object.assign(this, properties);
  }
}

export class ExecutionProperty {
  MaxConcurrentRuns?: Value<number>;
  constructor(properties: ExecutionProperty) {
    Object.assign(this, properties);
  }
}

export class JobCommand {
  Runtime?: Value<string>;
  PythonVersion?: Value<string>;
  ScriptLocation?: Value<string>;
  Name?: Value<string>;
  constructor(properties: JobCommand) {
    Object.assign(this, properties);
  }
}

export class NotificationProperty {
  NotifyDelayAfter?: Value<number>;
  constructor(properties: NotificationProperty) {
    Object.assign(this, properties);
  }
}
export interface JobProperties {
  Connections?: ConnectionsList;
  MaxRetries?: Value<number>;
  JobMode?: Value<string>;
  Description?: Value<string>;
  Timeout?: Value<number>;
  AllocatedCapacity?: Value<number>;
  JobRunQueuingEnabled?: Value<boolean>;
  Name?: Value<string>;
  Role: Value<string>;
  DefaultArguments?: { [key: string]: any };
  NotificationProperty?: NotificationProperty;
  WorkerType?: Value<string>;
  ExecutionClass?: Value<string>;
  LogUri?: Value<string>;
  Command: JobCommand;
  GlueVersion?: Value<string>;
  ExecutionProperty?: ExecutionProperty;
  SecurityConfiguration?: Value<string>;
  MaintenanceWindow?: Value<string>;
  NumberOfWorkers?: Value<number>;
  Tags?: { [key: string]: any };
  MaxCapacity?: Value<number>;
  NonOverridableArguments?: { [key: string]: any };
}
export default class Job extends ResourceBase<JobProperties> {
  static ConnectionsList = ConnectionsList;
  static ExecutionProperty = ExecutionProperty;
  static JobCommand = JobCommand;
  static NotificationProperty = NotificationProperty;
  constructor(properties: JobProperties) {
    super('AWS::Glue::Job', properties);
  }
}
