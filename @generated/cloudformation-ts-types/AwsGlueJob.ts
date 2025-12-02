// This file is auto-generated. Do not edit manually.
// Source: aws-glue-job.json

/** Resource Type definition for AWS::Glue::Job */
export type AwsGlueJob = {
  /** Specifies the connections used by a job */
  Connections?: {
    /**
     * A list of connections used by the job.
     * @uniqueItems false
     */
    Connections?: string[];
  };
  /** The maximum number of times to retry this job after a JobRun fails */
  MaxRetries?: number;
  /** A description of the job. */
  Description?: string;
  /**
   * The maximum time that a job run can consume resources before it is terminated and enters TIMEOUT
   * status.
   */
  Timeout?: number;
  /** The number of capacity units that are allocated to this job. */
  AllocatedCapacity?: number;
  /** The name you assign to the job definition */
  Name?: string;
  /** The name or Amazon Resource Name (ARN) of the IAM role associated with this job. */
  Role: string;
  /** The default arguments for this job, specified as name-value pairs. */
  DefaultArguments?: Record<string, unknown>;
  /** Specifies configuration properties of a notification. */
  NotificationProperty?: {
    /**
     * It is the number of minutes to wait before sending a job run delay notification after a job run
     * starts
     */
    NotifyDelayAfter?: number;
  };
  /**
   * TThe type of predefined worker that is allocated when a job runs.
   * @enum ["Standard","G.1X","G.2X","G.025X","G.4X","G.8X","Z.2X","G.12X","G.16X","R.1X","R.2X","R.4X","R.8X"]
   */
  WorkerType?: "Standard" | "G.1X" | "G.2X" | "G.025X" | "G.4X" | "G.8X" | "Z.2X" | "G.12X" | "G.16X" | "R.1X" | "R.2X" | "R.4X" | "R.8X";
  /** Indicates whether the job is run with a standard or flexible execution class. */
  ExecutionClass?: string;
  /** This field is reserved for future use. */
  LogUri?: string;
  /** The code that executes a job. */
  Command: {
    /** The name of the job command */
    Name?: string;
    /** The Python version being used to execute a Python shell job. */
    PythonVersion?: string;
    /**
     * Runtime is used to specify the versions of Ray, Python and additional libraries available in your
     * environment
     */
    Runtime?: string;
    /** Specifies the Amazon Simple Storage Service (Amazon S3) path to a script that executes a job */
    ScriptLocation?: string;
  };
  /** Glue version determines the versions of Apache Spark and Python that AWS Glue supports. */
  GlueVersion?: string;
  /** The maximum number of concurrent runs that are allowed for this job. */
  ExecutionProperty?: {
    /** The maximum number of concurrent runs allowed for the job. */
    MaxConcurrentRuns?: number;
  };
  /** The name of the SecurityConfiguration structure to be used with this job. */
  SecurityConfiguration?: string;
  /** The number of workers of a defined workerType that are allocated when a job runs. */
  NumberOfWorkers?: number;
  /** The tags to use with this job. */
  Tags?: Record<string, unknown>;
  /** The number of AWS Glue data processing units (DPUs) that can be allocated when this job runs. */
  MaxCapacity?: number;
  /** Non-overridable arguments for this job, specified as name-value pairs. */
  NonOverridableArguments?: Record<string, unknown>;
  /** Property description not available. */
  MaintenanceWindow?: string;
  /** Property description not available. */
  JobMode?: string;
  /** Property description not available. */
  JobRunQueuingEnabled?: boolean;
};
