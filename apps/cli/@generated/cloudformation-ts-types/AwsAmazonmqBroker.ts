// This file is auto-generated. Do not edit manually.
// Source: aws-amazonmq-broker.json

/** Resource type definition for AWS::AmazonMQ::Broker */
export type AwsAmazonmqBroker = {
  Id?: string;
  /** @pattern ^arn:.* */
  Arn?: string;
  /** @pattern ^[0-9A-Za-z_-]{1,50}$ */
  BrokerName: string;
  EngineType: "ACTIVEMQ" | "RABBITMQ" | unknown | unknown;
  /** The version specified to use. See also EngineVersionCurrent. */
  EngineVersion?: string;
  /** The version in use. This may have more precision than the specified EngineVersion. */
  EngineVersionCurrent?: string;
  DeploymentMode: "SINGLE_INSTANCE" | "ACTIVE_STANDBY_MULTI_AZ" | "CLUSTER_MULTI_AZ" | unknown | unknown | unknown;
  HostInstanceType: string;
  PubliclyAccessible: boolean;
  AuthenticationStrategy?: string;
  LdapServerMetadata?: {
    /** @uniqueItems false */
    Hosts: string[];
    UserRoleName?: string;
    UserSearchMatching: string;
    RoleName?: string;
    UserBase: string;
    UserSearchSubtree?: boolean;
    RoleSearchMatching: string;
    ServiceAccountUsername: string;
    RoleBase: string;
    ServiceAccountPassword?: string;
    RoleSearchSubtree?: boolean;
  };
  StorageType?: "EBS" | "EFS" | unknown;
  EncryptionOptions?: {
    /**
     * The customer master key (CMK) to use for the A KMS (KMS).
     * This key is used to encrypt your data at rest. If not provided, Amazon MQ will use a default CMK to
     * encrypt your data.
     * The Key ARN is recommended so that drift can be detected,
     * but a key ID or key alias will also be accepted for API compatibility reasons.
     */
    KmsKeyId?: string;
    UseAwsOwnedKey: boolean;
  };
  /**
   * The intended configuration (ID and revision) to be set when creating or updating.
   * This property is write-only so that applications of a ConfigurationAssociation do not cause drift.
   */
  Configuration?: {
    Revision: number;
    Id: string;
  };
  /** The revision of the current actual configuration. */
  ConfigurationRevision?: string;
  /** The ID of the current actual configuration. */
  ConfigurationId?: string;
  DataReplicationMode?: "NONE" | "CRDR" | unknown | unknown;
  /**
   * The ARN of the primary broker that is used to replicate data from in a data replication pair when
   * creating a replica.
   * This field is only used at creation-time. Changes to it subsequently are ignored by CloudFormation.
   * Information on the current primary is available on the DataReplicationMetadata object returned by
   * the API.
   * @pattern ^arn:.*
   */
  DataReplicationPrimaryBrokerArn?: string;
  MaintenanceWindowStartTime?: {
    /**
     * _Allowed Values_: <code>MONDAY</code> | <code>TUESDAY</code> | <code>WEDNESDAY</code> |
     * <code>THURSDAY</code> | <code>FRIDAY</code> | <code>SATURDAY</code> | <code>SUNDAY</code>
     */
    DayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY" | unknown | unknown | unknown | unknown | unknown | unknown | unknown;
    /**
     * The time, in 24-hour format, and use only numbers separated by a colon, HH:MM or HH:MM:SS. Example:
     * 13:05.
     * When writing YAML this may need to be quoted to prevent a timestamp being read and converted to a
     * number of minutes or seconds.
     * @pattern ^[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?$
     */
    TimeOfDay: string;
    /** The time zone, UTC by default, in either the Country/City format, or the UTC offset format. */
    TimeZone: string;
  };
  AutoMinorVersionUpgrade?: boolean;
  /**
   * Users to configure on the broker.
   * For RabbitMQ, this should be one user, created when the broker is created, and changes thereafter
   * are ignored.
   * For ActiveMQ, changes to anything but Password are detected and will trigger an update,
   * but changes to Password cannot be detected so updates to Password may not take effect unless there
   * is some other change.
   * @uniqueItems false
   */
  Users?: {
    ReplicationUser?: boolean;
    ConsoleAccess?: boolean;
    /** @pattern ^[A-Za-z0-9_.~-]{2,100}$ */
    Username: string;
    /**
     * @maxItems 20
     * @uniqueItems false
     */
    Groups?: string[];
    /**
     * @minLength 12
     * @pattern ^[^,:=]+$
     */
    Password: string;
  }[];
  /** @uniqueItems false */
  StompEndpoints?: string[];
  /** @uniqueItems false */
  MqttEndpoints?: string[];
  /** @uniqueItems false */
  AmqpEndpoints?: string[];
  /** @uniqueItems false */
  ConsoleURLs?: string[];
  /** @uniqueItems false */
  WssEndpoints?: string[];
  /** @uniqueItems false */
  OpenWireEndpoints?: string[];
  Logs?: {
    Audit?: boolean;
    General?: boolean;
  };
  /**
   * @minItems 1
   * @maxItems 5
   * @uniqueItems false
   */
  SecurityGroups?: string[];
  /** @uniqueItems false */
  SubnetIds?: string[];
  /** @uniqueItems false */
  IpAddresses?: string[];
  /** @uniqueItems false */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
