// This file is auto-generated. Do not edit manually.
// Source: aws-mwaa-environment.json

/** Resource schema for AWS::MWAA::Environment */
export type AwsMwaaEnvironment = {
  Name: string;
  Arn?: string;
  WebserverUrl?: string;
  ExecutionRoleArn?: string;
  KmsKey?: string;
  AirflowVersion?: string;
  SourceBucketArn?: string;
  DagS3Path?: string;
  PluginsS3Path?: string;
  PluginsS3ObjectVersion?: string;
  RequirementsS3Path?: string;
  RequirementsS3ObjectVersion?: string;
  StartupScriptS3Path?: string;
  StartupScriptS3ObjectVersion?: string;
  /**
   * Key/value pairs representing Airflow configuration variables.
   * Keys are prefixed by their section:
   * [core]
   * dags_folder={AIRFLOW_HOME}/dags
   * Would be represented as
   * "core.dags_folder": "{AIRFLOW_HOME}/dags"
   */
  AirflowConfigurationOptions?: Record<string, unknown>;
  EnvironmentClass?: string;
  MaxWorkers?: number;
  MinWorkers?: number;
  MaxWebservers?: number;
  MinWebservers?: number;
  Schedulers?: number;
  NetworkConfiguration?: {
    /**
     * A list of subnets to use for the environment. These must be private subnets, in the same VPC, in
     * two different availability zones.
     * @minItems 2
     * @maxItems 2
     */
    SubnetIds?: string[];
    /**
     * A list of security groups to use for the environment.
     * @minItems 1
     * @maxItems 5
     */
    SecurityGroupIds?: string[];
  };
  LoggingConfiguration?: {
    DagProcessingLogs?: {
      Enabled?: boolean;
      LogLevel?: "CRITICAL" | "ERROR" | "WARNING" | "INFO" | "DEBUG";
      CloudWatchLogGroupArn?: string;
    };
    SchedulerLogs?: {
      Enabled?: boolean;
      LogLevel?: "CRITICAL" | "ERROR" | "WARNING" | "INFO" | "DEBUG";
      CloudWatchLogGroupArn?: string;
    };
    WebserverLogs?: {
      Enabled?: boolean;
      LogLevel?: "CRITICAL" | "ERROR" | "WARNING" | "INFO" | "DEBUG";
      CloudWatchLogGroupArn?: string;
    };
    WorkerLogs?: {
      Enabled?: boolean;
      LogLevel?: "CRITICAL" | "ERROR" | "WARNING" | "INFO" | "DEBUG";
      CloudWatchLogGroupArn?: string;
    };
    TaskLogs?: {
      Enabled?: boolean;
      LogLevel?: "CRITICAL" | "ERROR" | "WARNING" | "INFO" | "DEBUG";
      CloudWatchLogGroupArn?: string;
    };
  };
  WeeklyMaintenanceWindowStart?: string;
  /** A map of tags for the environment. */
  Tags?: Record<string, unknown>;
  WebserverAccessMode?: "PRIVATE_ONLY" | "PUBLIC_ONLY";
  EndpointManagement?: "CUSTOMER" | "SERVICE";
  CeleryExecutorQueue?: string;
  DatabaseVpcEndpointService?: string;
  WebserverVpcEndpointService?: string;
  WorkerReplacementStrategy?: "FORCED" | "GRACEFUL";
};
