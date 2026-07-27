// This file is auto-generated. Do not edit manually.
// Source: aws-mediatailor-playbackconfiguration.json

/** Resource schema for AWS::MediaTailor::PlaybackConfiguration */
export type AwsMediatailorPlaybackconfiguration = {
  AdConditioningConfiguration?: {
    StreamingMediaFileConditioning: "TRANSCODE" | "NONE";
  };
  /**
   * The URL for the ad decision server (ADS). This includes the specification of static parameters and
   * placeholders for dynamic parameters. AWS Elemental MediaTailor substitutes player-specific and
   * session-specific parameters as needed when calling the ADS. Alternately, for testing you can
   * provide a static VAST URL. The maximum length is 25,000 characters.
   */
  AdDecisionServerUrl: string;
  /**
   * The configuration for avail suppression, also known as ad suppression. For more information about
   * ad suppression, see Ad Suppression
   * (https://docs.aws.amazon.com/mediatailor/latest/ug/ad-behavior.html).
   */
  AvailSuppression?: {
    /**
     * Sets the ad suppression mode. By default, ad suppression is off and all ad breaks are filled with
     * ads or slate. When Mode is set to BEHIND_LIVE_EDGE, ad suppression is active and MediaTailor won't
     * fill ad breaks on or behind the ad suppression Value time in the manifest lookback window. When
     * Mode is set to AFTER_LIVE_EDGE, ad suppression is active and MediaTailor won't fill ad breaks that
     * are within the live edge plus the avail suppression value.
     * @enum ["OFF","BEHIND_LIVE_EDGE","AFTER_LIVE_EDGE"]
     */
    Mode?: "OFF" | "BEHIND_LIVE_EDGE" | "AFTER_LIVE_EDGE";
    /**
     * A live edge offset time in HH:MM:SS. MediaTailor won't fill ad breaks on or behind this time in the
     * manifest lookback window. If Value is set to 00:00:00, it is in sync with the live edge, and
     * MediaTailor won't fill any ad breaks on or behind the live edge. If you set a Value time,
     * MediaTailor won't fill any ad breaks on or behind this time in the manifest lookback window. For
     * example, if you set 00:45:00, then MediaTailor will fill ad breaks that occur within 45 minutes
     * behind the live edge, but won't fill ad breaks on or behind 45 minutes behind the live edge.
     */
    Value?: string;
    /**
     * Defines the policy to apply to the avail suppression mode. BEHIND_LIVE_EDGE will always use the
     * full avail suppression policy. AFTER_LIVE_EDGE mode can be used to invoke partial ad break fills
     * when a session starts mid-break. Valid values are FULL_AVAIL_ONLY and PARTIAL_AVAIL
     * @enum ["PARTIAL_AVAIL","FULL_AVAIL_ONLY"]
     */
    FillPolicy?: "PARTIAL_AVAIL" | "FULL_AVAIL_ONLY";
  };
  /**
   * The configuration for bumpers. Bumpers are short audio or video clips that play at the start or
   * before the end of an ad break. To learn more about bumpers, see Bumpers
   * (https://docs.aws.amazon.com/mediatailor/latest/ug/bumpers.html).
   */
  Bumper?: {
    /** The URL for the start bumper asset. */
    StartUrl?: string;
    /** The URL for the end bumper asset. */
    EndUrl?: string;
  };
  /**
   * The configuration for using a content delivery network (CDN), like Amazon CloudFront, for content
   * and ad segment management.
   */
  CdnConfiguration?: {
    /**
     * A non-default content delivery network (CDN) to serve ad segments. By default, AWS Elemental
     * MediaTailor uses Amazon CloudFront with default cache settings as its CDN for ad segments. To set
     * up an alternate CDN, create a rule in your CDN for the origin
     * ads.mediatailor.&lt;region>.amazonaws.com. Then specify the rule's name in this AdSegmentUrlPrefix.
     * When AWS Elemental MediaTailor serves a manifest, it reports your CDN as the source for ad
     * segments.
     */
    AdSegmentUrlPrefix?: string;
    /**
     * A content delivery network (CDN) to cache content segments, so that content requests don't always
     * have to go to the origin server. First, create a rule in your CDN for the content segment origin
     * server. Then specify the rule's name in this ContentSegmentUrlPrefix. When AWS Elemental
     * MediaTailor serves a manifest, it reports your CDN as the source for content segments.
     */
    ContentSegmentUrlPrefix?: string;
  };
  /**
   * The player parameters and aliases used as dynamic variables during session initialization. For more
   * information, see Domain Variables.
   */
  ConfigurationAliases?: unknown;
  /** The configuration for DASH content. */
  DashConfiguration?: {
    /**
     * The setting that controls whether MediaTailor includes the Location tag in DASH manifests.
     * MediaTailor populates the Location tag with the URL for manifest update requests, to be used by
     * players that don't support sticky redirects. Disable this if you have CDN routing rules set up for
     * accessing MediaTailor manifests, and you are either using client-side reporting or your players
     * support sticky HTTP redirects. Valid values are DISABLED and EMT_DEFAULT. The EMT_DEFAULT setting
     * enables the inclusion of the tag and is the default value.
     */
    MpdLocation?: string;
    /**
     * The setting that controls whether MediaTailor handles manifests from the origin server as
     * multi-period manifests or single-period manifests. If your origin server produces single-period
     * manifests, set this to SINGLE_PERIOD. The default setting is MULTI_PERIOD. For multi-period
     * manifests, omit this setting or set it to MULTI_PERIOD.
     * @enum ["SINGLE_PERIOD","MULTI_PERIOD"]
     */
    OriginManifestType?: "SINGLE_PERIOD" | "MULTI_PERIOD";
    /**
     * The URL generated by MediaTailor to initiate a DASH playback session. The session uses server-side
     * reporting.
     */
    ManifestEndpointPrefix?: string;
  };
  /**
   * The setting that controls whether players can use stitched or guided ad insertion. The default,
   * STITCHED_ONLY, forces all player sessions to use stitched (server-side) ad insertion. Choosing
   * PLAYER_SELECT allows players to select either stitched or guided ad insertion at
   * session-initialization time. The default for players that do not specify an insertion mode is
   * stitched.
   */
  InsertionMode?: "STITCHED_ONLY" | "PLAYER_SELECT";
  /** The configuration for pre-roll ad insertion. */
  LivePreRollConfiguration?: {
    /**
     * The URL for the ad decision server (ADS) for pre-roll ads. This includes the specification of
     * static parameters and placeholders for dynamic parameters. AWS Elemental MediaTailor substitutes
     * player-specific and session-specific parameters as needed when calling the ADS. Alternately, for
     * testing, you can provide a static VAST URL. The maximum length is 25,000 characters.
     */
    AdDecisionServerUrl?: string;
    /**
     * The maximum allowed duration for the pre-roll ad avail. AWS Elemental MediaTailor won't play
     * pre-roll ads to exceed this duration, regardless of the total duration of ads that the ADS returns.
     */
    MaxDurationSeconds?: number;
  };
  /**
   * The configuration for manifest processing rules. Manifest processing rules enable customization of
   * the personalized manifests created by MediaTailor.
   */
  ManifestProcessingRules?: {
    /**
     * For HLS, when set to true, MediaTailor passes through EXT-X-CUE-IN, EXT-X-CUE-OUT, and
     * EXT-X-SPLICEPOINT-SCTE35 ad markers from the origin manifest to the MediaTailor personalized
     * manifest. No logic is applied to these ad markers. For example, if EXT-X-CUE-OUT has a value of 60,
     * but no ads are filled for that ad break, MediaTailor will not set the value to 0.
     */
    AdMarkerPassthrough?: {
      /** Enables ad marker passthrough for your configuration. */
      Enabled?: boolean;
    };
  };
  /**
   * The identifier for the playback configuration.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  Name: string;
  /**
   * Defines the maximum duration of underfilled ad time (in seconds) allowed in an ad break. If the
   * duration of underfilled ad time exceeds the personalization threshold, then the personalization of
   * the ad break is abandoned and the underlying content is shown. This feature applies to ad
   * replacement in live and VOD streams, rather than ad insertion, because it relies on an underlying
   * content stream. For more information about ad break behavior, including ad replacement and
   * insertion, see Ad Behavior in AWS Elemental MediaTailor
   * (https://docs.aws.amazon.com/mediatailor/latest/ug/ad-behavior.html).
   */
  PersonalizationThresholdSeconds?: number;
  /** The URL that the player uses to initialize a session that uses client-side reporting. */
  SessionInitializationEndpointPrefix?: string;
  /** The configuration for HLS content. */
  HlsConfiguration?: {
    /**
     * The URL that is used to initiate a playback session for devices that support Apple HLS. The session
     * uses server-side reporting.
     */
    ManifestEndpointPrefix?: string;
  };
  /**
   * The configuration that defines where AWS Elemental MediaTailor sends logs for the playback
   * configuration.
   */
  LogConfiguration?: {
    /** The event types that MediaTailor emits in logs for interactions with the ADS. */
    AdsInteractionLog?: {
      /**
       * Indicates that MediaTailor won't emit the selected events in the logs for playback sessions that
       * are initialized with this configuration.
       */
      ExcludeEventTypes?: string[];
      /**
       * Indicates that MediaTailor emits RAW_ADS_RESPONSE logs for playback sessions that are initialized
       * with this configuration.
       */
      PublishOptInEventTypes?: string[];
    };
    /**
     * The method used for collecting logs from AWS Elemental MediaTailor. To configure MediaTailor to
     * send logs directly to Amazon CloudWatch Logs, choose LEGACY_CLOUDWATCH. To configure MediaTailor to
     * send logs to CloudWatch, which then vends the logs to your destination of choice, choose
     * VENDED_LOGS. Supported destinations are CloudWatch Logs log group, Amazon S3 bucket, and Amazon
     * Data Firehose stream. To use vended logs, you must configure the delivery destination in Amazon
     * CloudWatch
     */
    EnabledLoggingStrategies?: string[];
    /** The event types that MediaTailor emits in logs for interactions with the origin server. */
    ManifestServiceInteractionLog?: {
      /**
       * Indicates that MediaTailor won't emit the selected events in the logs for playback sessions that
       * are initialized with this configuration.
       */
      ExcludeEventTypes?: string[];
    };
    /**
     * The percentage of session logs that MediaTailor sends to your CloudWatch Logs account. For example,
     * if your playback configuration has 1000 sessions and percentEnabled is set to 60, MediaTailor sends
     * logs for 600 of the sessions to CloudWatch Logs. MediaTailor decides at random which of the
     * playback configuration sessions to send logs for. If you want to view logs for a specific session,
     * you can use the debug log mode.
     * @minimum 0
     * @maximum 100
     */
    PercentEnabled: number;
  };
  /** The Amazon Resource Name (ARN) for the playback configuration. */
  PlaybackConfigurationArn?: string;
  /**
   * The URL that the player accesses to get a manifest from MediaTailor. This session will use
   * server-side reporting.
   */
  PlaybackEndpointPrefix?: string;
  /**
   * The URL for a high-quality video asset to transcode and use to fill in time that's not used by ads.
   * AWS Elemental MediaTailor shows the slate to fill in gaps in media content. Configuring the slate
   * is optional for non-VPAID configurations. For VPAID, the slate is required because MediaTailor
   * provides it in the slots that are designated for dynamic ad content. The slate must be a
   * high-quality asset that contains both audio and video.
   */
  SlateAdUrl?: string;
  /**
   * The tags to assign to the playback configuration.
   * @uniqueItems true
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  /**
   * The name that is used to associate this playback configuration with a custom transcode profile.
   * This overrides the dynamic transcoding defaults of MediaTailor. Use this only if you have already
   * set up custom profiles with the help of AWS Support.
   */
  TranscodeProfileName?: string;
  /**
   * The URL prefix for the parent manifest for the stream, minus the asset ID. The maximum length is
   * 512 characters.
   */
  VideoContentSourceUrl: string;
};
