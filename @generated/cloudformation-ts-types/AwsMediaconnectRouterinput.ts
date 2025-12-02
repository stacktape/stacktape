// This file is auto-generated. Do not edit manually.
// Source: aws-mediaconnect-routerinput.json

/**
 * Represents a router input in AWS Elemental MediaConnect that is used to ingest content to be
 * transmitted to router outputs
 */
export type AwsMediaconnectRouterinput = {
  /** @pattern ^arn:(aws[a-zA-Z-]*):mediaconnect:[a-z0-9-]+:[0-9]{12}:routerInput:[a-z0-9]{12}$ */
  Arn?: string;
  /**
   * The Availability Zone where you want to create the router input. This must be a valid Availability
   * Zone for the region specified by regionName, or the current region if no regionName is provided.
   */
  AvailabilityZone?: string;
  Configuration: {
    Standard: {
      /**
       * The Amazon Resource Name (ARN) of the network interface associated with the standard router input.
       * @pattern ^arn:(aws[a-zA-Z-]*):mediaconnect:[a-z0-9-]+:[0-9]{12}:routerNetworkInterface:[a-z0-9]{12}$
       */
      NetworkInterfaceArn: string;
      ProtocolConfiguration: {
        Rtp: {
          /**
           * The port number used for the RTP protocol in the router input configuration.
           * @minimum 3000
           * @maximum 30000
           */
          Port: number;
          ForwardErrorCorrection?: "ENABLED" | "DISABLED";
        };
      } | {
        Rist: {
          /**
           * The port number used for the RIST protocol in the router input configuration.
           * @minimum 3000
           * @maximum 30000
           */
          Port: number;
          /**
           * The recovery latency in milliseconds for the RIST protocol in the router input configuration.
           * @minimum 10
           * @maximum 10000
           */
          RecoveryLatencyMilliseconds: number;
        };
      } | {
        SrtListener: {
          /**
           * The port number for the SRT protocol in listener mode.
           * @minimum 3000
           * @maximum 30000
           */
          Port: number;
          /**
           * The minimum latency in milliseconds for the SRT protocol in listener mode.
           * @minimum 10
           * @maximum 10000
           */
          MinimumLatencyMilliseconds: number;
          DecryptionConfiguration?: {
            EncryptionKey: {
              /**
               * The ARN of the AWS Secrets Manager secret used for transit encryption.
               * @pattern ^arn:(aws[a-zA-Z-]*):secretsmanager:[a-z0-9-]+:[0-9]{12}:secret:[a-zA-Z0-9/_+=.@-]+$
               */
              SecretArn: string;
              /**
               * The ARN of the IAM role assumed by MediaConnect to access the AWS Secrets Manager secret.
               * @pattern ^arn:(aws[a-zA-Z-]*):iam::[0-9]{12}:role/[a-zA-Z0-9_+=,.@-]+$
               */
              RoleArn: string;
            };
          };
        };
      } | {
        SrtCaller: {
          /** The source IP address for the SRT protocol in caller mode. */
          SourceAddress: string;
          /**
           * The source port number for the SRT protocol in caller mode.
           * @minimum 0
           * @maximum 65535
           */
          SourcePort: number;
          /**
           * The minimum latency in milliseconds for the SRT protocol in caller mode.
           * @minimum 10
           * @maximum 10000
           */
          MinimumLatencyMilliseconds: number;
          /** The stream ID for the SRT protocol in caller mode. */
          StreamId?: string;
          DecryptionConfiguration?: {
            EncryptionKey: {
              /**
               * The ARN of the AWS Secrets Manager secret used for transit encryption.
               * @pattern ^arn:(aws[a-zA-Z-]*):secretsmanager:[a-z0-9-]+:[0-9]{12}:secret:[a-zA-Z0-9/_+=.@-]+$
               */
              SecretArn: string;
              /**
               * The ARN of the IAM role assumed by MediaConnect to access the AWS Secrets Manager secret.
               * @pattern ^arn:(aws[a-zA-Z-]*):iam::[0-9]{12}:role/[a-zA-Z0-9_+=,.@-]+$
               */
              RoleArn: string;
            };
          };
        };
      };
      Protocol?: "RTP" | "RIST" | "SRT_CALLER" | "SRT_LISTENER";
    };
  } | {
    Failover: {
      /**
       * The ARN of the network interface to use for this failover router input.
       * @pattern ^arn:(aws[a-zA-Z-]*):mediaconnect:[a-z0-9-]+:[0-9]{12}:routerNetworkInterface:[a-z0-9]{12}$
       */
      NetworkInterfaceArn: string;
      /**
       * A list of exactly two protocol configurations for the failover input sources. Both must use the
       * same protocol type.
       */
      ProtocolConfigurations: ({
        Rtp: {
          /**
           * The port number used for the RTP protocol in the router input configuration.
           * @minimum 3000
           * @maximum 30000
           */
          Port: number;
          ForwardErrorCorrection?: "ENABLED" | "DISABLED";
        };
      } | {
        Rist: {
          /**
           * The port number used for the RIST protocol in the router input configuration.
           * @minimum 3000
           * @maximum 30000
           */
          Port: number;
          /**
           * The recovery latency in milliseconds for the RIST protocol in the router input configuration.
           * @minimum 10
           * @maximum 10000
           */
          RecoveryLatencyMilliseconds: number;
        };
      } | {
        SrtListener: {
          /**
           * The port number for the SRT protocol in listener mode.
           * @minimum 3000
           * @maximum 30000
           */
          Port: number;
          /**
           * The minimum latency in milliseconds for the SRT protocol in listener mode.
           * @minimum 10
           * @maximum 10000
           */
          MinimumLatencyMilliseconds: number;
          DecryptionConfiguration?: {
            EncryptionKey: {
              /**
               * The ARN of the AWS Secrets Manager secret used for transit encryption.
               * @pattern ^arn:(aws[a-zA-Z-]*):secretsmanager:[a-z0-9-]+:[0-9]{12}:secret:[a-zA-Z0-9/_+=.@-]+$
               */
              SecretArn: string;
              /**
               * The ARN of the IAM role assumed by MediaConnect to access the AWS Secrets Manager secret.
               * @pattern ^arn:(aws[a-zA-Z-]*):iam::[0-9]{12}:role/[a-zA-Z0-9_+=,.@-]+$
               */
              RoleArn: string;
            };
          };
        };
      } | {
        SrtCaller: {
          /** The source IP address for the SRT protocol in caller mode. */
          SourceAddress: string;
          /**
           * The source port number for the SRT protocol in caller mode.
           * @minimum 0
           * @maximum 65535
           */
          SourcePort: number;
          /**
           * The minimum latency in milliseconds for the SRT protocol in caller mode.
           * @minimum 10
           * @maximum 10000
           */
          MinimumLatencyMilliseconds: number;
          /** The stream ID for the SRT protocol in caller mode. */
          StreamId?: string;
          DecryptionConfiguration?: {
            EncryptionKey: {
              /**
               * The ARN of the AWS Secrets Manager secret used for transit encryption.
               * @pattern ^arn:(aws[a-zA-Z-]*):secretsmanager:[a-z0-9-]+:[0-9]{12}:secret:[a-zA-Z0-9/_+=.@-]+$
               */
              SecretArn: string;
              /**
               * The ARN of the IAM role assumed by MediaConnect to access the AWS Secrets Manager secret.
               * @pattern ^arn:(aws[a-zA-Z-]*):iam::[0-9]{12}:role/[a-zA-Z0-9_+=,.@-]+$
               */
              RoleArn: string;
            };
          };
        };
      })[];
      SourcePriorityMode: "NO_PRIORITY" | "PRIMARY_SECONDARY";
      /**
       * The index (0 or 1) that specifies which source in the protocol configurations list is currently
       * active. Used to control which of the two failover sources is currently selected. This field is
       * ignored when sourcePriorityMode is set to NO_PRIORITY
       * @minimum 0
       * @maximum 1
       */
      PrimarySourceIndex?: number;
    };
  } | {
    Merge: {
      /**
       * The ARN of the network interface to use for this merge router input.
       * @pattern ^arn:(aws[a-zA-Z-]*):mediaconnect:[a-z0-9-]+:[0-9]{12}:routerNetworkInterface:[a-z0-9]{12}$
       */
      NetworkInterfaceArn: string;
      /**
       * A list of exactly two protocol configurations for the merge input sources. Both must use the same
       * protocol type.
       */
      ProtocolConfigurations: ({
        Rtp: {
          /**
           * The port number used for the RTP protocol in the router input configuration.
           * @minimum 3000
           * @maximum 30000
           */
          Port: number;
          ForwardErrorCorrection?: "ENABLED" | "DISABLED";
        };
      } | {
        Rist: {
          /**
           * The port number used for the RIST protocol in the router input configuration.
           * @minimum 3000
           * @maximum 30000
           */
          Port: number;
          /**
           * The recovery latency in milliseconds for the RIST protocol in the router input configuration.
           * @minimum 10
           * @maximum 10000
           */
          RecoveryLatencyMilliseconds: number;
        };
      })[];
      /** The time window in milliseconds for merging the two input sources. */
      MergeRecoveryWindowMilliseconds: number;
    };
  } | {
    MediaConnectFlow: {
      /**
       * The ARN of the flow to connect to.
       * @pattern ^arn:(aws[a-zA-Z-]*):mediaconnect:[a-z0-9-]+:[0-9]{12}:flow:[a-zA-Z0-9-]+:[a-zA-Z0-9_-]+$
       */
      FlowArn?: string;
      /**
       * The ARN of the flow output to connect to this router input.
       * @pattern ^arn:(aws[a-zA-Z-]*):mediaconnect:[a-z0-9-]+:[0-9]{12}:output:[a-zA-Z0-9-]+:[a-zA-Z0-9_-]+$
       */
      FlowOutputArn?: string;
      SourceTransitDecryption: {
        EncryptionKeyType?: "SECRETS_MANAGER" | "AUTOMATIC";
        EncryptionKeyConfiguration: {
          SecretsManager: {
            /**
             * The ARN of the AWS Secrets Manager secret used for transit encryption.
             * @pattern ^arn:(aws[a-zA-Z-]*):secretsmanager:[a-z0-9-]+:[0-9]{12}:secret:[a-zA-Z0-9/_+=.@-]+$
             */
            SecretArn: string;
            /**
             * The ARN of the IAM role assumed by MediaConnect to access the AWS Secrets Manager secret.
             * @pattern ^arn:(aws[a-zA-Z-]*):iam::[0-9]{12}:role/[a-zA-Z0-9_+=,.@-]+$
             */
            RoleArn: string;
          };
        } | {
          Automatic: Record<string, unknown>;
        };
      };
    };
  };
  /** The timestamp when the router input was created. */
  CreatedAt?: string;
  /** The unique identifier of the router input. */
  Id?: string;
  InputType?: "STANDARD" | "FAILOVER" | "MERGE" | "MEDIACONNECT_FLOW";
  /** The IP address of the router input. */
  IpAddress?: string;
  MaintenanceConfiguration?: {
    PreferredDayTime: {
      Day: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
      /** The preferred time for maintenance operations. */
      Time: string;
    };
  } | {
    Default: Record<string, unknown>;
  };
  MaintenanceType?: "PREFERRED_DAY_TIME" | "DEFAULT";
  /** The maximum bitrate for the router input. */
  MaximumBitrate: number;
  /**
   * The name of the router input.
   * @minLength 1
   * @maxLength 128
   */
  Name: string;
  /** The AWS Region for the router input. Defaults to the current region if not specified. */
  RegionName?: string;
  /** The number of router outputs associated with the router input. */
  RoutedOutputs?: number;
  RoutingScope: "REGIONAL" | "GLOBAL";
  State?: "CREATING" | "STANDBY" | "STARTING" | "ACTIVE" | "STOPPING" | "DELETING" | "UPDATING" | "ERROR" | "RECOVERING" | "MIGRATING";
  /** Key-value pairs that can be used to tag and organize this router input. */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  Tier: "INPUT_100" | "INPUT_50" | "INPUT_20";
  TransitEncryption?: {
    EncryptionKeyType?: "SECRETS_MANAGER" | "AUTOMATIC";
    EncryptionKeyConfiguration: {
      SecretsManager: {
        /**
         * The ARN of the AWS Secrets Manager secret used for transit encryption.
         * @pattern ^arn:(aws[a-zA-Z-]*):secretsmanager:[a-z0-9-]+:[0-9]{12}:secret:[a-zA-Z0-9/_+=.@-]+$
         */
        SecretArn: string;
        /**
         * The ARN of the IAM role assumed by MediaConnect to access the AWS Secrets Manager secret.
         * @pattern ^arn:(aws[a-zA-Z-]*):iam::[0-9]{12}:role/[a-zA-Z0-9_+=,.@-]+$
         */
        RoleArn: string;
      };
    } | {
      Automatic: Record<string, unknown>;
    };
  };
  /** The timestamp when the router input was last updated. */
  UpdatedAt?: string;
};
