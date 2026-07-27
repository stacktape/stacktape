// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-ec2fleet.json

/** Resource Type definition for AWS::EC2::EC2Fleet */
export type AwsEc2Ec2fleet = {
  Context?: string;
  TargetCapacitySpecification: {
    /** @enum ["on-demand","spot"] */
    DefaultTargetCapacityType?: "on-demand" | "spot";
    TotalTargetCapacity: number;
    OnDemandTargetCapacity?: number;
    SpotTargetCapacity?: number;
    /** @enum ["vcpu","memory-mib","units"] */
    TargetCapacityUnitType?: "vcpu" | "memory-mib" | "units";
  };
  OnDemandOptions?: {
    SingleAvailabilityZone?: boolean;
    AllocationStrategy?: string;
    SingleInstanceType?: boolean;
    MinTargetCapacity?: number;
    MaxTotalPrice?: string;
    CapacityReservationOptions?: {
      /** @enum ["use-capacity-reservations-first"] */
      UsageStrategy?: "use-capacity-reservations-first";
    };
  };
  /** @enum ["termination","no-termination"] */
  ExcessCapacityTerminationPolicy?: "termination" | "no-termination";
  /** @uniqueItems false */
  TagSpecifications?: ({
    /** @enum ["client-vpn-endpoint","customer-gateway","dedicated-host","dhcp-options","egress-only-internet-gateway","elastic-gpu","elastic-ip","export-image-task","export-instance-task","fleet","fpga-image","host-reservation","image","import-image-task","import-snapshot-task","instance","internet-gateway","key-pair","launch-template","local-gateway-route-table-vpc-association","natgateway","network-acl","network-insights-analysis","network-insights-path","network-interface","placement-group","reserved-instances","route-table","security-group","snapshot","spot-fleet-request","spot-instances-request","subnet","traffic-mirror-filter","traffic-mirror-session","traffic-mirror-target","transit-gateway","transit-gateway-attachment","transit-gateway-connect-peer","transit-gateway-multicast-domain","transit-gateway-route-table","volume","vpc","vpc-flow-log","vpc-peering-connection","vpn-connection","vpn-gateway"] */
    ResourceType?: "client-vpn-endpoint" | "customer-gateway" | "dedicated-host" | "dhcp-options" | "egress-only-internet-gateway" | "elastic-gpu" | "elastic-ip" | "export-image-task" | "export-instance-task" | "fleet" | "fpga-image" | "host-reservation" | "image" | "import-image-task" | "import-snapshot-task" | "instance" | "internet-gateway" | "key-pair" | "launch-template" | "local-gateway-route-table-vpc-association" | "natgateway" | "network-acl" | "network-insights-analysis" | "network-insights-path" | "network-interface" | "placement-group" | "reserved-instances" | "route-table" | "security-group" | "snapshot" | "spot-fleet-request" | "spot-instances-request" | "subnet" | "traffic-mirror-filter" | "traffic-mirror-session" | "traffic-mirror-target" | "transit-gateway" | "transit-gateway-attachment" | "transit-gateway-connect-peer" | "transit-gateway-multicast-domain" | "transit-gateway-route-table" | "volume" | "vpc" | "vpc-flow-log" | "vpc-peering-connection" | "vpn-connection" | "vpn-gateway";
    /** @uniqueItems false */
    Tags?: {
      Value: string;
      Key: string;
    }[];
  })[];
  SpotOptions?: {
    SingleAvailabilityZone?: boolean;
    /** @enum ["lowest-price","lowestPrice","diversified","capacityOptimized","capacity-optimized","capacityOptimizedPrioritized","capacity-optimized-prioritized","priceCapacityOptimized","price-capacity-optimized"] */
    AllocationStrategy?: "lowest-price" | "lowestPrice" | "diversified" | "capacityOptimized" | "capacity-optimized" | "capacityOptimizedPrioritized" | "capacity-optimized-prioritized" | "priceCapacityOptimized" | "price-capacity-optimized";
    SingleInstanceType?: boolean;
    MinTargetCapacity?: number;
    MaxTotalPrice?: string;
    MaintenanceStrategies?: {
      CapacityRebalance?: {
        TerminationDelay?: number;
        /** @enum ["launch","launch-before-terminate"] */
        ReplacementStrategy?: "launch" | "launch-before-terminate";
      };
    };
    /** @enum ["hibernate","stop","terminate"] */
    InstanceInterruptionBehavior?: "hibernate" | "stop" | "terminate";
    InstancePoolsToUseCount?: number;
  };
  /**
   * @maxItems 50
   * @uniqueItems false
   */
  LaunchTemplateConfigs: ({
    LaunchTemplateSpecification?: {
      /**
       * @minLength 3
       * @maxLength 128
       * @pattern [a-zA-Z0-9\(\)\.\-/_]+
       */
      LaunchTemplateName?: string;
      Version: string;
      LaunchTemplateId?: string;
    };
    /** @uniqueItems false */
    Overrides?: ({
      WeightedCapacity?: number;
      Placement?: {
        GroupName?: string;
        Tenancy?: string;
        SpreadDomain?: string;
        PartitionNumber?: number;
        AvailabilityZone?: string;
        Affinity?: string;
        HostId?: string;
        HostResourceGroupArn?: string;
      };
      Priority?: number;
      /** @uniqueItems true */
      BlockDeviceMappings?: ({
        Ebs?: {
          SnapshotId?: string;
          /** @enum ["gp2","gp3","io1","io2","sc1","st1","standard"] */
          VolumeType?: "gp2" | "gp3" | "io1" | "io2" | "sc1" | "st1" | "standard";
          KmsKeyId?: string;
          Encrypted?: boolean;
          Iops?: number;
          VolumeSize?: number;
          DeleteOnTermination?: boolean;
        };
        NoDevice?: string;
        VirtualName?: string;
        DeviceName?: string;
      })[];
      AvailabilityZone?: string;
      SubnetId?: string;
      InstanceRequirements?: {
        /** @uniqueItems false */
        InstanceGenerations?: ("current" | "previous")[];
        MemoryGiBPerVCpu?: {
          Min?: number;
          Max?: number;
        };
        /** @uniqueItems false */
        AcceleratorTypes?: ("gpu" | "fpga" | "inference" | "media")[];
        VCpuCount?: {
          Min?: number;
          Max?: number;
        };
        /** @uniqueItems false */
        AcceleratorManufacturers?: ("amazon-web-services" | "amd" | "habana" | "nvidia" | "xilinx")[];
        /** @enum ["included","required","excluded"] */
        LocalStorage?: "included" | "required" | "excluded";
        /** @uniqueItems false */
        CpuManufacturers?: ("intel" | "amd" | "amazon-web-services" | "apple")[];
        /** @enum ["included","required","excluded"] */
        BareMetal?: "included" | "required" | "excluded";
        RequireHibernateSupport?: boolean;
        MaxSpotPriceAsPercentageOfOptimalOnDemandPrice?: number;
        OnDemandMaxPricePercentageOverLowestPrice?: number;
        MemoryMiB?: {
          Min?: number;
          Max?: number;
        };
        /** @uniqueItems false */
        LocalStorageTypes?: ("hdd" | "ssd")[];
        NetworkInterfaceCount?: {
          Min?: number;
          Max?: number;
        };
        /** @uniqueItems false */
        ExcludedInstanceTypes?: string[];
        /** @uniqueItems false */
        AllowedInstanceTypes?: string[];
        NetworkBandwidthGbps?: {
          Min?: number;
          Max?: number;
        };
        AcceleratorCount?: {
          Min?: number;
          Max?: number;
        };
        BaselinePerformanceFactors?: {
          Cpu?: {
            /** @uniqueItems false */
            References?: {
              InstanceFamily?: string;
            }[];
          };
        };
        SpotMaxPricePercentageOverLowestPrice?: number;
        BaselineEbsBandwidthMbps?: {
          Min?: number;
          Max?: number;
        };
        /** @uniqueItems false */
        AcceleratorNames?: ("a10g" | "a100" | "h100" | "inferentia" | "k520" | "k80" | "m60" | "radeon-pro-v520" | "t4" | "t4g" | "vu9p" | "v100" | "l40s" | "l4" | "gaudi-hl-205" | "inferentia2" | "trainium" | "trainium2" | "u30")[];
        AcceleratorTotalMemoryMiB?: {
          Min?: number;
          Max?: number;
        };
        /** @enum ["included","required","excluded"] */
        BurstablePerformance?: "included" | "required" | "excluded";
        TotalLocalStorageGB?: {
          Min?: number;
          Max?: number;
        };
      };
      InstanceType?: string;
      MaxPrice?: string;
    })[];
  })[];
  TerminateInstancesWithExpiration?: boolean;
  ValidUntil?: string;
  /** @enum ["maintain","request","instant"] */
  Type?: "maintain" | "request" | "instant";
  FleetId?: string;
  ValidFrom?: string;
  ReplaceUnhealthyInstances?: boolean;
};
