// This file is auto-generated. Do not edit manually.
// Source: aws-ivs-recordingconfiguration.json

/** Resource Type definition for AWS::IVS::RecordingConfiguration */
export type AwsIvsRecordingconfiguration = {
  /**
   * Recording Configuration ARN is automatically generated on creation and assigned as the unique
   * identifier.
   * @minLength 0
   * @maxLength 128
   * @pattern ^arn:aws[-a-z]*:ivs:[a-z0-9-]+:[0-9]+:recording-configuration/[a-zA-Z0-9-]+$
   */
  Arn?: string;
  /**
   * Recording Configuration Name.
   * @minLength 0
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-_]*$
   */
  Name?: string;
  /**
   * Recording Configuration State.
   * @enum ["CREATING","CREATE_FAILED","ACTIVE"]
   */
  State?: "CREATING" | "CREATE_FAILED" | "ACTIVE";
  /**
   * Recording Reconnect Window Seconds. (0 means disabled)
   * @default 0
   * @minimum 0
   * @maximum 300
   */
  RecordingReconnectWindowSeconds?: number;
  DestinationConfiguration: {
    S3?: {
      /**
       * @minLength 3
       * @maxLength 63
       * @pattern ^[a-z0-9-.]+$
       */
      BucketName: string;
    };
  };
  /**
   * A list of key-value pairs that contain metadata for the asset model.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  ThumbnailConfiguration?: {
    /**
     * Thumbnail Recording Mode, which determines whether thumbnails are recorded at an interval or are
     * disabled.
     * @default "INTERVAL"
     * @enum ["INTERVAL","DISABLED"]
     */
    RecordingMode?: "INTERVAL" | "DISABLED";
    /**
     * Target Interval Seconds defines the interval at which thumbnails are recorded. This field is
     * required if RecordingMode is INTERVAL.
     * @default 60
     * @minimum 1
     * @maximum 60
     */
    TargetIntervalSeconds?: number;
    /**
     * Resolution indicates the desired resolution of recorded thumbnails.
     * @enum ["FULL_HD","HD","SD","LOWEST_RESOLUTION"]
     */
    Resolution?: "FULL_HD" | "HD" | "SD" | "LOWEST_RESOLUTION";
    /**
     * Storage indicates the format in which thumbnails are recorded.
     * @minItems 0
     * @maxItems 2
     * @uniqueItems true
     */
    Storage?: ("SEQUENTIAL" | "LATEST")[];
  };
  RenditionConfiguration?: {
    /**
     * Resolution Selection indicates which set of renditions are recorded for a stream.
     * @default "ALL"
     * @enum ["ALL","NONE","CUSTOM"]
     */
    RenditionSelection?: "ALL" | "NONE" | "CUSTOM";
    /**
     * Renditions indicates which renditions are recorded for a stream.
     * @minItems 0
     * @maxItems 4
     * @uniqueItems true
     */
    Renditions?: ("FULL_HD" | "HD" | "SD" | "LOWEST_RESOLUTION")[];
  };
};
