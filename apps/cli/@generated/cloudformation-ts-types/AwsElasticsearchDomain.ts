// This file is auto-generated. Do not edit manually.
// Source: aws-elasticsearch-domain.json

/** Resource Type definition for AWS::Elasticsearch::Domain */
export type AwsElasticsearchDomain = {
  ElasticsearchClusterConfig?: {
    InstanceCount?: number;
    WarmEnabled?: boolean;
    WarmCount?: number;
    DedicatedMasterEnabled?: boolean;
    ZoneAwarenessConfig?: {
      AvailabilityZoneCount?: number;
    };
    ColdStorageOptions?: {
      Enabled?: boolean;
    };
    DedicatedMasterCount?: number;
    InstanceType?: string;
    WarmType?: string;
    ZoneAwarenessEnabled?: boolean;
    DedicatedMasterType?: string;
  };
  DomainName?: string;
  ElasticsearchVersion?: string;
  LogPublishingOptions?: Record<string, {
    CloudWatchLogsLogGroupArn?: string;
    Enabled?: boolean;
  }>;
  SnapshotOptions?: {
    AutomatedSnapshotStartHour?: number;
  };
  VPCOptions?: {
    /** @uniqueItems true */
    SecurityGroupIds?: string[];
    /** @uniqueItems true */
    SubnetIds?: string[];
  };
  NodeToNodeEncryptionOptions?: {
    Enabled?: boolean;
  };
  AccessPolicies?: Record<string, unknown>;
  DomainEndpointOptions?: {
    CustomEndpointCertificateArn?: string;
    CustomEndpointEnabled?: boolean;
    EnforceHTTPS?: boolean;
    CustomEndpoint?: string;
    TLSSecurityPolicy?: string;
  };
  DomainArn?: string;
  CognitoOptions?: {
    Enabled?: boolean;
    IdentityPoolId?: string;
    UserPoolId?: string;
    RoleArn?: string;
  };
  AdvancedOptions?: Record<string, string>;
  AdvancedSecurityOptions?: {
    Enabled?: boolean;
    MasterUserOptions?: {
      MasterUserPassword?: string;
      MasterUserName?: string;
      MasterUserARN?: string;
    };
    AnonymousAuthEnabled?: boolean;
    InternalUserDatabaseEnabled?: boolean;
  };
  DomainEndpoint?: string;
  EBSOptions?: {
    EBSEnabled?: boolean;
    VolumeType?: string;
    Iops?: number;
    VolumeSize?: number;
  };
  Id?: string;
  Arn?: string;
  EncryptionAtRestOptions?: {
    KmsKeyId?: string;
    Enabled?: boolean;
  };
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
