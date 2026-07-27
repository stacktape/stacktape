// This file is auto-generated. Do not edit manually.
// Source: aws-autoscaling-warmpool.json

/** Resource schema for AWS::AutoScaling::WarmPool. */
export type AwsAutoscalingWarmpool = {
  AutoScalingGroupName: string;
  MaxGroupPreparedCapacity?: number;
  MinSize?: number;
  PoolState?: string;
  InstanceReusePolicy?: {
    ReuseOnScaleIn?: boolean;
  };
};
