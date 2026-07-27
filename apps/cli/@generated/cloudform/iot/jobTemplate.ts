import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AbortConfig {
  CriteriaList!: List<AbortCriteria>;
  constructor(properties: AbortConfig) {
    Object.assign(this, properties);
  }
}

export class AbortCriteria {
  Action!: Value<string>;
  FailureType!: Value<string>;
  ThresholdPercentage!: Value<number>;
  MinNumberOfExecutedThings!: Value<number>;
  constructor(properties: AbortCriteria) {
    Object.assign(this, properties);
  }
}

export class ExponentialRolloutRate {
  RateIncreaseCriteria!: RateIncreaseCriteria;
  BaseRatePerMinute!: Value<number>;
  IncrementFactor!: Value<number>;
  constructor(properties: ExponentialRolloutRate) {
    Object.assign(this, properties);
  }
}

export class JobExecutionsRetryConfig {
  RetryCriteriaList?: List<RetryCriteria>;
  constructor(properties: JobExecutionsRetryConfig) {
    Object.assign(this, properties);
  }
}

export class JobExecutionsRolloutConfig {
  MaximumPerMinute?: Value<number>;
  ExponentialRolloutRate?: ExponentialRolloutRate;
  constructor(properties: JobExecutionsRolloutConfig) {
    Object.assign(this, properties);
  }
}

export class MaintenanceWindow {
  DurationInMinutes?: Value<number>;
  StartTime?: Value<string>;
  constructor(properties: MaintenanceWindow) {
    Object.assign(this, properties);
  }
}

export class PresignedUrlConfig {
  ExpiresInSec?: Value<number>;
  RoleArn!: Value<string>;
  constructor(properties: PresignedUrlConfig) {
    Object.assign(this, properties);
  }
}

export class RateIncreaseCriteria {
  NumberOfSucceededThings?: Value<number>;
  NumberOfNotifiedThings?: Value<number>;
  constructor(properties: RateIncreaseCriteria) {
    Object.assign(this, properties);
  }
}

export class RetryCriteria {
  FailureType?: Value<string>;
  NumberOfRetries?: Value<number>;
  constructor(properties: RetryCriteria) {
    Object.assign(this, properties);
  }
}

export class TimeoutConfig {
  InProgressTimeoutInMinutes!: Value<number>;
  constructor(properties: TimeoutConfig) {
    Object.assign(this, properties);
  }
}
export interface JobTemplateProperties {
  TimeoutConfig?: TimeoutConfig;
  Description: Value<string>;
  JobExecutionsRetryConfig?: JobExecutionsRetryConfig;
  AbortConfig?: AbortConfig;
  JobTemplateId: Value<string>;
  Document?: Value<string>;
  DestinationPackageVersions?: List<Value<string>>;
  JobArn?: Value<string>;
  JobExecutionsRolloutConfig?: JobExecutionsRolloutConfig;
  DocumentSource?: Value<string>;
  MaintenanceWindows?: List<MaintenanceWindow>;
  PresignedUrlConfig?: PresignedUrlConfig;
  Tags?: List<ResourceTag>;
}
export default class JobTemplate extends ResourceBase<JobTemplateProperties> {
  static AbortConfig = AbortConfig;
  static AbortCriteria = AbortCriteria;
  static ExponentialRolloutRate = ExponentialRolloutRate;
  static JobExecutionsRetryConfig = JobExecutionsRetryConfig;
  static JobExecutionsRolloutConfig = JobExecutionsRolloutConfig;
  static MaintenanceWindow = MaintenanceWindow;
  static PresignedUrlConfig = PresignedUrlConfig;
  static RateIncreaseCriteria = RateIncreaseCriteria;
  static RetryCriteria = RetryCriteria;
  static TimeoutConfig = TimeoutConfig;
  constructor(properties: JobTemplateProperties) {
    super('AWS::IoT::JobTemplate', properties);
  }
}
