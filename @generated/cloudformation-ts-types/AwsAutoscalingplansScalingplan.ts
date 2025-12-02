// This file is auto-generated. Do not edit manually.
// Source: aws-autoscalingplans-scalingplan.json

/** Resource Type definition for AWS::AutoScalingPlans::ScalingPlan */
export type AwsAutoscalingplansScalingplan = {
  Id?: string;
  ScalingPlanName?: string;
  ScalingPlanVersion?: string;
  ApplicationSource: {
    CloudFormationStackARN?: string;
    /** @uniqueItems false */
    TagFilters?: {
      /** @uniqueItems false */
      Values?: string[];
      Key: string;
    }[];
  };
  /** @uniqueItems false */
  ScalingInstructions: {
    DisableDynamicScaling?: boolean;
    ServiceNamespace: string;
    PredictiveScalingMaxCapacityBehavior?: string;
    ScalableDimension: string;
    ScalingPolicyUpdateBehavior?: string;
    MinCapacity: number;
    /** @uniqueItems false */
    TargetTrackingConfigurations: {
      ScaleOutCooldown?: number;
      TargetValue: number;
      PredefinedScalingMetricSpecification?: {
        ResourceLabel?: string;
        PredefinedScalingMetricType: string;
      };
      DisableScaleIn?: boolean;
      ScaleInCooldown?: number;
      EstimatedInstanceWarmup?: number;
      CustomizedScalingMetricSpecification?: {
        MetricName: string;
        Statistic: string;
        /** @uniqueItems false */
        Dimensions?: {
          Value: string;
          Name: string;
        }[];
        Unit?: string;
        Namespace: string;
      };
    }[];
    PredictiveScalingMaxCapacityBuffer?: number;
    CustomizedLoadMetricSpecification?: {
      MetricName: string;
      Statistic: string;
      /** @uniqueItems false */
      Dimensions?: {
        Value: string;
        Name: string;
      }[];
      Unit?: string;
      Namespace: string;
    };
    PredefinedLoadMetricSpecification?: {
      PredefinedLoadMetricType: string;
      ResourceLabel?: string;
    };
    ResourceId: string;
    ScheduledActionBufferTime?: number;
    MaxCapacity: number;
    PredictiveScalingMode?: string;
  }[];
};
