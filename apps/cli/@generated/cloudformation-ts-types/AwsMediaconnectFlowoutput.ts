// This file is auto-generated. Do not edit manually.
// Source: aws-mediaconnect-flowoutput.json

/** Resource schema for AWS::MediaConnect::FlowOutput */
export type AwsMediaconnectFlowoutput = {
  /** The Amazon Resource Name (ARN), a unique identifier for any AWS resource, of the flow. */
  FlowArn: string;
  /** The ARN of the output. */
  OutputArn?: string;
  /**
   * The range of IP addresses that should be allowed to initiate output requests to this flow. These IP
   * addresses should be in the form of a Classless Inter-Domain Routing (CIDR) block; for example,
   * 10.0.0.0/16.
   */
  CidrAllowList?: string[];
  /**
   * The type of key used for the encryption. If no keyType is provided, the service will use the
   * default setting (static-key).
   */
  Encryption?: {
    /**
     * The type of algorithm that is used for the encryption (such as aes128, aes192, or aes256).
     * @enum ["aes128","aes192","aes256"]
     */
    Algorithm?: "aes128" | "aes192" | "aes256";
    /**
     * The type of key that is used for the encryption. If no keyType is provided, the service will use
     * the default setting (static-key).
     * @default "static-key"
     * @enum ["static-key","srt-password"]
     */
    KeyType?: "static-key" | "srt-password";
    /**
     * The ARN of the role that you created during setup (when you set up AWS Elemental MediaConnect as a
     * trusted entity).
     */
    RoleArn: string;
    /**
     * The ARN of the secret that you created in AWS Secrets Manager to store the encryption key. This
     * parameter is required for static key encryption and is not valid for SPEKE encryption.
     */
    SecretArn: string;
  };
  /** A description of the output. */
  Description?: string;
  /** The address where you want to send the output. */
  Destination?: string;
  /**
   * The maximum latency in milliseconds. This parameter applies only to RIST-based and Zixi-based
   * streams.
   */
  MaxLatency?: number;
  /** The minimum latency in milliseconds. */
  MinLatency?: number;
  /** The name of the output. This value must be unique within the current flow. */
  Name?: string;
  /** The port to use when content is distributed to this output. */
  Port?: number;
  /**
   * The protocol that is used by the source or output.
   * @enum ["zixi-push","rtp-fec","rtp","zixi-pull","rist","fujitsu-qos","srt-listener","srt-caller","st2110-jpegxs","cdi","ndi-speed-hq"]
   */
  Protocol?: "zixi-push" | "rtp-fec" | "rtp" | "zixi-pull" | "rist" | "fujitsu-qos" | "srt-listener" | "srt-caller" | "st2110-jpegxs" | "cdi" | "ndi-speed-hq";
  /** The remote ID for the Zixi-pull stream. */
  RemoteId?: string;
  /** The smoothing latency in milliseconds for RIST, RTP, and RTP-FEC streams. */
  SmoothingLatency?: number;
  /**
   * The stream ID that you want to use for this transport. This parameter applies only to Zixi-based
   * streams.
   */
  StreamId?: string;
  /** The name of the VPC interface attachment to use for this output. */
  VpcInterfaceAttachment?: {
    /** The name of the VPC interface to use for this output. */
    VpcInterfaceName?: string;
  };
  /** The definition for each media stream that is associated with the output. */
  MediaStreamOutputConfigurations?: ({
    /**
     * The format that will be used to encode the data. For ancillary data streams, set the encoding name
     * to smpte291. For audio streams, set the encoding name to pcm. For video streams on sources or
     * outputs that use the CDI protocol, set the encoding name to raw. For video streams on sources or
     * outputs that use the ST 2110 JPEG XS protocol, set the encoding name to jxsv.
     * @enum ["jxsv","raw","smpte291","pcm"]
     */
    EncodingName: "jxsv" | "raw" | "smpte291" | "pcm";
    /** The media streams that you want to associate with the output. */
    DestinationConfigurations?: {
      /** The IP address where contents of the media stream will be sent. */
      DestinationIp: string;
      /** The port to use when the content of the media stream is distributed to the output. */
      DestinationPort: number;
      /** The VPC interface that is used for the media stream associated with the output. */
      Interface: {
        /** The name of the VPC interface that you want to use for the media stream associated with the output. */
        Name: string;
      };
    }[];
    /** A name that helps you distinguish one media stream from another. */
    MediaStreamName: string;
    /**
     * A collection of parameters that determine how MediaConnect will convert the content. These fields
     * only apply to outputs on flows that have a CDI source.
     */
    EncodingParameters?: {
      /**
       * A value that is used to calculate compression for an output. The bitrate of the output is
       * calculated as follows: Output bitrate = (1 / compressionFactor) * (source bitrate) This property
       * only applies to outputs that use the ST 2110 JPEG XS protocol, with a flow source that uses the CDI
       * protocol. Valid values are in the range of 3.0 to 10.0, inclusive.
       */
      CompressionFactor: number;
      /**
       * A setting on the encoder that drives compression settings. This property only applies to video
       * media streams associated with outputs that use the ST 2110 JPEG XS protocol, with a flow source
       * that uses the CDI protocol.
       * @enum ["main","high"]
       */
      EncoderProfile?: "main" | "high";
    };
  })[];
  /**
   * An indication of whether the output should transmit data or not.
   * @enum ["ENABLED","DISABLED"]
   */
  OutputStatus?: "ENABLED" | "DISABLED";
  /**
   * A suffix for the names of the NDI sources that the flow creates. If a custom name isn't specified,
   * MediaConnect uses the output name.
   */
  NdiProgramName?: string;
  /** A quality setting for the NDI Speed HQ encoder. */
  NdiSpeedHqQuality?: number;
  /** @enum ["ENABLED","DISABLED"] */
  RouterIntegrationState?: "ENABLED" | "DISABLED";
  RouterIntegrationTransitEncryption?: {
    EncryptionKeyType?: "SECRETS_MANAGER" | "AUTOMATIC";
    EncryptionKeyConfiguration: {
      SecretsManager: {
        /**
         * The ARN of the AWS Secrets Manager secret used for transit encryption to the router input.
         * @pattern ^arn:(aws[a-zA-Z-]*):secretsmanager:[a-z0-9-]+:[0-9]{12}:secret:[a-zA-Z0-9/_+=.@-]+$
         */
        SecretArn: string;
        /**
         * The ARN of the IAM role used for transit encryption to the router input using AWS Secrets Manager.
         * @pattern ^arn:(aws[a-zA-Z-]*):iam::[0-9]{12}:role/[a-zA-Z0-9_+=,.@-]+$
         */
        RoleArn: string;
      };
    } | {
      Automatic: Record<string, unknown>;
    };
  };
};
