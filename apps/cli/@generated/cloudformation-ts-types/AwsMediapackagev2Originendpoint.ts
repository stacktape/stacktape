// This file is auto-generated. Do not edit manually.
// Source: aws-mediapackagev2-originendpoint.json

/**
 * <p>Represents an origin endpoint that is associated with a channel, offering a dynamically
 * repackaged version of its content through various streaming media protocols. The content can be
 * efficiently disseminated to end-users via a Content Delivery Network (CDN), like Amazon
 * CloudFront.</p>
 */
export type AwsMediapackagev2Originendpoint = {
  /** <p>The Amazon Resource Name (ARN) associated with the resource.</p> */
  Arn?: string;
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  ChannelGroupName: string;
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  ChannelName: string;
  ContainerType: "TS" | "CMAF" | "ISM";
  /** <p>The date and time the origin endpoint was created.</p> */
  CreatedAt?: string;
  /** <p>A DASH manifest configuration.</p> */
  DashManifests?: ({
    /**
     * <p>A short string that's appended to the endpoint URL. The manifest name creates a unique path to
     * this endpoint. If you don't enter a value, MediaPackage uses the default manifest name, index. </p>
     * @minLength 1
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9_-]+$
     */
    ManifestName: string;
    /** <p>The total duration (in seconds) of the manifest's content.</p> */
    ManifestWindowSeconds?: number;
    FilterConfiguration?: {
      /**
       * <p>Optionally specify one or more manifest filters for all of your manifest egress requests. When
       * you include a manifest filter, note that you cannot use an identical manifest filter query
       * parameter for this manifest's endpoint URL.</p>
       * @minLength 1
       * @maxLength 1024
       */
      ManifestFilter?: string;
      /**
       * <p>Optionally specify the start time for all of your manifest egress requests. When you include
       * start time, note that you cannot use start time query parameters for this manifest's endpoint
       * URL.</p>
       */
      Start?: string;
      /**
       * <p>Optionally specify the end time for all of your manifest egress requests. When you include end
       * time, note that you cannot use end time query parameters for this manifest's endpoint URL.</p>
       */
      End?: string;
      /**
       * <p>Optionally specify the time delay for all of your manifest egress requests. Enter a value that
       * is smaller than your endpoint's startover window. When you include time delay, note that you cannot
       * use time delay query parameters for this manifest's endpoint URL.</p>
       * @minimum 0
       * @maximum 1209600
       */
      TimeDelaySeconds?: number;
      /**
       * <p>Optionally specify the clip start time for all of your manifest egress requests. When you
       * include clip start time, note that you cannot use clip start time query parameters for this
       * manifest's endpoint URL.</p>
       */
      ClipStartTime?: string;
    };
    /**
     * <p>Minimum amount of time (in seconds) that the player should wait before requesting updates to the
     * manifest.</p>
     */
    MinUpdatePeriodSeconds?: number;
    /** <p>Minimum amount of content (in seconds) that a player must keep available in the buffer.</p> */
    MinBufferTimeSeconds?: number;
    /** <p>The amount of time (in seconds) that the player should be from the end of the manifest.</p> */
    SuggestedPresentationDelaySeconds?: number;
    SegmentTemplateFormat?: "NUMBER_WITH_TIMELINE";
    /**
     * <p>A list of triggers that controls when AWS Elemental MediaPackage separates the MPEG-DASH
     * manifest into multiple periods. Leave this value empty to indicate that the manifest is contained
     * all in one period. For more information about periods in the DASH manifest, see <a
     * href="https://docs.aws.amazon.com/mediapackage/latest/userguide/multi-period.html">Multi-period
     * DASH in AWS Elemental MediaPackage</a>.</p>
     * @minItems 0
     * @maxItems 100
     */
    PeriodTriggers?: ("AVAILS" | "DRM_KEY_ROTATION" | "SOURCE_CHANGES" | "SOURCE_DISRUPTIONS" | "NONE")[];
    ScteDash?: {
      AdMarkerDash?: "BINARY" | "XML";
    };
    DrmSignaling?: "INDIVIDUAL" | "REFERENCED";
    UtcTiming?: {
      TimingMode?: "HTTP_HEAD" | "HTTP_ISO" | "HTTP_XSDATE" | "UTC_DIRECT";
      /**
       * <p>The the method that the player uses to synchronize to coordinated universal time (UTC) wall
       * clock time.</p>
       * @minLength 1
       * @maxLength 1024
       */
      TimingSource?: string;
    };
    /**
     * <p>The profile that the output is compliant with.</p>
     * @minItems 0
     * @maxItems 5
     */
    Profiles?: "DVB_DASH"[];
    /**
     * <p>The base URL to use for retrieving segments.</p>
     * @minItems 0
     * @maxItems 20
     */
    BaseUrls?: {
      /**
       * <p>A source location for segments.</p>
       * @minLength 1
       * @maxLength 2048
       */
      Url: string;
      /**
       * <p>The name of the source location.</p>
       * @minLength 1
       * @maxLength 2048
       */
      ServiceLocation?: string;
      /**
       * <p>For use with DVB-DASH profiles only. The priority of this location for servings segments. The
       * lower the number, the higher the priority.</p>
       * @minimum 1
       * @maximum 15000
       */
      DvbPriority?: number;
      /**
       * <p>For use with DVB-DASH profiles only. The weighting for source locations that have the same
       * priority. </p>
       * @minimum 1
       * @maximum 15000
       */
      DvbWeight?: number;
    }[];
    ProgramInformation?: {
      /**
       * <p>The title for the manifest.</p>
       * @minLength 1
       * @maxLength 2048
       */
      Title?: string;
      /**
       * <p>Information about the content provider.</p>
       * @minLength 1
       * @maxLength 2048
       */
      Source?: string;
      /**
       * <p>A copyright statement about the content.</p>
       * @minLength 1
       * @maxLength 2048
       */
      Copyright?: string;
      /**
       * <p>The language code for this manifest.</p>
       * @minLength 2
       * @maxLength 5
       * @pattern ^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$
       */
      LanguageCode?: string;
      /**
       * <p>An absolute URL that contains more information about this content.</p>
       * @minLength 1
       * @maxLength 2048
       */
      MoreInformationUrl?: string;
    };
    DvbSettings?: {
      FontDownload?: {
        /**
         * <p>The URL for downloading fonts for subtitles.</p>
         * @minLength 1
         * @maxLength 2048
         */
        Url?: string;
        /**
         * <p>The <code>mimeType</code> of the resource that's at the font download URL.</p> <p>For
         * information about font MIME types, see the <a
         * href="https://dvb.org/wp-content/uploads/2021/06/A168r4_MPEG-DASH-Profile-for-Transport-of-ISO-BMFF-Based-DVB-Services_Draft-ts_103-285-v140_November_2021.pdf">MPEG-DASH
         * Profile for Transport of ISO BMFF Based DVB Services over IP Based Networks</a> document. </p>
         * @minLength 1
         * @maxLength 256
         * @pattern ^[a-zA-Z0-9][a-zA-Z0-9_/-]*[a-zA-Z0-9]$
         */
        MimeType?: string;
        /**
         * <p>The <code>fontFamily</code> name for subtitles, as described in <a
         * href="https://tech.ebu.ch/publications/tech3380">EBU-TT-D Subtitling Distribution Format</a>. </p>
         * @minLength 1
         * @maxLength 256
         */
        FontFamily?: string;
      };
      /**
       * <p>Playback device error reporting settings.</p>
       * @minItems 0
       * @maxItems 20
       */
      ErrorMetrics?: {
        /**
         * <p>The URL where playback devices send error reports.</p>
         * @minLength 1
         * @maxLength 2048
         */
        ReportingUrl: string;
        /**
         * <p>The number of playback devices per 1000 that will send error reports to the reporting URL. This
         * represents the probability that a playback device will be a reporting player for this session.</p>
         * @minimum 1
         * @maximum 1000
         */
        Probability?: number;
      }[];
    };
    Compactness?: "STANDARD" | "NONE";
    SubtitleConfiguration?: {
      TtmlConfiguration?: {
        TtmlProfile: "IMSC_1" | "EBU_TT_D_101";
      };
    };
  })[];
  /**
   * <p>Enter any descriptive text that helps you to identify the origin endpoint.</p>
   * @minLength 0
   * @maxLength 1024
   */
  Description?: string;
  ForceEndpointErrorConfiguration?: {
    /**
     * <p>The failover conditions for the endpoint. The options are:</p> <ul> <li> <p>
     * <code>STALE_MANIFEST</code> - The manifest stalled and there are no new segments or parts.</p>
     * </li> <li> <p> <code>INCOMPLETE_MANIFEST</code> - There is a gap in the manifest.</p> </li> <li>
     * <p> <code>MISSING_DRM_KEY</code> - Key rotation is enabled but we're unable to fetch the key for
     * the current key period.</p> </li> <li> <p> <code>SLATE_INPUT</code> - The segments which contain
     * slate content are considered to be missing content.</p> </li> </ul>
     */
    EndpointErrorConditions?: ("STALE_MANIFEST" | "INCOMPLETE_MANIFEST" | "MISSING_DRM_KEY" | "SLATE_INPUT")[];
  };
  /** <p>An HTTP live streaming (HLS) manifest configuration.</p> */
  HlsManifests?: ({
    /**
     * <p>A short short string that's appended to the endpoint URL. The manifest name creates a unique
     * path to this endpoint. If you don't enter a value, MediaPackage uses the default manifest name,
     * index. MediaPackage automatically inserts the format extension, such as .m3u8. You can't use the
     * same manifest name if you use HLS manifest and low-latency HLS manifest. The manifestName on the
     * HLSManifest object overrides the manifestName you provided on the originEndpoint object.</p>
     * @minLength 1
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9_-]+$
     */
    ManifestName: string;
    /** <p>The egress domain URL for stream delivery from MediaPackage.</p> */
    Url?: string;
    /**
     * <p>A short string that's appended to the endpoint URL. The child manifest name creates a unique
     * path to this endpoint. If you don't enter a value, MediaPackage uses the default child manifest
     * name, index_1. The manifestName on the HLSManifest object overrides the manifestName you provided
     * on the originEndpoint object.</p>
     * @minLength 1
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9_-]+$
     */
    ChildManifestName?: string;
    /** <p>The total duration (in seconds) of the manifest's content.</p> */
    ManifestWindowSeconds?: number;
    /**
     * <p>Inserts EXT-X-PROGRAM-DATE-TIME tags in the output manifest at the interval that you specify. If
     * you don't enter an interval, EXT-X-PROGRAM-DATE-TIME tags aren't included in the manifest. The tags
     * sync the stream to the wall clock so that viewers can seek to a specific time in the playback
     * timeline on the player.</p> <p>Irrespective of this parameter, if any ID3Timed metadata is in the
     * HLS input, it is passed through to the HLS output.</p>
     */
    ProgramDateTimeIntervalSeconds?: number;
    ScteHls?: {
      AdMarkerHls?: "DATERANGE" | "SCTE35_ENHANCED";
    };
    FilterConfiguration?: {
      /**
       * <p>Optionally specify one or more manifest filters for all of your manifest egress requests. When
       * you include a manifest filter, note that you cannot use an identical manifest filter query
       * parameter for this manifest's endpoint URL.</p>
       * @minLength 1
       * @maxLength 1024
       */
      ManifestFilter?: string;
      /**
       * <p>Optionally specify the start time for all of your manifest egress requests. When you include
       * start time, note that you cannot use start time query parameters for this manifest's endpoint
       * URL.</p>
       */
      Start?: string;
      /**
       * <p>Optionally specify the end time for all of your manifest egress requests. When you include end
       * time, note that you cannot use end time query parameters for this manifest's endpoint URL.</p>
       */
      End?: string;
      /**
       * <p>Optionally specify the time delay for all of your manifest egress requests. Enter a value that
       * is smaller than your endpoint's startover window. When you include time delay, note that you cannot
       * use time delay query parameters for this manifest's endpoint URL.</p>
       * @minimum 0
       * @maximum 1209600
       */
      TimeDelaySeconds?: number;
      /**
       * <p>Optionally specify the clip start time for all of your manifest egress requests. When you
       * include clip start time, note that you cannot use clip start time query parameters for this
       * manifest's endpoint URL.</p>
       */
      ClipStartTime?: string;
    };
    StartTag?: {
      /**
       * <p>Specify the value for TIME-OFFSET within your EXT-X-START tag. Enter a signed floating point
       * value which, if positive, must be less than the configured manifest duration minus three times the
       * configured segment target duration. If negative, the absolute value must be larger than three times
       * the configured segment target duration, and the absolute value must be smaller than the configured
       * manifest duration.</p>
       */
      TimeOffset: number;
      /**
       * <p>Specify the value for PRECISE within your EXT-X-START tag. Leave blank, or choose false, to use
       * the default value NO. Choose yes to use the value YES.</p>
       */
      Precise?: boolean;
    };
    /**
     * <p>When enabled, MediaPackage URL-encodes the query string for API requests for HLS child manifests
     * to comply with Amazon Web Services Signature Version 4 (SigV4) signature signing protocol. For more
     * information, see <a
     * href="https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html">Amazon Web Services
     * Signature Version 4 for API requests</a> in <i>Identity and Access Management User Guide</i>.</p>
     */
    UrlEncodeChildManifest?: boolean;
  })[];
  /** <p>A low-latency HLS manifest configuration.</p> */
  LowLatencyHlsManifests?: ({
    /**
     * <p>A short short string that's appended to the endpoint URL. The manifest name creates a unique
     * path to this endpoint. If you don't enter a value, MediaPackage uses the default manifest name,
     * index. MediaPackage automatically inserts the format extension, such as .m3u8. You can't use the
     * same manifest name if you use HLS manifest and low-latency HLS manifest. The manifestName on the
     * HLSManifest object overrides the manifestName you provided on the originEndpoint object.</p>
     * @minLength 1
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9_-]+$
     */
    ManifestName: string;
    /** <p>The egress domain URL for stream delivery from MediaPackage.</p> */
    Url?: string;
    /**
     * <p>A short string that's appended to the endpoint URL. The child manifest name creates a unique
     * path to this endpoint. If you don't enter a value, MediaPackage uses the default child manifest
     * name, index_1. The manifestName on the HLSManifest object overrides the manifestName you provided
     * on the originEndpoint object.</p>
     * @minLength 1
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9_-]+$
     */
    ChildManifestName?: string;
    /** <p>The total duration (in seconds) of the manifest's content.</p> */
    ManifestWindowSeconds?: number;
    /**
     * <p>Inserts EXT-X-PROGRAM-DATE-TIME tags in the output manifest at the interval that you specify. If
     * you don't enter an interval, EXT-X-PROGRAM-DATE-TIME tags aren't included in the manifest. The tags
     * sync the stream to the wall clock so that viewers can seek to a specific time in the playback
     * timeline on the player.</p> <p>Irrespective of this parameter, if any ID3Timed metadata is in the
     * HLS input, it is passed through to the HLS output.</p>
     */
    ProgramDateTimeIntervalSeconds?: number;
    ScteHls?: {
      AdMarkerHls?: "DATERANGE" | "SCTE35_ENHANCED";
    };
    FilterConfiguration?: {
      /**
       * <p>Optionally specify one or more manifest filters for all of your manifest egress requests. When
       * you include a manifest filter, note that you cannot use an identical manifest filter query
       * parameter for this manifest's endpoint URL.</p>
       * @minLength 1
       * @maxLength 1024
       */
      ManifestFilter?: string;
      /**
       * <p>Optionally specify the start time for all of your manifest egress requests. When you include
       * start time, note that you cannot use start time query parameters for this manifest's endpoint
       * URL.</p>
       */
      Start?: string;
      /**
       * <p>Optionally specify the end time for all of your manifest egress requests. When you include end
       * time, note that you cannot use end time query parameters for this manifest's endpoint URL.</p>
       */
      End?: string;
      /**
       * <p>Optionally specify the time delay for all of your manifest egress requests. Enter a value that
       * is smaller than your endpoint's startover window. When you include time delay, note that you cannot
       * use time delay query parameters for this manifest's endpoint URL.</p>
       * @minimum 0
       * @maximum 1209600
       */
      TimeDelaySeconds?: number;
      /**
       * <p>Optionally specify the clip start time for all of your manifest egress requests. When you
       * include clip start time, note that you cannot use clip start time query parameters for this
       * manifest's endpoint URL.</p>
       */
      ClipStartTime?: string;
    };
    StartTag?: {
      /**
       * <p>Specify the value for TIME-OFFSET within your EXT-X-START tag. Enter a signed floating point
       * value which, if positive, must be less than the configured manifest duration minus three times the
       * configured segment target duration. If negative, the absolute value must be larger than three times
       * the configured segment target duration, and the absolute value must be smaller than the configured
       * manifest duration.</p>
       */
      TimeOffset: number;
      /**
       * <p>Specify the value for PRECISE within your EXT-X-START tag. Leave blank, or choose false, to use
       * the default value NO. Choose yes to use the value YES.</p>
       */
      Precise?: boolean;
    };
    /**
     * <p>When enabled, MediaPackage URL-encodes the query string for API requests for LL-HLS child
     * manifests to comply with Amazon Web Services Signature Version 4 (SigV4) signature signing
     * protocol. For more information, see <a
     * href="https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html">Amazon Web Services
     * Signature Version 4 for API requests</a> in <i>Identity and Access Management User Guide</i>.</p>
     */
    UrlEncodeChildManifest?: boolean;
  })[];
  /** <p>The date and time the origin endpoint was modified.</p> */
  ModifiedAt?: string;
  /**
   * <p>The Microsoft Smooth Streaming (MSS) manifest configurations associated with this origin
   * endpoint.</p>
   */
  MssManifests?: ({
    /**
     * <p>The name of the MSS manifest. This name is appended to the origin endpoint URL to create the
     * unique path for accessing this specific MSS manifest.</p>
     * @minLength 1
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9-]+$
     */
    ManifestName: string;
    FilterConfiguration?: {
      /**
       * <p>Optionally specify one or more manifest filters for all of your manifest egress requests. When
       * you include a manifest filter, note that you cannot use an identical manifest filter query
       * parameter for this manifest's endpoint URL.</p>
       * @minLength 1
       * @maxLength 1024
       */
      ManifestFilter?: string;
      /**
       * <p>Optionally specify the start time for all of your manifest egress requests. When you include
       * start time, note that you cannot use start time query parameters for this manifest's endpoint
       * URL.</p>
       */
      Start?: string;
      /**
       * <p>Optionally specify the end time for all of your manifest egress requests. When you include end
       * time, note that you cannot use end time query parameters for this manifest's endpoint URL.</p>
       */
      End?: string;
      /**
       * <p>Optionally specify the time delay for all of your manifest egress requests. Enter a value that
       * is smaller than your endpoint's startover window. When you include time delay, note that you cannot
       * use time delay query parameters for this manifest's endpoint URL.</p>
       * @minimum 0
       * @maximum 1209600
       */
      TimeDelaySeconds?: number;
      /**
       * <p>Optionally specify the clip start time for all of your manifest egress requests. When you
       * include clip start time, note that you cannot use clip start time query parameters for this
       * manifest's endpoint URL.</p>
       */
      ClipStartTime?: string;
    };
    /**
     * <p>The duration (in seconds) of the manifest window. This represents the total amount of content
     * available in the manifest at any given time.</p>
     */
    ManifestWindowSeconds?: number;
    ManifestLayout?: "FULL" | "COMPACT";
  })[];
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  OriginEndpointName: string;
  Segment?: {
    /**
     * <p>The duration (in seconds) of each segment. Enter a value equal to, or a multiple of, the input
     * segment duration. If the value that you enter is different from the input segment duration,
     * MediaPackage rounds segments to the nearest multiple of the input segment duration.</p>
     * @minimum 1
     * @maximum 30
     */
    SegmentDurationSeconds?: number;
    /**
     * <p>The name that describes the segment. The name is the base name of the segment used in all
     * content manifests inside of the endpoint. You can't use spaces in the name.</p>
     * @minLength 1
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9_-]+$
     */
    SegmentName?: string;
    /**
     * <p>When selected, MediaPackage bundles all audio tracks in a rendition group. All other tracks in
     * the stream can be used with any audio rendition from the group.</p>
     */
    TsUseAudioRenditionGroup?: boolean;
    /**
     * <p>When selected, the stream set includes an additional I-frame only stream, along with the other
     * tracks. If false, this extra stream is not included. MediaPackage generates an I-frame only stream
     * from the first rendition in the manifest. The service inserts EXT-I-FRAMES-ONLY tags in the output
     * manifest, and then generates and includes an I-frames only playlist in the stream. This playlist
     * permits player functionality like fast forward and rewind.</p>
     */
    IncludeIframeOnlyStreams?: boolean;
    /**
     * <p>By default, MediaPackage excludes all digital video broadcasting (DVB) subtitles from the
     * output. When selected, MediaPackage passes through DVB subtitles into the output.</p>
     */
    TsIncludeDvbSubtitles?: boolean;
    Scte?: {
      /**
       * <p>The SCTE-35 message types that you want to be treated as ad markers in the output.</p>
       * @minItems 0
       * @maxItems 100
       */
      ScteFilter?: ("SPLICE_INSERT" | "BREAK" | "PROVIDER_ADVERTISEMENT" | "DISTRIBUTOR_ADVERTISEMENT" | "PROVIDER_PLACEMENT_OPPORTUNITY" | "DISTRIBUTOR_PLACEMENT_OPPORTUNITY" | "PROVIDER_OVERLAY_PLACEMENT_OPPORTUNITY" | "DISTRIBUTOR_OVERLAY_PLACEMENT_OPPORTUNITY" | "PROGRAM")[];
    };
    Encryption?: {
      /**
       * <p>A 128-bit, 16-byte hex value represented by a 32-character string, used in conjunction with the
       * key for encrypting content. If you don't specify a value, then MediaPackage creates the constant
       * initialization vector (IV).</p>
       * @minLength 32
       * @maxLength 32
       * @pattern ^[0-9a-fA-F]+$
       */
      ConstantInitializationVector?: string;
      EncryptionMethod: {
        TsEncryptionMethod?: "AES_128" | "SAMPLE_AES";
        CmafEncryptionMethod?: "CENC" | "CBCS";
        IsmEncryptionMethod?: "CENC";
      };
      /**
       * <p>The frequency (in seconds) of key changes for live workflows, in which content is streamed real
       * time. The service retrieves content keys before the live content begins streaming, and then
       * retrieves them as needed over the lifetime of the workflow. By default, key rotation is set to 300
       * seconds (5 minutes), the minimum rotation interval, which is equivalent to setting it to 300. If
       * you don't enter an interval, content keys aren't rotated.</p> <p>The following example setting
       * causes the service to rotate keys every thirty minutes: <code>1800</code> </p>
       * @minimum 300
       * @maximum 31536000
       */
      KeyRotationIntervalSeconds?: number;
      /**
       * <p>Excludes SEIG and SGPD boxes from segment metadata in CMAF containers.</p> <p>When set to
       * <code>true</code>, MediaPackage omits these DRM metadata boxes from CMAF segments, which can
       * improve compatibility with certain devices and players that don't support these boxes.</p>
       * <p>Important considerations:</p> <ul> <li> <p>This setting only affects CMAF container formats</p>
       * </li> <li> <p>Key rotation can still be handled through media playlist signaling</p> </li> <li>
       * <p>PSSH and TENC boxes remain unaffected</p> </li> <li> <p>Default behavior is preserved when this
       * setting is disabled</p> </li> </ul> <p>Valid values: <code>true</code> | <code>false</code> </p>
       * <p>Default: <code>false</code> </p>
       */
      CmafExcludeSegmentDrmMetadata?: boolean;
      SpekeKeyProvider: {
        EncryptionContractConfiguration: {
          PresetSpeke20Audio: "PRESET_AUDIO_1" | "PRESET_AUDIO_2" | "PRESET_AUDIO_3" | "SHARED" | "UNENCRYPTED";
          PresetSpeke20Video: "PRESET_VIDEO_1" | "PRESET_VIDEO_2" | "PRESET_VIDEO_3" | "PRESET_VIDEO_4" | "PRESET_VIDEO_5" | "PRESET_VIDEO_6" | "PRESET_VIDEO_7" | "PRESET_VIDEO_8" | "SHARED" | "UNENCRYPTED";
        };
        /**
         * <p>The unique identifier for the content. The service sends this to the key server to identify the
         * current endpoint. How unique you make this depends on how fine-grained you want access controls to
         * be. The service does not permit you to use the same ID for two simultaneous encryption processes.
         * The resource ID is also known as the content ID.</p> <p>The following example shows a resource ID:
         * <code>MovieNight20171126093045</code> </p>
         * @minLength 1
         * @maxLength 256
         * @pattern ^[0-9a-zA-Z_-]+$
         */
        ResourceId: string;
        /**
         * <p>The DRM solution provider you're using to protect your content during distribution.</p>
         * @minItems 1
         * @maxItems 4
         */
        DrmSystems: ("CLEAR_KEY_AES_128" | "FAIRPLAY" | "PLAYREADY" | "WIDEVINE" | "IRDETO")[];
        /**
         * <p>The ARN for the IAM role granted by the key provider that provides access to the key provider
         * API. This role must have a trust policy that allows MediaPackage to assume the role, and it must
         * have a sufficient permissions policy to allow access to the specific key retrieval URL. Get this
         * from your DRM solution provider.</p> <p>Valid format:
         * <code>arn:aws:iam::{accountID}:role/{name}</code>. The following example shows a role ARN:
         * <code>arn:aws:iam::444455556666:role/SpekeAccess</code> </p>
         * @minLength 1
         * @maxLength 2048
         */
        RoleArn: string;
        /**
         * <p>The URL of the API Gateway proxy that you set up to talk to your key server. The API Gateway
         * proxy must reside in the same AWS Region as MediaPackage and must start with https://.</p> <p>The
         * following example shows a URL:
         * <code>https://1wm2dx1f33.execute-api.us-west-2.amazonaws.com/SpekeSample/copyProtection</code> </p>
         * @minLength 1
         * @maxLength 1024
         */
        Url: string;
      };
    };
  };
  /**
   * <p>The size of the window (in seconds) to create a window of the live stream that's available for
   * on-demand viewing. Viewers can start-over or catch-up on content that falls within the window. The
   * maximum startover window is 1,209,600 seconds (14 days).</p>
   * @minimum 60
   * @maximum 1209600
   */
  StartoverWindowSeconds?: number;
  DashManifestUrls?: string[];
  MssManifestUrls?: string[];
  HlsManifestUrls?: string[];
  LowLatencyHlsManifestUrls?: string[];
  Tags?: {
    Key?: string;
    Value?: string;
  }[];
};
