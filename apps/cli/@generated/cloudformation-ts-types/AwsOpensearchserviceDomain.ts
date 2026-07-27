// This file is auto-generated. Do not edit manually.
// Source: aws-opensearchservice-domain.json

/** An example resource schema demonstrating some basic constructs and validation rules. */
export type AwsOpensearchserviceDomain = {
  ClusterConfig?: {
    InstanceCount?: number;
    WarmEnabled?: boolean;
    WarmCount?: number;
    DedicatedMasterEnabled?: boolean;
    ZoneAwarenessConfig?: {
      AvailabilityZoneCount?: number;
    };
    DedicatedMasterCount?: number;
    InstanceType?: string;
    WarmType?: string;
    ZoneAwarenessEnabled?: boolean;
    DedicatedMasterType?: string;
    MultiAZWithStandbyEnabled?: boolean;
    ColdStorageOptions?: {
      Enabled?: boolean;
    };
    NodeOptions?: {
      /** @enum ["coordinator"] */
      NodeType?: "coordinator";
      NodeConfig?: {
        Enabled?: boolean;
        Type?: string;
        Count?: number;
      };
    }[];
  };
  DomainName?: string;
  AccessPolicies?: Record<string, unknown>;
  IPAddressType?: string;
  EngineVersion?: string;
  AdvancedOptions?: Record<string, string>;
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
  DomainEndpointOptions?: {
    CustomEndpointCertificateArn?: string;
    CustomEndpointEnabled?: boolean;
    EnforceHTTPS?: boolean;
    CustomEndpoint?: string;
    TLSSecurityPolicy?: string;
  };
  CognitoOptions?: {
    Enabled?: boolean;
    IdentityPoolId?: string;
    UserPoolId?: string;
    RoleArn?: string;
  };
  AdvancedSecurityOptions?: {
    Enabled?: boolean;
    MasterUserOptions?: {
      MasterUserPassword?: string;
      MasterUserName?: string;
      MasterUserARN?: string;
    };
    InternalUserDatabaseEnabled?: boolean;
    AnonymousAuthEnabled?: boolean;
    SAMLOptions?: {
      Enabled?: boolean;
      Idp?: {
        /**
         * @minLength 1
         * @maxLength 1048576
         */
        MetadataContent: string;
        EntityId: string;
      };
      MasterUserName?: string;
      MasterBackendRole?: string;
      SubjectKey?: string;
      RolesKey?: string;
      SessionTimeoutMinutes?: number;
    };
    JWTOptions?: {
      Enabled?: boolean;
      PublicKey?: string;
      SubjectKey?: string;
      RolesKey?: string;
    };
    IAMFederationOptions?: {
      Enabled?: boolean;
      RolesKey?: string;
      SubjectKey?: string;
    };
    AnonymousAuthDisableDate?: string;
  };
  DomainEndpoint?: string;
  DomainEndpointV2?: string;
  DomainEndpoints?: Record<string, string>;
  EBSOptions?: {
    EBSEnabled?: boolean;
    VolumeType?: string;
    Iops?: number;
    VolumeSize?: number;
    Throughput?: number;
  };
  Id?: string;
  Arn?: string;
  DomainArn?: string;
  EncryptionAtRestOptions?: {
    KmsKeyId?: string;
    Enabled?: boolean;
  };
  /**
   * An arbitrary set of tags (key-value pairs) for this Domain.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key of the tag.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
    /**
     * The value of the tag.
     * @minLength 0
     * @maxLength 128
     */
    Key: string;
  }[];
  ServiceSoftwareOptions?: {
    CurrentVersion?: string;
    NewVersion?: string;
    UpdateAvailable?: boolean;
    Cancellable?: boolean;
    UpdateStatus?: string;
    Description?: string;
    AutomatedUpdateDate?: string;
    OptionalDeployment?: boolean;
  };
  OffPeakWindowOptions?: {
    Enabled?: boolean;
    OffPeakWindow?: {
      WindowStartTime?: {
        /**
         * @minimum 0
         * @maximum 23
         */
        Hours: number;
        /**
         * @minimum 0
         * @maximum 59
         */
        Minutes: number;
      };
    };
  };
  SoftwareUpdateOptions?: {
    AutoSoftwareUpdateEnabled?: boolean;
  };
  SkipShardMigrationWait?: boolean;
  IdentityCenterOptions?: {
    /** Whether Identity Center is enabled. */
    EnabledAPIAccess?: boolean;
    /** The ARN of the Identity Center instance. */
    IdentityCenterInstanceARN?: string;
    /** The subject key for Identity Center options. */
    SubjectKey?: "UserName" | "UserId" | "Email";
    /** The roles key for Identity Center options. */
    RolesKey?: "GroupName" | "GroupId";
    /** The ARN of the Identity Center application. */
    IdentityCenterApplicationARN?: string;
    /** The IdentityStoreId for Identity Center options. */
    IdentityStoreId?: string;
  };
  AIMLOptions?: {
    S3VectorsEngine?: {
      /** Whether to enable S3 vectors engine. */
      Enabled: boolean;
    };
  };
};
