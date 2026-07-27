// This file is auto-generated. Do not edit manually.
// Source: aws-batch-schedulingpolicy.json

/** Resource Type definition for AWS::Batch::SchedulingPolicy */
export type AwsBatchSchedulingpolicy = {
  /**
   * Name of Scheduling Policy.
   * @pattern 
   */
  Name?: string;
  Arn?: string;
  FairsharePolicy?: {
    /**
     * @minimum 0
     * @maximum 604800
     */
    ShareDecaySeconds?: number;
    /**
     * @minimum 0
     * @maximum 99
     */
    ComputeReservation?: number;
    /** List of Share Attributes */
    ShareDistribution?: {
      ShareIdentifier?: string;
      /**
       * @minimum 0
       * @maximum 1000
       */
      WeightFactor?: number;
    }[];
  };
  /** A key-value pair to associate with a resource. */
  Tags?: Record<string, string>;
};
