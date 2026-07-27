import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CloudWatchDashboard {
  DashboardIdentifier!: Value<string>;
  constructor(properties: CloudWatchDashboard) {
    Object.assign(this, properties);
  }
}

export class CloudWatchLogsConfiguration {
  LogGroupArn!: Value<string>;
  constructor(properties: CloudWatchLogsConfiguration) {
    Object.assign(this, properties);
  }
}

export class DataSources {
  CloudWatchDashboards?: List<CloudWatchDashboard>;
  constructor(properties: DataSources) {
    Object.assign(this, properties);
  }
}

export class ExperimentReportS3Configuration {
  BucketName!: Value<string>;
  Prefix?: Value<string>;
  constructor(properties: ExperimentReportS3Configuration) {
    Object.assign(this, properties);
  }
}

export class ExperimentTemplateAction {
  ActionId!: Value<string>;
  Description?: Value<string>;
  Parameters?: { [key: string]: Value<string> };
  Targets?: { [key: string]: Value<string> };
  StartAfter?: List<Value<string>>;
  constructor(properties: ExperimentTemplateAction) {
    Object.assign(this, properties);
  }
}

export class ExperimentTemplateExperimentOptions {
  EmptyTargetResolutionMode?: Value<string>;
  AccountTargeting?: Value<string>;
  constructor(properties: ExperimentTemplateExperimentOptions) {
    Object.assign(this, properties);
  }
}

export class ExperimentTemplateExperimentReportConfiguration {
  DataSources?: DataSources;
  PostExperimentDuration?: Value<string>;
  Outputs!: Outputs;
  PreExperimentDuration?: Value<string>;
  constructor(properties: ExperimentTemplateExperimentReportConfiguration) {
    Object.assign(this, properties);
  }
}

export class ExperimentTemplateLogConfiguration {
  S3Configuration?: S3Configuration;
  LogSchemaVersion!: Value<number>;
  CloudWatchLogsConfiguration?: CloudWatchLogsConfiguration;
  constructor(properties: ExperimentTemplateLogConfiguration) {
    Object.assign(this, properties);
  }
}

export class ExperimentTemplateStopCondition {
  Value?: Value<string>;
  Source!: Value<string>;
  constructor(properties: ExperimentTemplateStopCondition) {
    Object.assign(this, properties);
  }
}

export class ExperimentTemplateTarget {
  Filters?: List<ExperimentTemplateTargetFilter>;
  Parameters?: { [key: string]: Value<string> };
  ResourceTags?: { [key: string]: Value<string> };
  ResourceType!: Value<string>;
  ResourceArns?: List<Value<string>>;
  SelectionMode!: Value<string>;
  constructor(properties: ExperimentTemplateTarget) {
    Object.assign(this, properties);
  }
}

export class ExperimentTemplateTargetFilter {
  Path!: Value<string>;
  Values!: List<Value<string>>;
  constructor(properties: ExperimentTemplateTargetFilter) {
    Object.assign(this, properties);
  }
}

export class Outputs {
  ExperimentReportS3Configuration!: ExperimentReportS3Configuration;
  constructor(properties: Outputs) {
    Object.assign(this, properties);
  }
}

export class S3Configuration {
  BucketName!: Value<string>;
  Prefix?: Value<string>;
  constructor(properties: S3Configuration) {
    Object.assign(this, properties);
  }
}
export interface ExperimentTemplateProperties {
  ExperimentReportConfiguration?: ExperimentTemplateExperimentReportConfiguration;
  Description: Value<string>;
  Actions?: { [key: string]: ExperimentTemplateAction };
  ExperimentOptions?: ExperimentTemplateExperimentOptions;
  StopConditions: List<ExperimentTemplateStopCondition>;
  Targets: { [key: string]: ExperimentTemplateTarget };
  LogConfiguration?: ExperimentTemplateLogConfiguration;
  RoleArn: Value<string>;
  Tags?: { [key: string]: Value<string> };
}
export default class ExperimentTemplate extends ResourceBase<ExperimentTemplateProperties> {
  static CloudWatchDashboard = CloudWatchDashboard;
  static CloudWatchLogsConfiguration = CloudWatchLogsConfiguration;
  static DataSources = DataSources;
  static ExperimentReportS3Configuration = ExperimentReportS3Configuration;
  static ExperimentTemplateAction = ExperimentTemplateAction;
  static ExperimentTemplateExperimentOptions = ExperimentTemplateExperimentOptions;
  static ExperimentTemplateExperimentReportConfiguration = ExperimentTemplateExperimentReportConfiguration;
  static ExperimentTemplateLogConfiguration = ExperimentTemplateLogConfiguration;
  static ExperimentTemplateStopCondition = ExperimentTemplateStopCondition;
  static ExperimentTemplateTarget = ExperimentTemplateTarget;
  static ExperimentTemplateTargetFilter = ExperimentTemplateTargetFilter;
  static Outputs = Outputs;
  static S3Configuration = S3Configuration;
  constructor(properties: ExperimentTemplateProperties) {
    super('AWS::FIS::ExperimentTemplate', properties);
  }
}
