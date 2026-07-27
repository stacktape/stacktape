// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-spotfleet.json

/** Resource Type definition for AWS::EC2::SpotFleet */
export type AwsEc2Spotfleet = {
  SpotFleetRequestConfigData: {
    Context?: string;
    SpotMaxTotalPrice?: string;
    /** @enum ["Default","NoTermination","default","noTermination"] */
    ExcessCapacityTerminationPolicy?: "Default" | "NoTermination" | "default" | "noTermination";
    /** @uniqueItems true */
    TagSpecifications?: ({
      /** @enum ["client-vpn-endpoint","customer-gateway","dedicated-host","dhcp-options","egress-only-internet-gateway","elastic-gpu","elastic-ip","export-image-task","export-instance-task","fleet","fpga-image","host-reservation","image","import-image-task","import-snapshot-task","instance","internet-gateway","key-pair","launch-template","local-gateway-route-table-vpc-association","natgateway","network-acl","network-insights-analysis","network-insights-path","network-interface","placement-group","reserved-instances","route-table","security-group","snapshot","spot-fleet-request","spot-instances-request","subnet","traffic-mirror-filter","traffic-mirror-session","traffic-mirror-target","transit-gateway","transit-gateway-attachment","transit-gateway-connect-peer","transit-gateway-multicast-domain","transit-gateway-route-table","volume","vpc","vpc-flow-log","vpc-peering-connection","vpn-connection","vpn-gateway"] */
      ResourceType?: "client-vpn-endpoint" | "customer-gateway" | "dedicated-host" | "dhcp-options" | "egress-only-internet-gateway" | "elastic-gpu" | "elastic-ip" | "export-image-task" | "export-instance-task" | "fleet" | "fpga-image" | "host-reservation" | "image" | "import-image-task" | "import-snapshot-task" | "instance" | "internet-gateway" | "key-pair" | "launch-template" | "local-gateway-route-table-vpc-association" | "natgateway" | "network-acl" | "network-insights-analysis" | "network-insights-path" | "network-interface" | "placement-group" | "reserved-instances" | "route-table" | "security-group" | "snapshot" | "spot-fleet-request" | "spot-instances-request" | "subnet" | "traffic-mirror-filter" | "traffic-mirror-session" | "traffic-mirror-target" | "transit-gateway" | "transit-gateway-attachment" | "transit-gateway-connect-peer" | "transit-gateway-multicast-domain" | "transit-gateway-route-table" | "volume" | "vpc" | "vpc-flow-log" | "vpc-peering-connection" | "vpn-connection" | "vpn-gateway";
      /** @uniqueItems false */
      Tags?: {
        Value: string;
        Key: string;
      }[];
    })[];
    InstancePoolsToUseCount?: number;
    /** @uniqueItems true */
    LaunchTemplateConfigs?: ({
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
      /** @uniqueItems true */
      Overrides?: ({
        SpotPrice?: string;
        WeightedCapacity?: number;
        Priority?: number;
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
      })[];
    })[];
    /** @enum ["vcpu","memory-mib","units"] */
    TargetCapacityUnitType?: "vcpu" | "memory-mib" | "units";
    IamFleetRole: string;
    SpotMaintenanceStrategies?: {
      CapacityRebalance?: {
        TerminationDelay?: number;
        /** @enum ["launch","launch-before-terminate"] */
        ReplacementStrategy?: "launch" | "launch-before-terminate";
      };
    };
    TerminateInstancesWithExpiration?: boolean;
    ValidUntil?: string;
    OnDemandMaxTotalPrice?: string;
    OnDemandAllocationStrategy?: string;
    SpotPrice?: string;
    /** @enum ["capacityOptimized","capacityOptimizedPrioritized","diversified","lowestPrice","priceCapacityOptimized"] */
    AllocationStrategy?: "capacityOptimized" | "capacityOptimizedPrioritized" | "diversified" | "lowestPrice" | "priceCapacityOptimized";
    OnDemandTargetCapacity?: number;
    /** @enum ["maintain","request"] */
    Type?: "maintain" | "request";
    /** @uniqueItems true */
    LaunchSpecifications?: ({
      /** @uniqueItems true */
      SecurityGroups?: {
        GroupId: string;
      }[];
      /** @uniqueItems true */
      TagSpecifications?: ({
        /** @enum ["client-vpn-endpoint","customer-gateway","dedicated-host","dhcp-options","egress-only-internet-gateway","elastic-gpu","elastic-ip","export-image-task","export-instance-task","fleet","fpga-image","host-reservation","image","import-image-task","import-snapshot-task","instance","internet-gateway","key-pair","launch-template","local-gateway-route-table-vpc-association","natgateway","network-acl","network-insights-analysis","network-insights-path","network-interface","placement-group","reserved-instances","route-table","security-group","snapshot","spot-fleet-request","spot-instances-request","subnet","traffic-mirror-filter","traffic-mirror-session","traffic-mirror-target","transit-gateway","transit-gateway-attachment","transit-gateway-connect-peer","transit-gateway-multicast-domain","transit-gateway-route-table","volume","vpc","vpc-flow-log","vpc-peering-connection","vpn-connection","vpn-gateway"] */
        ResourceType?: "client-vpn-endpoint" | "customer-gateway" | "dedicated-host" | "dhcp-options" | "egress-only-internet-gateway" | "elastic-gpu" | "elastic-ip" | "export-image-task" | "export-instance-task" | "fleet" | "fpga-image" | "host-reservation" | "image" | "import-image-task" | "import-snapshot-task" | "instance" | "internet-gateway" | "key-pair" | "launch-template" | "local-gateway-route-table-vpc-association" | "natgateway" | "network-acl" | "network-insights-analysis" | "network-insights-path" | "network-interface" | "placement-group" | "reserved-instances" | "route-table" | "security-group" | "snapshot" | "spot-fleet-request" | "spot-instances-request" | "subnet" | "traffic-mirror-filter" | "traffic-mirror-session" | "traffic-mirror-target" | "transit-gateway" | "transit-gateway-attachment" | "transit-gateway-connect-peer" | "transit-gateway-multicast-domain" | "transit-gateway-route-table" | "volume" | "vpc" | "vpc-flow-log" | "vpc-peering-connection" | "vpn-connection" | "vpn-gateway";
        /** @uniqueItems false */
        Tags?: {
          Value: string;
          Key: string;
        }[];
      })[];
      UserData?: string;
      /** @uniqueItems true */
      BlockDeviceMappings?: ({
        Ebs?: {
          SnapshotId?: string;
          /** @enum ["gp2","gp3","io1","io2","sc1","st1","standard"] */
          VolumeType?: "gp2" | "gp3" | "io1" | "io2" | "sc1" | "st1" | "standard";
          Encrypted?: boolean;
          Iops?: number;
          VolumeSize?: number;
          DeleteOnTermination?: boolean;
        };
        NoDevice?: string;
        VirtualName?: string;
        DeviceName: string;
      })[];
      IamInstanceProfile?: {
        Arn?: string;
      };
      KernelId?: string;
      SubnetId?: string;
      /** @default false */
      EbsOptimized?: boolean;
      KeyName?: string;
      RamdiskId?: string;
      SpotPrice?: string;
      WeightedCapacity?: number;
      Placement?: {
        GroupName?: string;
        /** @enum ["dedicated","default","host"] */
        Tenancy?: "dedicated" | "default" | "host";
        AvailabilityZone?: string;
      };
      /** @uniqueItems true */
      NetworkInterfaces?: {
        Description?: string;
        /** @uniqueItems true */
        PrivateIpAddresses?: {
          PrivateIpAddress: string;
          Primary?: boolean;
        }[];
        SecondaryPrivateIpAddressCount?: number;
        DeviceIndex?: number;
        /** @uniqueItems true */
        Groups?: string[];
        Ipv6AddressCount?: number;
        /** @uniqueItems true */
        Ipv6Addresses?: {
          Ipv6Address: string;
        }[];
        SubnetId?: string;
        AssociatePublicIpAddress?: boolean;
        NetworkInterfaceId?: string;
        DeleteOnTermination?: boolean;
      }[];
      ImageId: string;
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
      Monitoring?: {
        /** @default false */
        Enabled?: boolean;
      };
    })[];
    /** @enum ["hibernate","stop","terminate"] */
    InstanceInterruptionBehavior?: "hibernate" | "stop" | "terminate";
    LoadBalancersConfig?: {
      ClassicLoadBalancersConfig?: {
        /** @uniqueItems true */
        ClassicLoadBalancers: {
          Name: string;
        }[];
      };
      TargetGroupsConfig?: {
        /** @uniqueItems true */
        TargetGroups: {
          Arn: string;
        }[];
      };
    };
    ValidFrom?: string;
    ReplaceUnhealthyInstances?: boolean;
    TargetCapacity: number;
  };
  Id?: string;
};
