// This file is auto-generated. Do not edit manually.
// Source: aws-msk-cluster.json

/** Resource Type definition for AWS::MSK::Cluster */
export type AwsMskCluster = {
  BrokerNodeGroupInfo: {
    StorageInfo?: {
      EBSStorageInfo?: {
        /**
         * @minimum 1
         * @maximum 16384
         */
        VolumeSize?: number;
        ProvisionedThroughput?: {
          Enabled?: boolean;
          VolumeThroughput?: number;
        };
      };
    };
    ConnectivityInfo?: {
      PublicAccess?: {
        /**
         * @minLength 7
         * @maxLength 23
         */
        Type?: string;
      };
      VpcConnectivity?: {
        ClientAuthentication?: {
          Tls?: {
            Enabled: boolean;
          };
          Sasl?: {
            Scram?: {
              Enabled: boolean;
            };
            Iam?: {
              Enabled: boolean;
            };
          };
        };
      };
    };
    /** @uniqueItems false */
    SecurityGroups?: string[];
    /**
     * @minLength 6
     * @maxLength 9
     */
    BrokerAZDistribution?: string;
    /** @uniqueItems false */
    ClientSubnets: string[];
    /**
     * @minLength 5
     * @maxLength 32
     */
    InstanceType: string;
  };
  /**
   * @minLength 7
   * @maxLength 23
   * @enum ["DEFAULT","PER_BROKER","PER_TOPIC_PER_BROKER","PER_TOPIC_PER_PARTITION"]
   */
  EnhancedMonitoring?: "DEFAULT" | "PER_BROKER" | "PER_TOPIC_PER_BROKER" | "PER_TOPIC_PER_PARTITION";
  /**
   * @minLength 1
   * @maxLength 128
   */
  KafkaVersion: string;
  NumberOfBrokerNodes: number;
  EncryptionInfo?: {
    EncryptionAtRest?: {
      DataVolumeKMSKeyId: string;
    };
    EncryptionInTransit?: {
      InCluster?: boolean;
      /** @enum ["TLS","TLS_PLAINTEXT","PLAINTEXT"] */
      ClientBroker?: "TLS" | "TLS_PLAINTEXT" | "PLAINTEXT";
    };
  };
  OpenMonitoring?: {
    Prometheus: {
      JmxExporter?: {
        EnabledInBroker: boolean;
      };
      NodeExporter?: {
        EnabledInBroker: boolean;
      };
    };
  };
  /**
   * @minLength 1
   * @maxLength 64
   */
  ClusterName: string;
  Arn?: string;
  /** The current version of the MSK cluster */
  CurrentVersion?: string;
  ClientAuthentication?: {
    Tls?: {
      /** @uniqueItems false */
      CertificateAuthorityArnList?: string[];
      Enabled?: boolean;
    };
    Sasl?: {
      Scram?: {
        Enabled: boolean;
      };
      Iam?: {
        Enabled: boolean;
      };
    };
    Unauthenticated?: {
      Enabled: boolean;
    };
  };
  LoggingInfo?: {
    BrokerLogs: {
      S3?: {
        Enabled: boolean;
        Prefix?: string;
        Bucket?: string;
      };
      CloudWatchLogs?: {
        LogGroup?: string;
        Enabled: boolean;
      };
      Firehose?: {
        Enabled: boolean;
        DeliveryStream?: string;
      };
    };
  };
  /** A key-value pair to associate with a resource. */
  Tags?: Record<string, string>;
  ConfigurationInfo?: {
    Revision: number;
    Arn: string;
  };
  /**
   * @minLength 5
   * @maxLength 6
   * @enum ["LOCAL","TIERED"]
   */
  StorageMode?: "LOCAL" | "TIERED";
  Rebalancing?: {
    /** @enum ["PAUSED","ACTIVE"] */
    Status: "PAUSED" | "ACTIVE";
  };
};
