// This file is auto-generated. Do not edit manually.
// Source: aws-mediatailor-channel.json

/** Definition of AWS::MediaTailor::Channel Resource Type */
export type AwsMediatailorChannel = {
  /** <p>The ARN of the channel.</p> */
  Arn?: string;
  /** <p>The list of audiences defined in channel.</p> */
  Audiences?: string[];
  ChannelName: string;
  FillerSlate?: {
    /** <p>The name of the source location where the slate VOD source is stored.</p> */
    SourceLocationName?: string;
    /**
     * <p>The slate VOD source name. The VOD source must already exist in a source location before it can
     * be used for slate.</p>
     */
    VodSourceName?: string;
  };
  LogConfiguration?: {
    /** <p>The log types.</p> */
    LogTypes?: "AS_RUN"[];
  };
  /** <p>The channel's output properties.</p> */
  Outputs: ({
    DashPlaylistSettings?: {
      /**
       * <p>The total duration (in seconds) of each manifest. Minimum value: <code>30</code> seconds.
       * Maximum value: <code>3600</code> seconds.</p>
       */
      ManifestWindowSeconds?: number;
      /**
       * <p>Minimum amount of content (measured in seconds) that a player must keep available in the buffer.
       * Minimum value: <code>2</code> seconds. Maximum value: <code>60</code> seconds.</p>
       */
      MinBufferTimeSeconds?: number;
      /**
       * <p>Minimum amount of time (in seconds) that the player should wait before requesting updates to the
       * manifest. Minimum value: <code>2</code> seconds. Maximum value: <code>60</code> seconds.</p>
       */
      MinUpdatePeriodSeconds?: number;
      /**
       * <p>Amount of time (in seconds) that the player should be from the live point at the end of the
       * manifest. Minimum value: <code>2</code> seconds. Maximum value: <code>60</code> seconds.</p>
       */
      SuggestedPresentationDelaySeconds?: number;
    };
    HlsPlaylistSettings?: {
      /**
       * <p>The total duration (in seconds) of each manifest. Minimum value: <code>30</code> seconds.
       * Maximum value: <code>3600</code> seconds.</p>
       */
      ManifestWindowSeconds?: number;
      /**
       * <p>Determines the type of SCTE 35 tags to use in ad markup. Specify <code>DATERANGE</code> to use
       * <code>DATERANGE</code> tags (for live or VOD content). Specify <code>SCTE35_ENHANCED</code> to use
       * <code>EXT-X-CUE-OUT</code> and <code>EXT-X-CUE-IN</code> tags (for VOD content only).</p>
       */
      AdMarkupType?: ("DATERANGE" | "SCTE35_ENHANCED")[];
    };
    /** <p>The name of the manifest for the channel. The name appears in the <code>PlaybackUrl</code>.</p> */
    ManifestName: string;
    /**
     * <p>A string used to match which <code>HttpPackageConfiguration</code> is used for each
     * <code>VodSource</code>.</p>
     */
    SourceGroup: string;
  })[];
  PlaybackMode: "LOOP" | "LINEAR";
  /**
   * The tags to assign to the channel.
   * @uniqueItems true
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  Tier?: "BASIC" | "STANDARD";
  TimeShiftConfiguration?: {
    /**
     * <p>The maximum time delay for time-shifted viewing. The minimum allowed maximum time delay is 0
     * seconds, and the maximum allowed maximum time delay is 21600 seconds (6 hours).</p>
     */
    MaxTimeDelaySeconds: number;
  };
};
