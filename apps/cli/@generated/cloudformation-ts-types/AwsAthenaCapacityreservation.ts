// This file is auto-generated. Do not edit manually.
// Source: aws-athena-capacityreservation.json

/** Resource schema for AWS::Athena::CapacityReservation */
export type AwsAthenaCapacityreservation = {
  Arn?: string;
  /**
   * The reservation name.
   * @pattern [a-zA-Z0-9._-]{1,128}
   */
  Name: string;
  /** The status of the reservation. */
  Status?: "PENDING" | "ACTIVE" | "CANCELLING" | "CANCELLED" | "FAILED" | "UPDATE_PENDING";
  /**
   * The number of DPUs to request to be allocated to the reservation.
   * @minimum 1
   */
  TargetDpus: number;
  /**
   * The number of DPUs Athena has provisioned and allocated for the reservation
   * @minimum 0
   */
  AllocatedDpus?: number;
  CapacityAssignmentConfiguration?: {
    CapacityAssignments: {
      WorkgroupNames: string[];
    }[];
  };
  /** The date and time the reservation was created. */
  CreationTime?: string;
  /** The timestamp when the last successful allocated was made */
  LastSuccessfulAllocationTime?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
