// This file is auto-generated. Do not edit manually.
// Source: aws-emr-cluster.json

/** Resource Type definition for AWS::EMR::Cluster */
export type AwsEmrCluster = {
  /** @uniqueItems true */
  Steps?: {
    HadoopJarStep: {
      /** @uniqueItems true */
      Args?: string[];
      MainClass?: string;
      Jar: string;
      /** @uniqueItems true */
      StepProperties?: {
        Value?: string;
        Key?: string;
      }[];
    };
    ActionOnFailure?: string;
    Name: string;
  }[];
  /** @uniqueItems true */
  PlacementGroupConfigs?: {
    InstanceRole: string;
    PlacementStrategy?: string;
  }[];
  StepConcurrencyLevel?: number;
  EbsRootVolumeSize?: number;
  OSReleaseLabel?: string;
  Name: string;
  ServiceRole: string;
  LogUri?: string;
  /** @uniqueItems true */
  BootstrapActions?: {
    ScriptBootstrapAction: {
      Path: string;
      /** @uniqueItems true */
      Args?: string[];
    };
    Name: string;
  }[];
  MasterPublicDNS?: string;
  /** @uniqueItems true */
  Configurations?: {
    ConfigurationProperties?: Record<string, string>;
    /** @uniqueItems true */
    Configurations?: unknown[];
    Classification?: string;
  }[];
  ReleaseLabel?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  ManagedScalingPolicy?: {
    UtilizationPerformanceIndex?: number;
    ScalingStrategy?: string;
    ComputeLimits?: {
      MaximumOnDemandCapacityUnits?: number;
      MaximumCapacityUnits: number;
      MaximumCoreCapacityUnits?: number;
      MinimumCapacityUnits: number;
      UnitType: string;
    };
  };
  LogEncryptionKmsKeyId?: string;
  AdditionalInfo?: Record<string, unknown>;
  AutoTerminationPolicy?: {
    IdleTimeout?: number;
  };
  KerberosAttributes?: {
    KdcAdminPassword: string;
    Realm: string;
    ADDomainJoinPassword?: string;
    ADDomainJoinUser?: string;
    CrossRealmTrustPrincipalPassword?: string;
  };
  /** @uniqueItems true */
  Applications?: {
    AdditionalInfo?: Record<string, string>;
    /** @uniqueItems true */
    Args?: string[];
    Version?: string;
    Name?: string;
  }[];
  AutoScalingRole?: string;
  CustomAmiId?: string;
  EbsRootVolumeIops?: number;
  Instances: {
    MasterInstanceFleet?: {
      TargetOnDemandCapacity?: number;
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
    /** @uniqueItems true */
    AdditionalSlaveSecurityGroups?: string[];
    CoreInstanceFleet?: {
      TargetOnDemandCapacity?: number;
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
    CoreInstanceGroup?: {
      AutoScalingPolicy?: {
        /** @uniqueItems true */
        Rules: {
          Action: {
            Market?: string;
            SimpleScalingPolicyConfiguration: {
              ScalingAdjustment: number;
              CoolDown?: number;
              AdjustmentType?: string;
            };
          };
          Description?: string;
          Trigger: {
            CloudWatchAlarmDefinition: {
              MetricName: string;
              ComparisonOperator: string;
              Statistic?: string;
              /** @uniqueItems true */
              Dimensions?: {
                Value: string;
                Key: string;
              }[];
              Period: number;
              EvaluationPeriods?: number;
              Unit?: string;
              Namespace?: string;
              Threshold: number;
            };
          };
          Name: string;
        }[];
        Constraints: {
          MinCapacity: number;
          MaxCapacity: number;
        };
      };
      BidPrice?: string;
      InstanceCount: number;
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
      CustomAmiId?: string;
      /** @uniqueItems true */
      Configurations?: {
        ConfigurationProperties?: Record<string, string>;
        /** @uniqueItems true */
        Configurations?: unknown[];
        Classification?: string;
      }[];
      InstanceType: string;
      Market?: string;
      Name?: string;
    };
    /** @uniqueItems true */
    Ec2SubnetIds?: string[];
    HadoopVersion?: string;
    TerminationProtected?: boolean;
    UnhealthyNodeReplacement?: boolean;
    KeepJobFlowAliveWhenNoSteps?: boolean;
    Ec2KeyName?: string;
    MasterInstanceGroup?: {
      AutoScalingPolicy?: {
        /** @uniqueItems true */
        Rules: {
          Action: {
            Market?: string;
            SimpleScalingPolicyConfiguration: {
              ScalingAdjustment: number;
              CoolDown?: number;
              AdjustmentType?: string;
            };
          };
          Description?: string;
          Trigger: {
            CloudWatchAlarmDefinition: {
              MetricName: string;
              ComparisonOperator: string;
              Statistic?: string;
              /** @uniqueItems true */
              Dimensions?: {
                Value: string;
                Key: string;
              }[];
              Period: number;
              EvaluationPeriods?: number;
              Unit?: string;
              Namespace?: string;
              Threshold: number;
            };
          };
          Name: string;
        }[];
        Constraints: {
          MinCapacity: number;
          MaxCapacity: number;
        };
      };
      BidPrice?: string;
      InstanceCount: number;
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
      CustomAmiId?: string;
      /** @uniqueItems true */
      Configurations?: {
        ConfigurationProperties?: Record<string, string>;
        /** @uniqueItems true */
        Configurations?: unknown[];
        Classification?: string;
      }[];
      InstanceType: string;
      Market?: string;
      Name?: string;
    };
    Placement?: {
      AvailabilityZone: string;
    };
    /** @uniqueItems true */
    TaskInstanceFleets?: {
      TargetOnDemandCapacity?: number;
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
    }[];
    Ec2SubnetId?: string;
    /** @uniqueItems true */
    TaskInstanceGroups?: {
      AutoScalingPolicy?: {
        /** @uniqueItems true */
        Rules: {
          Action: {
            Market?: string;
            SimpleScalingPolicyConfiguration: {
              ScalingAdjustment: number;
              CoolDown?: number;
              AdjustmentType?: string;
            };
          };
          Description?: string;
          Trigger: {
            CloudWatchAlarmDefinition: {
              MetricName: string;
              ComparisonOperator: string;
              Statistic?: string;
              /** @uniqueItems true */
              Dimensions?: {
                Value: string;
                Key: string;
              }[];
              Period: number;
              EvaluationPeriods?: number;
              Unit?: string;
              Namespace?: string;
              Threshold: number;
            };
          };
          Name: string;
        }[];
        Constraints: {
          MinCapacity: number;
          MaxCapacity: number;
        };
      };
      BidPrice?: string;
      InstanceCount: number;
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
      CustomAmiId?: string;
      /** @uniqueItems true */
      Configurations?: {
        ConfigurationProperties?: Record<string, string>;
        /** @uniqueItems true */
        Configurations?: unknown[];
        Classification?: string;
      }[];
      InstanceType: string;
      Market?: string;
      Name?: string;
    }[];
    ServiceAccessSecurityGroup?: string;
    EmrManagedSlaveSecurityGroup?: string;
    /** @uniqueItems true */
    AdditionalMasterSecurityGroups?: string[];
    EmrManagedMasterSecurityGroup?: string;
  };
  ScaleDownBehavior?: string;
  EbsRootVolumeThroughput?: number;
  JobFlowRole: string;
  VisibleToAllUsers?: boolean;
  SecurityConfiguration?: string;
  Id?: string;
};
