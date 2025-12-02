// This file is auto-generated. Do not edit manually.
// Source: aws-codedeploy-deploymentconfig.json

/** Resource Type definition for AWS::CodeDeploy::DeploymentConfig */
export type AwsCodedeployDeploymentconfig = {
  /** The destination platform type for the deployment (Lambda, Server, or ECS). */
  ComputePlatform?: string;
  /**
   * A name for the deployment configuration. If you don't specify a name, AWS CloudFormation generates
   * a unique physical ID and uses that ID for the deployment configuration name. For more information,
   * see Name Type.
   */
  DeploymentConfigName?: string;
  /**
   * The minimum number of healthy instances that should be available at any time during the deployment.
   * There are two parameters expected in the input: type and value.
   */
  MinimumHealthyHosts?: {
    Value: number;
    Type: string;
  };
  /** The zonal deployment config that specifies how the zonal deployment behaves */
  ZonalConfig?: {
    FirstZoneMonitorDurationInSeconds?: number;
    MonitorDurationInSeconds?: number;
    MinimumHealthyHostsPerZone?: {
      Value: number;
      Type: string;
    };
  };
  /** The configuration that specifies how the deployment traffic is routed. */
  TrafficRoutingConfig?: {
    Type: string;
    TimeBasedLinear?: {
      LinearInterval: number;
      LinearPercentage: number;
    };
    TimeBasedCanary?: {
      CanaryPercentage: number;
      CanaryInterval: number;
    };
  };
};
