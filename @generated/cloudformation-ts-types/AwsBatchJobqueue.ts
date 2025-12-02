// This file is auto-generated. Do not edit manually.
// Source: aws-batch-jobqueue.json

/** Resource Type definition for AWS::Batch::JobQueue */
export type AwsBatchJobqueue = {
  /**
   * @minLength 1
   * @maxLength 128
   */
  JobQueueName?: string;
  JobQueueArn?: string;
  JobQueueType?: string;
  /** @uniqueItems false */
  ComputeEnvironmentOrder?: {
    ComputeEnvironment: string;
    Order: number;
  }[];
  /** @uniqueItems false */
  ServiceEnvironmentOrder?: {
    ServiceEnvironment: string;
    Order: number;
  }[];
  /** @uniqueItems false */
  JobStateTimeLimitActions?: ({
    /** @enum ["CANCEL","TERMINATE"] */
    Action: "CANCEL" | "TERMINATE";
    /**
     * @minimum 600
     * @maximum 86400
     */
    MaxTimeSeconds: number;
    Reason: string;
    /** @enum ["RUNNABLE"] */
    State: "RUNNABLE";
  })[];
  /**
   * @minimum 0
   * @maximum 1000
   */
  Priority: number;
  /** @enum ["DISABLED","ENABLED"] */
  State?: "DISABLED" | "ENABLED";
  SchedulingPolicyArn?: string;
  /** A key-value pair to associate with a resource. */
  Tags?: Record<string, string>;
};
