// This file is auto-generated. Do not edit manually.
// Source: aws-ecs-primarytaskset.json

/** A pseudo-resource that manages which of your ECS task sets is primary. */
export type AwsEcsPrimarytaskset = {
  /** The ID or full Amazon Resource Name (ARN) of the task set. */
  TaskSetId: string;
  /**
   * The short name or full Amazon Resource Name (ARN) of the cluster that hosts the service to create
   * the task set in.
   */
  Cluster: string;
  /** The short name or full Amazon Resource Name (ARN) of the service to create the task set in. */
  Service: string;
};
