// This file is auto-generated. Do not edit manually.
// Source: aws-mediaconnect-routeroutput.json

/**
 * Represents a router input in AWS Elemental MediaConnect that can be used to egress content
 * transmitted from router inputs
 */
export type AwsMediaconnectRouteroutput = {
  /** @pattern ^arn:(aws[a-zA-Z-]*):mediaconnect:[a-z0-9-]+:[0-9]{12}:routerOutput:[a-z0-9]{12}$ */
  Arn?: string;
  /**
   * The Availability Zone where you want to create the router output. This must be a valid Availability
   * Zone for the region specified by regionName, or the current region if no regionName is provided.
   */
  AvailabilityZone?: string;
  Configuration: {
    Standard: {
      /**
       * The Amazon Resource Name (ARN) of the network interface associated with the standard router output.
       * @pattern ^arn:(aws[a-zA-Z-]*):mediaconnect:[a-z0-9-]+:[0-9]{12}:routerNetworkInterface:[a-z0-9]{12}$
       */
      NetworkInterfaceArn: string;
      ProtocolConfiguration: {
        Rtp: {
          /** The destination IP address for the RTP protocol in the router output configuration. */
          DestinationAddress: string;
          /**
           * The destination port number for the RTP protocol in the router output configuration.
           * @minimum 0
           * @maximum 65531
           */
          DestinationPort: number;
          ForwardErrorCorrection?: "ENABLED" | "DISABLED";
        };
      } | {
        Rist: {
          /** The destination IP address for the RIST protocol in the router output configuration. */
          DestinationAddress: string;
          /**
           * The destination port number for the RIST protocol in the router output configuration.
           * @minimum 0
           * @maximum 65535
           */
          DestinationPort: number;
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
          EncryptionConfiguration?: {
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
          /** The destination IP address for the SRT protocol in caller mode. */
          DestinationAddress: string;
          /**
           * The destination port number for the SRT protocol in caller mode.
           * @minimum 0
           * @maximum 65535
           */
          DestinationPort: number;
          /**
           * The minimum latency in milliseconds for the SRT protocol in caller mode.
           * @minimum 10
           * @maximum 10000
           */
          MinimumLatencyMilliseconds: number;
          /** The stream ID for the SRT protocol in caller mode. */
          StreamId?: string;
          EncryptionConfiguration?: {
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
    MediaConnectFlow: {
      /**
       * The ARN of the flow to connect to this router output.
       * @pattern ^arn:(aws[a-zA-Z-]*):mediaconnect:[a-z0-9-]+:[0-9]{12}:flow:[a-zA-Z0-9-]+:[a-zA-Z0-9_-]+$
       */
      FlowArn?: string;
      /**
       * The ARN of the flow source to connect to this router output.
       * @pattern ^arn:(aws[a-zA-Z-]*):mediaconnect:[a-z0-9-]+:[0-9]{12}:source:[a-zA-Z0-9-]+:[a-zA-Z0-9_-]+$
       */
      FlowSourceArn?: string;
      DestinationTransitEncryption: {
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
  } | {
    MediaLiveInput: {
      /**
       * The ARN of the MediaLive input to connect to this router output.
       * @pattern ^arn:(aws[a-zA-Z-]*):medialive:[a-z0-9-]+:[0-9]{12}:input:[a-zA-Z0-9]+$
       */
      MediaLiveInputArn?: string;
      MediaLivePipelineId?: "PIPELINE_0" | "PIPELINE_1";
      DestinationTransitEncryption: {
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
  /** The timestamp when the router output was created. */
  CreatedAt?: string;
  /** The unique identifier of the router output. */
  Id?: string;
  /** The IP address of the router output. */
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
  /** The maximum bitrate for the router output. */
  MaximumBitrate: number;
  /**
   * The name of the router output.
   * @minLength 1
   * @maxLength 128
   */
  Name: string;
  OutputType?: "STANDARD" | "MEDIACONNECT_FLOW" | "MEDIALIVE_INPUT";
  /** The AWS Region for the router output. Defaults to the current region if not specified. */
  RegionName?: string;
  RoutedState?: "ROUTED" | "ROUTING" | "UNROUTED";
  RoutingScope: "REGIONAL" | "GLOBAL";
  State?: "CREATING" | "STANDBY" | "STARTING" | "ACTIVE" | "STOPPING" | "DELETING" | "UPDATING" | "ERROR" | "RECOVERING" | "MIGRATING";
  /** Key-value pairs that can be used to tag this router output. */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  Tier: "OUTPUT_100" | "OUTPUT_50" | "OUTPUT_20";
  /** The timestamp when the router output was last updated. */
  UpdatedAt?: string;
};
