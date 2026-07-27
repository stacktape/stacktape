// This file is auto-generated. Do not edit manually.
// Source: aws-opsworks-stack.json

/** Resource Type definition for AWS::OpsWorks::Stack */
export type AwsOpsworksStack = {
  Id?: string;
  AgentVersion?: string;
  Attributes?: Record<string, string>;
  ChefConfiguration?: {
    BerkshelfVersion?: string;
    ManageBerkshelf?: boolean;
  };
  /** @uniqueItems true */
  CloneAppIds?: string[];
  ClonePermissions?: boolean;
  ConfigurationManager?: {
    Name?: string;
    Version?: string;
  };
  CustomCookbooksSource?: {
    Password?: string;
    Revision?: string;
    SshKey?: string;
    Type?: string;
    Url?: string;
    Username?: string;
  };
  CustomJson?: Record<string, unknown>;
  DefaultAvailabilityZone?: string;
  DefaultInstanceProfileArn: string;
  DefaultOs?: string;
  DefaultRootDeviceType?: string;
  DefaultSshKeyName?: string;
  DefaultSubnetId?: string;
  EcsClusterArn?: string;
  /** @uniqueItems true */
  ElasticIps?: {
    Ip: string;
    Name?: string;
  }[];
  HostnameTheme?: string;
  Name: string;
  /** @uniqueItems true */
  RdsDbInstances?: {
    DbPassword: string;
    DbUser: string;
    RdsDbInstanceArn: string;
  }[];
  ServiceRoleArn: string;
  SourceStackId?: string;
  /** @uniqueItems false */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  UseCustomCookbooks?: boolean;
  UseOpsworksSecurityGroups?: boolean;
  VpcId?: string;
};
