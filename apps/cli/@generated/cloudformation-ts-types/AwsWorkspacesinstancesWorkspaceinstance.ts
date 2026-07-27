// This file is auto-generated. Do not edit manually.
// Source: aws-workspacesinstances-workspaceinstance.json

/** Resource Type definition for AWS::WorkspacesInstances::WorkspaceInstance */
export type AwsWorkspacesinstancesWorkspaceinstance = {
  ManagedInstance?: {
    BlockDeviceMappings?: ({
      /** @maxLength 32 */
      DeviceName?: string;
      Ebs?: {
        /** @enum ["standard","io1","io2","gp2","sc1","st1","gp3"] */
        VolumeType?: "standard" | "io1" | "io2" | "gp2" | "sc1" | "st1" | "gp3";
        Encrypted?: boolean;
        /** @maxLength 128 */
        KmsKeyId?: string;
        /** @minimum 0 */
        Iops?: number;
        /** @minimum 0 */
        Throughput?: number;
        /** @minimum 0 */
        VolumeSize?: number;
      };
      /** @maxLength 32 */
      NoDevice?: string;
      /** @pattern ^ephemeral(0|[1-9][0-9]{0,2})$ */
      VirtualName?: string;
    })[];
    CapacityReservationSpecification?: {
      /** @enum ["capacity-reservations-only","open","none"] */
      CapacityReservationPreference?: "capacity-reservations-only" | "open" | "none";
      CapacityReservationTarget?: {
        /** @maxLength 128 */
        CapacityReservationId?: string;
        /** @pattern ^arn:.* */
        CapacityReservationResourceGroupArn?: string;
      };
    };
    CpuOptions?: {
      /** @minimum 0 */
      CoreCount?: number;
      /** @minimum 0 */
      ThreadsPerCore?: number;
    };
    CreditSpecification?: {
      /** @enum ["standard","unlimited"] */
      CpuCredits?: "standard" | "unlimited";
    };
    DisableApiStop?: boolean;
    EbsOptimized?: boolean;
    EnablePrimaryIpv6?: boolean;
    EnclaveOptions?: {
      Enabled?: boolean;
    };
    HibernationOptions?: {
      Configured?: boolean;
    };
    IamInstanceProfile?: {
      /**
       * @maxLength 2048
       * @pattern ^arn:.*
       */
      Arn?: string;
      /** @maxLength 64 */
      Name?: string;
    };
    /** @pattern ^ami-[0-9a-zA-Z]{1,63}$ */
    ImageId: string;
    InstanceMarketOptions?: {
      /** @enum ["spot","capacity-block"] */
      MarketType?: "spot" | "capacity-block";
      SpotOptions?: {
        /** @enum ["hibernate","stop"] */
        InstanceInterruptionBehavior?: "hibernate" | "stop";
        /** @maxLength 64 */
        MaxPrice?: string;
        /** @enum ["one-time","persistent"] */
        SpotInstanceType?: "one-time" | "persistent";
        /** @maxLength 64 */
        ValidUntilUtc?: string;
      };
    };
    /** @pattern ^([a-z0-9-]+)\.([a-z0-9]+)$ */
    InstanceType: string;
    /** @minimum 0 */
    Ipv6AddressCount?: number;
    /** @maxLength 64 */
    KeyName?: string;
    LicenseSpecifications?: {
      /** @pattern ^arn:.* */
      LicenseConfigurationArn?: string;
    }[];
    MaintenanceOptions?: {
      /** @enum ["disabled","default"] */
      AutoRecovery?: "disabled" | "default";
    };
    MetadataOptions?: {
      /** @enum ["enabled","disabled"] */
      HttpEndpoint?: "enabled" | "disabled";
      /** @enum ["enabled","disabled"] */
      HttpProtocolIpv6?: "enabled" | "disabled";
      /**
       * @minimum 1
       * @maximum 64
       */
      HttpPutResponseHopLimit?: number;
      /** @enum ["optional","required"] */
      HttpTokens?: "optional" | "required";
      /** @enum ["enabled","disabled"] */
      InstanceMetadataTags?: "enabled" | "disabled";
    };
    Monitoring?: {
      Enabled?: boolean;
    };
    NetworkInterfaces?: {
      /**
       * @maxLength 1000
       * @pattern ^[\S\s]*$
       */
      Description?: string;
      /** @minimum 0 */
      DeviceIndex?: number;
      Groups?: string[];
      /** @pattern ^subnet-[0-9a-zA-Z]{1,63}$ */
      SubnetId?: string;
    }[];
    NetworkPerformanceOptions?: {
      /** @enum ["default","vpc-1","ebs-1"] */
      BandwidthWeighting?: "default" | "vpc-1" | "ebs-1";
    };
    Placement?: {
      /** @pattern ^[a-z]{2}-[a-z]+-\d[a-z](-[a-z0-9]+)?$ */
      AvailabilityZone?: string;
      /** @pattern ^pg-[0-9a-zA-Z]{1,63}$ */
      GroupId?: string;
      /** @maxLength 255 */
      GroupName?: string;
      PartitionNumber?: number;
      /** @enum ["default","dedicated","host"] */
      Tenancy?: "default" | "dedicated" | "host";
    };
    PrivateDnsNameOptions?: {
      /** @enum ["ip-name","resource-name"] */
      HostnameType?: "ip-name" | "resource-name";
      EnableResourceNameDnsARecord?: boolean;
      EnableResourceNameDnsAAAARecord?: boolean;
    };
    /** @pattern ^subnet-[0-9a-zA-Z]{1,63}$ */
    SubnetId?: string;
    /** @maxItems 30 */
    TagSpecifications?: ({
      /** @enum ["instance","volume","spot-instances-request","network-interface"] */
      ResourceType?: "instance" | "volume" | "spot-instances-request" | "network-interface";
      /** @maxItems 30 */
      Tags?: {
        /**
         * @minLength 1
         * @maxLength 128
         */
        Key: string;
        /** @maxLength 256 */
        Value?: string;
      }[];
    })[];
    /** @maxLength 16000 */
    UserData?: string;
  };
  /** @maxItems 30 */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /** @maxLength 256 */
    Value?: string;
  }[];
  /**
   * Unique identifier for the workspace instance
   * @pattern ^wsinst-[0-9a-zA-Z]{8,63}$
   */
  WorkspaceInstanceId?: string;
  /**
   * The current state of the workspace instance
   * @enum ["ALLOCATING","ALLOCATED","DEALLOCATING","DEALLOCATED","ERROR_ALLOCATING","ERROR_DEALLOCATING"]
   */
  ProvisionState?: "ALLOCATING" | "ALLOCATED" | "DEALLOCATING" | "DEALLOCATED" | "ERROR_ALLOCATING" | "ERROR_DEALLOCATING";
  EC2ManagedInstance?: {
    InstanceId?: string;
  };
};
