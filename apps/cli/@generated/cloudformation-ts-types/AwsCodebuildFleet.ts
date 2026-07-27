// This file is auto-generated. Do not edit manually.
// Source: aws-codebuild-fleet.json

/** Resource Type definition for AWS::CodeBuild::Fleet */
export type AwsCodebuildFleet = {
  /**
   * @minLength 2
   * @maxLength 128
   */
  Name?: string;
  /** @minimum 0 */
  BaseCapacity?: number;
  /** @enum ["WINDOWS_SERVER_2019_CONTAINER","WINDOWS_SERVER_2022_CONTAINER","LINUX_CONTAINER","LINUX_GPU_CONTAINER","ARM_CONTAINER","MAC_ARM","LINUX_EC2","ARM_EC2","WINDOWS_EC2"] */
  EnvironmentType?: "WINDOWS_SERVER_2019_CONTAINER" | "WINDOWS_SERVER_2022_CONTAINER" | "LINUX_CONTAINER" | "LINUX_GPU_CONTAINER" | "ARM_CONTAINER" | "MAC_ARM" | "LINUX_EC2" | "ARM_EC2" | "WINDOWS_EC2";
  /** @enum ["BUILD_GENERAL1_SMALL","BUILD_GENERAL1_MEDIUM","BUILD_GENERAL1_LARGE","BUILD_GENERAL1_XLARGE","BUILD_GENERAL1_2XLARGE","ATTRIBUTE_BASED_COMPUTE","CUSTOM_INSTANCE_TYPE"] */
  ComputeType?: "BUILD_GENERAL1_SMALL" | "BUILD_GENERAL1_MEDIUM" | "BUILD_GENERAL1_LARGE" | "BUILD_GENERAL1_XLARGE" | "BUILD_GENERAL1_2XLARGE" | "ATTRIBUTE_BASED_COMPUTE" | "CUSTOM_INSTANCE_TYPE";
  /** @enum ["QUEUE","ON_DEMAND"] */
  OverflowBehavior?: "QUEUE" | "ON_DEMAND";
  /** @pattern ^(?:arn:)[a-zA-Z+-=,._:/@]+$ */
  FleetServiceRole?: string;
  FleetVpcConfig?: {
    VpcId?: string;
    Subnets?: string[];
    SecurityGroupIds?: string[];
  };
  FleetProxyConfiguration?: {
    /** @enum ["ALLOW_ALL","DENY_ALL"] */
    DefaultBehavior?: "ALLOW_ALL" | "DENY_ALL";
    OrderedProxyRules?: ({
      /** @enum ["DOMAIN","IP"] */
      Type?: "DOMAIN" | "IP";
      /** @enum ["ALLOW","DENY"] */
      Effect?: "ALLOW" | "DENY";
      Entities?: string[];
    })[];
  };
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 255 Unicode characters in length. You
     * can use any of the following characters: the set of Unicode letters, digits, whitespace, _, ., /,
     * =, +, and -.
     * @minLength 0
     * @maxLength 256
     * @pattern [a-zA-Z+-=._:/]+$
     */
    Value: string;
  }[];
  /** @minLength 1 */
  Arn?: string;
  /** @pattern ^((aws/codebuild/([A-Za-z0-9._-]+|ami/[A-Za-z0-9._-]+):[A-Za-z0-9._-]+)|ami-[a-z0-9]{1,1020})$ */
  ImageId?: string;
  ScalingConfiguration?: {
    /** @minimum 1 */
    MaxCapacity?: number;
    /** @enum ["TARGET_TRACKING_SCALING"] */
    ScalingType?: "TARGET_TRACKING_SCALING";
    TargetTrackingScalingConfigs?: {
      /** @enum ["FLEET_UTILIZATION_RATE"] */
      MetricType?: "FLEET_UTILIZATION_RATE";
      TargetValue?: number;
    }[];
  };
  ComputeConfiguration?: {
    vCpu?: number;
    memory?: number;
    disk?: number;
    /** @enum ["GENERAL","NVME"] */
    machineType?: "GENERAL" | "NVME";
    instanceType?: string;
  };
};
