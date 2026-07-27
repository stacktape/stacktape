// This file is auto-generated. Do not edit manually.
// Source: aws-ivs-stage.json

/** Resource Type definition for AWS::IVS::Stage. */
export type AwsIvsStage = {
  /**
   * Stage ARN is automatically generated on creation and assigned as the unique identifier.
   * @minLength 0
   * @maxLength 128
   * @pattern ^arn:aws[-a-z]*:ivs:[a-z0-9-]+:[0-9]+:stage/[a-zA-Z0-9-]+$
   */
  Arn?: string;
  /**
   * Stage name
   * @minLength 0
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-_]*$
   */
  Name?: string;
  AutoParticipantRecordingConfiguration?: {
    /**
     * ARN of the StorageConfiguration resource to use for individual participant recording.
     * @minLength 0
     * @maxLength 128
     * @pattern ^$|^arn:aws:ivs:[a-z0-9-]+:[0-9]+:storage-configuration/[a-zA-Z0-9-]+$
     */
    StorageConfigurationArn: string;
    /**
     * Types of media to be recorded. Default: AUDIO_VIDEO.
     * @default ["AUDIO_VIDEO"]
     * @minItems 0
     * @maxItems 1
     * @uniqueItems true
     */
    MediaTypes?: ("AUDIO_VIDEO" | "AUDIO_ONLY")[];
    HlsConfiguration?: {
      ParticipantRecordingHlsConfiguration?: {
        /**
         * Defines the target duration for recorded segments generated when recording a stage participant.
         * Segments may have durations longer than the specified value when needed to ensure each segment
         * begins with a keyframe. Default: 6.
         * @default 6
         * @minimum 2
         * @maximum 10
         */
        TargetSegmentDurationSeconds?: number;
      };
    };
    /**
     * If a stage publisher disconnects and then reconnects within the specified interval, the multiple
     * recordings will be considered a single recording and merged together. The default value is 0, which
     * disables merging.
     * @default 0
     * @minimum 0
     * @maximum 300
     */
    RecordingReconnectWindowSeconds?: number;
    ThumbnailConfiguration?: {
      /**
       * An object representing a configuration of thumbnails for recorded video from an individual
       * participant.
       */
      ParticipantThumbnailConfiguration?: {
        /**
         * Thumbnail recording mode. Default: DISABLED.
         * @default "DISABLED"
         * @enum ["INTERVAL","DISABLED"]
         */
        RecordingMode?: "INTERVAL" | "DISABLED";
        /**
         * Indicates the format in which thumbnails are recorded. SEQUENTIAL records all generated thumbnails
         * in a serial manner, to the media/thumbnails/high directory. LATEST saves the latest thumbnail in
         * media/latest_thumbnail/high/thumb.jpg and overwrites it at the interval specified by
         * targetIntervalSeconds. You can enable both SEQUENTIAL and LATEST. Default: SEQUENTIAL.
         * @default ["SEQUENTIAL"]
         * @minItems 0
         * @maxItems 2
         * @uniqueItems true
         */
        Storage?: ("SEQUENTIAL" | "LATEST")[];
        /**
         * The targeted thumbnail-generation interval in seconds. This is configurable only if recordingMode
         * is INTERVAL. Default: 60.
         * @default 60
         * @minimum 1
         * @maximum 86400
         */
        TargetIntervalSeconds?: number;
      };
    };
  };
  /**
   * An array of key-value pairs to apply to this resource.
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
  /**
   * ID of the active session within the stage.
   * @minLength 0
   * @maxLength 128
   */
  ActiveSessionId?: string;
};
