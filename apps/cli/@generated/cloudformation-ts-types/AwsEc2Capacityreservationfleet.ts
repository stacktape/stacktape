// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-capacityreservationfleet.json

/** Resource Type definition for AWS::EC2::CapacityReservationFleet */
export type AwsEc2Capacityreservationfleet = {
  AllocationStrategy?: string;
  /** @uniqueItems false */
  TagSpecifications?: {
    ResourceType?: string;
    /** @uniqueItems false */
    Tags?: {
      Value: string;
      Key: string;
    }[];
  }[];
  /**
   * @maxItems 50
   * @uniqueItems true
   */
  InstanceTypeSpecifications?: {
    InstanceType?: string;
    InstancePlatform?: string;
    Weight?: number;
    AvailabilityZone?: string;
    AvailabilityZoneId?: string;
    EbsOptimized?: boolean;
    /**
     * @minimum 0
     * @maximum 999
     */
    Priority?: number;
  }[];
  /**
   * @minimum 1
   * @maximum 25000
   */
  TotalTargetCapacity?: number;
  EndDate?: string;
  /** @enum ["open"] */
  InstanceMatchCriteria?: "open";
  CapacityReservationFleetId?: string;
  /** @enum ["default"] */
  Tenancy?: "default";
  RemoveEndDate?: boolean;
  NoRemoveEndDate?: boolean;
};
