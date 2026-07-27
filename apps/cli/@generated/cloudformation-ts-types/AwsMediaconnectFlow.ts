// This file is auto-generated. Do not edit manually.
// Source: aws-mediaconnect-flow.json

/** Resource schema for AWS::MediaConnect::Flow */
export type AwsMediaconnectFlow = {
  /** The Amazon Resource Name (ARN), a unique identifier for any AWS resource, of the flow. */
  FlowArn?: string;
  /** The IP address from which video will be sent to output destinations. */
  EgressIp?: string;
  /** The name of the flow. */
  Name: string;
  /**
   * The Availability Zone that you want to create the flow in. These options are limited to the
   * Availability Zones within the current AWS.
   */
  AvailabilityZone?: string;
  /**
   * The Availability Zone that you want to create the flow in. These options are limited to the
   * Availability Zones within the current AWS.(ReadOnly)
   */
  FlowAvailabilityZone?: string;
  /** The source of the flow. */
  Source: {
    /** The ARN of the source. */
    SourceArn?: string;
    /** The type of decryption that is used on the content ingested from this source. */
    Decryption?: {
      /**
       * The type of algorithm that is used for the encryption (such as aes128, aes192, or aes256).
       * @enum ["aes128","aes192","aes256"]
       */
      Algorithm?: "aes128" | "aes192" | "aes256";
      /**
       * A 128-bit, 16-byte hex value represented by a 32-character string, to be used with the key for
       * encrypting content. This parameter is not valid for static key encryption.
       */
      ConstantInitializationVector?: string;
      /**
       * The value of one of the devices that you configured with your digital rights management (DRM)
       * platform key provider. This parameter is required for SPEKE encryption and is not valid for static
       * key encryption.
       */
      DeviceId?: string;
      /**
       * The type of key that is used for the encryption. If no keyType is provided, the service will use
       * the default setting (static-key).
       * @default "static-key"
       * @enum ["speke","static-key","srt-password"]
       */
      KeyType?: "speke" | "static-key" | "srt-password";
      /**
       * The AWS Region that the API Gateway proxy endpoint was created in. This parameter is required for
       * SPEKE encryption and is not valid for static key encryption.
       */
      Region?: string;
      /**
       * An identifier for the content. The service sends this value to the key server to identify the
       * current endpoint. The resource ID is also known as the content ID. This parameter is required for
       * SPEKE encryption and is not valid for static key encryption.
       */
      ResourceId?: string;
      /**
       * The ARN of the role that you created during setup (when you set up AWS Elemental MediaConnect as a
       * trusted entity).
       */
      RoleArn: string;
      /**
       * The ARN of the secret that you created in AWS Secrets Manager to store the encryption key. This
       * parameter is required for static key encryption and is not valid for SPEKE encryption.
       */
      SecretArn?: string;
      /**
       * The URL from the API Gateway proxy that you set up to talk to your key server. This parameter is
       * required for SPEKE encryption and is not valid for static key encryption.
       */
      Url?: string;
    };
    /**
     * A description for the source. This value is not used or seen outside of the current AWS Elemental
     * MediaConnect account.
     */
    Description?: string;
    /**
     * The ARN of the entitlement that allows you to subscribe to content that comes from another AWS
     * account. The entitlement is set by the content originator and the ARN is generated as part of the
     * originator's flow.
     */
    EntitlementArn?: string;
    /** The source configuration for cloud flows receiving a stream from a bridge. */
    GatewayBridgeSource?: {
      /** The ARN of the bridge feeding this flow. */
      BridgeArn: string;
      /** The name of the VPC interface attachment to use for this bridge source. */
      VpcInterfaceAttachment?: {
        /** The name of the VPC interface to use for this resource. */
        VpcInterfaceName?: string;
      };
    };
    /** The IP address that the flow will be listening on for incoming content. */
    IngestIp?: string;
    /** The port that the flow will be listening on for incoming content. */
    IngestPort?: number;
    /** The smoothing max bitrate for RIST, RTP, and RTP-FEC streams. */
    MaxBitrate?: number;
    /**
     * The maximum latency in milliseconds. This parameter applies only to RIST-based and Zixi-based
     * streams.
     */
    MaxLatency?: number;
    /** The minimum latency in milliseconds. */
    MinLatency?: number;
    /** The name of the source. */
    Name?: string;
    /**
     * The protocol that is used by the source.
     * @enum ["zixi-push","rtp-fec","rtp","rist","fujitsu-qos","srt-listener","srt-caller","st2110-jpegxs","cdi"]
     */
    Protocol?: "zixi-push" | "rtp-fec" | "rtp" | "rist" | "fujitsu-qos" | "srt-listener" | "srt-caller" | "st2110-jpegxs" | "cdi";
    /**
     * The IP address that the flow communicates with to initiate connection with the sender for
     * fujitsu-qos protocol.
     */
    SenderIpAddress?: string;
    /**
     * The port that the flow uses to send outbound requests to initiate connection with the sender for
     * fujitsu-qos protocol.
     */
    SenderControlPort?: number;
    /**
     * The stream ID that you want to use for this transport. This parameter applies only to Zixi-based
     * streams.
     */
    StreamId?: string;
    /** The port that the flow will be listening on for incoming content.(ReadOnly) */
    SourceIngestPort?: string;
    /** Source IP or domain name for SRT-caller protocol. */
    SourceListenerAddress?: string;
    /** Source port for SRT-caller protocol. */
    SourceListenerPort?: number;
    /** The name of the VPC Interface this Source is configured with. */
    VpcInterfaceName?: string;
    /**
     * The range of IP addresses that should be allowed to contribute content to your source. These IP
     * addresses should be in the form of a Classless Inter-Domain Routing (CIDR) block; for example,
     * 10.0.0.0/16.
     */
    WhitelistCidr?: string;
    /** The size of the buffer (in milliseconds) to use to sync incoming source data. */
    MaxSyncBuffer?: number;
    /** The media stream that is associated with the source, and the parameters for that association. */
    MediaStreamSourceConfigurations?: ({
      /**
       * The format that was used to encode the data. For ancillary data streams, set the encoding name to
       * smpte291. For audio streams, set the encoding name to pcm. For video, 2110 streams, set the
       * encoding name to raw. For video, JPEG XS streams, set the encoding name to jxsv.
       * @enum ["jxsv","raw","smpte291","pcm"]
       */
      EncodingName: "jxsv" | "raw" | "smpte291" | "pcm";
      /** The media streams that you want to associate with the source. */
      InputConfigurations?: {
        /** The port that the flow listens on for an incoming media stream. */
        InputPort: number;
        /** The VPC interface where the media stream comes in from. */
        Interface: {
          /** The name of the VPC interface that you want to use for the media stream associated with the output. */
          Name: string;
        };
      }[];
      /** A name that helps you distinguish one media stream from another. */
      MediaStreamName: string;
    })[];
    /** @enum ["ENABLED","DISABLED"] */
    RouterIntegrationState?: "ENABLED" | "DISABLED";
    RouterIntegrationTransitDecryption?: {
      EncryptionKeyType?: "SECRETS_MANAGER" | "AUTOMATIC";
      EncryptionKeyConfiguration: {
        SecretsManager: {
          /**
           * The ARN of the AWS Secrets Manager secret used for transit encryption from the router output.
           * @pattern ^arn:(aws[a-zA-Z-]*):secretsmanager:[a-z0-9-]+:[0-9]{12}:secret:[a-zA-Z0-9/_+=.@-]+$
           */
          SecretArn: string;
          /**
           * The ARN of the IAM role used for transit encryption from the router output using AWS Secrets
           * Manager.
           * @pattern ^arn:(aws[a-zA-Z-]*):iam::[0-9]{12}:role/[a-zA-Z0-9_+=,.@-]+$
           */
          RoleArn: string;
        };
      } | {
        Automatic: Record<string, unknown>;
      };
    };
  };
  /** The source failover config of the flow. */
  SourceFailoverConfig?: {
    /** @enum ["ENABLED","DISABLED"] */
    State?: "ENABLED" | "DISABLED";
    /** Search window time to look for dash-7 packets */
    RecoveryWindow?: number;
    /**
     * The type of failover you choose for this flow. MERGE combines the source streams into a single
     * stream, allowing graceful recovery from any single-source loss. FAILOVER allows switching between
     * different streams.
     * @enum ["MERGE","FAILOVER"]
     */
    FailoverMode?: "MERGE" | "FAILOVER";
    /**
     * The priority you want to assign to a source. You can have a primary stream and a backup stream or
     * two equally prioritized streams.
     */
    SourcePriority?: {
      /** The name of the source you choose as the primary source for this flow. */
      PrimarySource: string;
    };
  };
  /** The VPC interfaces that you added to this flow. */
  VpcInterfaces?: ({
    /** Immutable and has to be a unique against other VpcInterfaces in this Flow. */
    Name: string;
    /**
     * The type of network adapter that you want MediaConnect to use on this interface. If you don't set
     * this value, it defaults to ENA.
     * @enum ["ena","efa"]
     */
    NetworkInterfaceType?: "ena" | "efa";
    /** Role Arn MediaConnect can assume to create ENIs in customer's account. */
    RoleArn: string;
    /** Security Group IDs to be used on ENI. */
    SecurityGroupIds: string[];
    /** Subnet must be in the AZ of the Flow */
    SubnetId: string;
    /** IDs of the network interfaces created in customer's account by MediaConnect. */
    NetworkInterfaceIds?: string[];
  })[];
  /**
   * The media streams associated with the flow. You can associate any of these media streams with
   * sources and outputs on the flow.
   */
  MediaStreams?: ({
    /** A unique identifier for the media stream. */
    MediaStreamId: number;
    /**
     * The type of media stream.
     * @enum ["video","audio","ancillary-data"]
     */
    MediaStreamType: "video" | "audio" | "ancillary-data";
    /**
     * The resolution of the video.
     * @enum ["2160p","1080p","1080i","720p","480p"]
     */
    VideoFormat?: "2160p" | "1080p" | "1080i" | "720p" | "480p";
    /** A name that helps you distinguish one media stream from another. */
    MediaStreamName: string;
    /** A description that can help you quickly identify what your media stream is used for. */
    Description?: string;
    /** Attributes that are related to the media stream. */
    Attributes?: {
      /** A set of parameters that define the media stream. */
      Fmtp?: {
        /** The frame rate for the video stream, in frames/second. For example: 60000/1001. */
        ExactFramerate?: string;
        /**
         * The format used for the representation of color.
         * @enum ["BT601","BT709","BT2020","BT2100","ST2065-1","ST2065-3","XYZ"]
         */
        Colorimetry?: "BT601" | "BT709" | "BT2020" | "BT2100" | "ST2065-1" | "ST2065-3" | "XYZ";
        /**
         * The type of compression that was used to smooth the video's appearance.
         * @enum ["progressive","interlace","progressive-segmented-frame"]
         */
        ScanMode?: "progressive" | "interlace" | "progressive-segmented-frame";
        /**
         * The transfer characteristic system (TCS) that is used in the video.
         * @enum ["SDR","PQ","HLG","LINEAR","BT2100LINPQ","BT2100LINHLG","ST2065-1","ST428-1","DENSITY"]
         */
        Tcs?: "SDR" | "PQ" | "HLG" | "LINEAR" | "BT2100LINPQ" | "BT2100LINHLG" | "ST2065-1" | "ST428-1" | "DENSITY";
        /**
         * The encoding range of the video.
         * @enum ["NARROW","FULL","FULLPROTECT"]
         */
        Range?: "NARROW" | "FULL" | "FULLPROTECT";
        /** The pixel aspect ratio (PAR) of the video. */
        Par?: string;
        /** The format of the audio channel. */
        ChannelOrder?: string;
      };
      /** The audio language, in a format that is recognized by the receiver. */
      Lang?: string;
    };
    /** The sample rate for the stream. This value in measured in kHz. */
    ClockRate?: number;
    /**
     * The format type number (sometimes referred to as RTP payload type) of the media stream.
     * MediaConnect assigns this value to the media stream. For ST 2110 JPEG XS outputs, you need to
     * provide this value to the receiver.
     */
    Fmt?: number;
  })[];
  /** The maintenance settings you want to use for the flow. */
  Maintenance?: {
    /**
     * A day of a week when the maintenance will happen. Use
     * Monday/Tuesday/Wednesday/Thursday/Friday/Saturday/Sunday.
     * @enum ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
     */
    MaintenanceDay: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
    /**
     * UTC time when the maintenance will happen. Use 24-hour HH:MM format. Minutes must be 00. Example:
     * 13:00. The default value is 02:00.
     */
    MaintenanceStartHour: string;
  };
  /** The source monitoring config of the flow. */
  SourceMonitoringConfig?: {
    /**
     * The state of thumbnail monitoring.
     * @enum ["ENABLED","DISABLED"]
     */
    ThumbnailState?: "ENABLED" | "DISABLED";
    /**
     * Indicates whether content quality analysis is enabled or disabled.
     * @enum ["ENABLED","DISABLED"]
     */
    ContentQualityAnalysisState?: "ENABLED" | "DISABLED";
    /** Contains the settings for audio stream metrics monitoring. */
    AudioMonitoringSettings?: ({
      SilentAudio?: {
        /**
         * Indicates whether the SilentAudio metric is enabled or disabled.
         * @enum ["ENABLED","DISABLED"]
         */
        State?: "ENABLED" | "DISABLED";
        /** Specifies the number of consecutive seconds of silence that triggers an event or alert. */
        ThresholdSeconds?: number;
      };
    })[];
    /** Contains the settings for video stream metrics monitoring. */
    VideoMonitoringSettings?: ({
      BlackFrames?: {
        /**
         * Indicates whether the BlackFrames metric is enabled or disabled.
         * @enum ["ENABLED","DISABLED"]
         */
        State?: "ENABLED" | "DISABLED";
        /** Specifies the number of consecutive seconds of black frames that triggers an event or alert. */
        ThresholdSeconds?: number;
      };
      FrozenFrames?: {
        /**
         * Indicates whether the FrozenFrames metric is enabled or disabled.
         * @enum ["ENABLED","DISABLED"]
         */
        State?: "ENABLED" | "DISABLED";
        /** Specifies the number of consecutive seconds of a static image that triggers an event or alert. */
        ThresholdSeconds?: number;
      };
    })[];
  };
  /**
   * Determines the processing capacity and feature set of the flow. Set this optional parameter to
   * LARGE if you want to enable NDI outputs on the flow.
   * @enum ["MEDIUM","LARGE"]
   */
  FlowSize?: "MEDIUM" | "LARGE";
  /** Specifies the configuration settings for NDI outputs. Required when the flow includes NDI outputs. */
  NdiConfig?: {
    /**
     * A list of up to three NDI discovery server configurations. While not required by the API, this
     * configuration is necessary for NDI functionality to work properly.
     */
    NdiDiscoveryServers?: {
      /** The identifier for the Virtual Private Cloud (VPC) network interface used by the flow. */
      VpcInterfaceAdapter: string;
      /** The unique network address of the NDI discovery server. */
      DiscoveryServerAddress: string;
      /** The port for the NDI discovery server. Defaults to 5959 if a custom port isn't specified. */
      DiscoveryServerPort?: number;
    }[];
    /**
     * A setting that controls whether NDI outputs can be used in the flow. Must be ENABLED to add NDI
     * outputs. Default is DISABLED.
     * @enum ["ENABLED","DISABLED"]
     */
    NdiState?: "ENABLED" | "DISABLED";
    /**
     * A prefix for the names of the NDI sources that the flow creates. If a custom name isn't specified,
     * MediaConnect generates a unique 12-character ID as the prefix.
     */
    MachineName?: string;
  };
  /** A prefix for the names of the NDI sources that the flow creates.(ReadOnly) */
  FlowNdiMachineName?: string;
};
