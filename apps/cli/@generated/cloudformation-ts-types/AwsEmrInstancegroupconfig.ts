// This file is auto-generated. Do not edit manually.
// Source: aws-emr-instancegroupconfig.json

/** Resource Type definition for AWS::EMR::InstanceGroupConfig */
export type AwsEmrInstancegroupconfig = {
  JobFlowId: string;
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
  InstanceRole: string;
  CustomAmiId?: string;
  Id?: string;
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
