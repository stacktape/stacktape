// This file is auto-generated. Do not edit manually.
// Source: aws-redshiftserverless-workgroup.json

/** Definition of AWS::RedshiftServerless::Workgroup Resource Type */
export type AwsRedshiftserverlessWorkgroup = {
  /**
   * The name of the workgroup.
   * @minLength 3
   * @maxLength 64
   * @pattern ^(?=^[a-z0-9-]+$).{3,64}$
   */
  WorkgroupName: string;
  /**
   * The namespace the workgroup is associated with.
   * @minLength 3
   * @maxLength 64
   * @pattern ^(?=^[a-z0-9-]+$).{3,64}$
   */
  NamespaceName?: string;
  /** The base compute capacity of the workgroup in Redshift Processing Units (RPUs). */
  BaseCapacity?: number;
  /** The max compute capacity of the workgroup in Redshift Processing Units (RPUs). */
  MaxCapacity?: number;
  /**
   * The value that specifies whether to enable enhanced virtual private cloud (VPC) routing, which
   * forces Amazon Redshift Serverless to route traffic through your VPC.
   * @default false
   */
  EnhancedVpcRouting?: boolean;
  /**
   * A list of parameters to set for finer control over a database. Available options are datestyle,
   * enable_user_activity_logging, query_group, search_path, max_query_execution_time, and require_ssl.
   * @minItems 1
   * @uniqueItems true
   */
  ConfigParameters?: {
    /**
     * @minLength 0
     * @maxLength 255
     */
    ParameterKey?: string;
    /**
     * @minLength 0
     * @maxLength 15000
     */
    ParameterValue?: string;
  }[];
  /**
   * A list of security group IDs to associate with the workgroup.
   * @minItems 1
   * @maxItems 32
   */
  SecurityGroupIds?: string[];
  /**
   * A list of subnet IDs the workgroup is associated with.
   * @minItems 1
   * @maxItems 32
   */
  SubnetIds?: string[];
  /**
   * A value that specifies whether the workgroup can be accessible from a public network.
   * @default false
   */
  PubliclyAccessible?: boolean;
  /**
   * The custom port to use when connecting to a workgroup. Valid port ranges are 5431-5455 and
   * 8191-8215. The default is 5439.
   */
  Port?: number;
  /** A property that represents the price performance target settings for the workgroup. */
  PricePerformanceTarget?: {
    Status?: "ENABLED" | "DISABLED";
    /**
     * @minimum 1
     * @maximum 100
     */
    Level?: number;
  };
  /** The Amazon Resource Name (ARN) of the snapshot to restore from. */
  SnapshotArn?: string;
  /** The snapshot name to restore from. */
  SnapshotName?: string;
  /** The Amazon Web Services account that owns the snapshot. */
  SnapshotOwnerAccount?: string;
  /** The recovery point id to restore from. */
  RecoveryPointId?: string;
  /**
   * The map of the key-value pairs used to tag the workgroup.
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9_]+$
   */
  TrackName?: string;
  /** Definition for workgroup resource */
  Workgroup?: {
    WorkgroupId?: string;
    WorkgroupArn?: string;
    /**
     * @minLength 3
     * @maxLength 64
     * @pattern ^[a-z0-9-]*$
     */
    WorkgroupName?: string;
    /**
     * @minLength 3
     * @maxLength 64
     * @pattern ^[a-z0-9-]+$
     */
    NamespaceName?: string;
    BaseCapacity?: number;
    MaxCapacity?: number;
    EnhancedVpcRouting?: boolean;
    /** @uniqueItems true */
    ConfigParameters?: {
      /**
       * @minLength 0
       * @maxLength 255
       */
      ParameterKey?: string;
      /**
       * @minLength 0
       * @maxLength 15000
       */
      ParameterValue?: string;
    }[];
    SecurityGroupIds?: string[];
    SubnetIds?: string[];
    Status?: "CREATING" | "AVAILABLE" | "MODIFYING" | "DELETING";
    Endpoint?: {
      Address?: string;
      Port?: number;
      VpcEndpoints?: {
        VpcEndpointId?: string;
        VpcId?: string;
        NetworkInterfaces?: {
          NetworkInterfaceId?: string;
          SubnetId?: string;
          PrivateIpAddress?: string;
          AvailabilityZone?: string;
        }[];
      }[];
    };
    PubliclyAccessible?: boolean;
    CreationDate?: string;
    PricePerformanceTarget?: {
      Status?: "ENABLED" | "DISABLED";
      /**
       * @minimum 1
       * @maximum 100
       */
      Level?: number;
    };
    /**
     * @minLength 1
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9_]+$
     */
    TrackName?: string;
  };
};
