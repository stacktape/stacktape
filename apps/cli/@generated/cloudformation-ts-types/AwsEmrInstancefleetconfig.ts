// This file is auto-generated. Do not edit manually.
// Source: aws-emr-instancefleetconfig.json

/** Resource Type definition for AWS::EMR::InstanceFleetConfig */
export type AwsEmrInstancefleetconfig = {
  InstanceFleetType: string;
  TargetOnDemandCapacity?: number;
  ClusterId: string;
  TargetSpotCapacity?: number;
  LaunchSpecifications?: {
    SpotSpecification?: {
      AllocationStrategy?: string;
      TimeoutDurationMinutes: number;
      TimeoutAction: string;
      BlockDurationMinutes?: number;
    };
    OnDemandSpecification?: {
      CapacityReservationOptions?: {
        UsageStrategy?: string;
        CapacityReservationResourceGroupArn?: string;
        CapacityReservationPreference?: string;
      };
      AllocationStrategy: string;
    };
  };
  ResizeSpecifications?: {
    OnDemandResizeSpecification?: {
      CapacityReservationOptions?: {
        UsageStrategy?: string;
        CapacityReservationResourceGroupArn?: string;
        CapacityReservationPreference?: string;
      };
      AllocationStrategy?: string;
      TimeoutDurationMinutes?: number;
    };
    SpotResizeSpecification?: {
      AllocationStrategy?: string;
      TimeoutDurationMinutes?: number;
    };
  };
  Id?: string;
  /** @uniqueItems true */
  InstanceTypeConfigs?: {
    BidPrice?: string;
    WeightedCapacity?: number;
    EbsConfiguration?: {
      /** @uniqueItems true */
      EbsBlockDeviceConfigs?: {
        VolumeSpecification: {
          SizeInGB: number;
          Throughput?: number;
          VolumeType: string;
          Iops?: number;
        };
        VolumesPerInstance?: number;
      }[];
      EbsOptimized?: boolean;
    };
    Priority?: number;
    BidPriceAsPercentageOfOnDemandPrice?: number;
    CustomAmiId?: string;
    /** @uniqueItems true */
    Configurations?: {
      ConfigurationProperties?: Record<string, string>;
      /** @uniqueItems true */
      Configurations?: unknown[];
      Classification?: string;
    }[];
    InstanceType: string;
  }[];
  Name?: string;
};
