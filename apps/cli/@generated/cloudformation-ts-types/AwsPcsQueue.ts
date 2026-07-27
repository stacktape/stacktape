// This file is auto-generated. Do not edit manually.
// Source: aws-pcs-queue.json

/** AWS::PCS::Queue resource creates an AWS PCS queue. */
export type AwsPcsQueue = {
  /**
   * The unique Amazon Resource Name (ARN) of the queue.
   * @pattern ^(.*?)
   */
  Arn?: string;
  /** The ID of the cluster of the queue. */
  ClusterId: string;
  /**
   * The list of compute node group configurations associated with the queue. Queues assign jobs to
   * associated compute node groups.
   */
  ComputeNodeGroupConfigurations?: {
    /** The compute node group ID for the compute node group configuration. */
    ComputeNodeGroupId?: string;
  }[];
  /** The list of errors that occurred during queue provisioning. */
  ErrorInfo?: {
    /** The short-form error code. */
    Code?: string;
    /** The detailed error information. */
    Message?: string;
  }[];
  /** The generated unique ID of the queue. */
  Id?: string;
  /** The name that identifies the queue. */
  Name?: string;
  /** The Slurm configuration for the queue. */
  SlurmConfiguration?: {
    /** Custom Slurm parameters that directly map to Slurm configuration settings. */
    SlurmCustomSettings?: {
      /** AWS PCS supports configuration of the Slurm parameters for queues:. */
      ParameterName: string;
      /** The value for the configured Slurm setting. */
      ParameterValue: string;
    }[];
  };
  /**
   * The provisioning status of the queue. The provisioning status doesn't indicate the overall health
   * of the queue.
   * @enum ["CREATING","ACTIVE","UPDATING","DELETING","CREATE_FAILED","DELETE_FAILED","UPDATE_FAILED"]
   */
  Status?: "CREATING" | "ACTIVE" | "UPDATING" | "DELETING" | "CREATE_FAILED" | "DELETE_FAILED" | "UPDATE_FAILED";
  /**
   * 1 or more tags added to the resource. Each tag consists of a tag key and tag value. The tag value
   * is optional and can be an empty string.
   */
  Tags?: Record<string, string>;
};
