// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-capacityreservation.json

/** Resource Type definition for AWS::EC2::CapacityReservation */
export type AwsEc2Capacityreservation = {
  Tenancy?: string;
  EndDateType?: string;
  /** @uniqueItems false */
  TagSpecifications?: {
    ResourceType?: string;
    /** @uniqueItems false */
    Tags?: {
      Value: string;
      Key: string;
    }[];
  }[];
  AvailabilityZone?: string;
  TotalInstanceCount?: number;
  EndDate?: string;
  EbsOptimized?: boolean;
  OutPostArn?: string;
  InstanceCount: number;
  PlacementGroupArn?: string;
  AvailableInstanceCount?: number;
  InstancePlatform: string;
  Id?: string;
  InstanceType: string;
  EphemeralStorage?: boolean;
  InstanceMatchCriteria?: string;
  UnusedReservationBillingOwnerId?: string;
  AvailabilityZoneId?: string;
  StartDate?: string;
  CapacityReservationArn?: string;
  CreateDate?: string;
  State?: string;
  OwnerId?: string;
  DeliveryPreference?: string;
  CapacityReservationFleetId?: string;
  ReservationType?: string;
  /** @uniqueItems false */
  CapacityAllocationSet?: {
    AllocationType?: string;
    Count?: number;
  }[];
  CommitmentInfo?: {
    CommitmentEndDate?: string;
    CommittedInstanceCount?: number;
  };
};
