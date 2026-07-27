// This file is auto-generated. Do not edit manually.
// Source: aws-mediapackage-packagingconfiguration.json

/** Resource schema for AWS::MediaPackage::PackagingConfiguration */
export type AwsMediapackagePackagingconfiguration = {
  /** The ID of the PackagingConfiguration. */
  Id: string;
  /** The ID of a PackagingGroup. */
  PackagingGroupId: string;
  /** The ARN of the PackagingConfiguration. */
  Arn?: string;
  /** A CMAF packaging configuration. */
  CmafPackage?: {
    Encryption?: {
      SpekeKeyProvider: {
        EncryptionContractConfiguration?: {
          /**
           * A collection of audio encryption presets.
           * @enum ["PRESET-AUDIO-1","PRESET-AUDIO-2","PRESET-AUDIO-3","SHARED","UNENCRYPTED"]
           */
          PresetSpeke20Audio: "PRESET-AUDIO-1" | "PRESET-AUDIO-2" | "PRESET-AUDIO-3" | "SHARED" | "UNENCRYPTED";
          /**
           * A collection of video encryption presets.
           * @enum ["PRESET-VIDEO-1","PRESET-VIDEO-2","PRESET-VIDEO-3","PRESET-VIDEO-4","PRESET-VIDEO-5","PRESET-VIDEO-6","PRESET-VIDEO-7","PRESET-VIDEO-8","SHARED","UNENCRYPTED"]
           */
          PresetSpeke20Video: "PRESET-VIDEO-1" | "PRESET-VIDEO-2" | "PRESET-VIDEO-3" | "PRESET-VIDEO-4" | "PRESET-VIDEO-5" | "PRESET-VIDEO-6" | "PRESET-VIDEO-7" | "PRESET-VIDEO-8" | "SHARED" | "UNENCRYPTED";
        };
        RoleArn: string;
        /** The system IDs to include in key requests. */
        SystemIds: string[];
        /** The URL of the external key provider service. */
        Url: string;
      };
    };
    /** A list of HLS manifest configurations. */
    HlsManifests: ({
      /**
       * This setting controls how ad markers are included in the packaged OriginEndpoint. "NONE" will omit
       * all SCTE-35 ad markers from the output. "PASSTHROUGH" causes the manifest to contain a copy of the
       * SCTE-35 ad markers (comments) taken directly from the input HTTP Live Streaming (HLS) manifest.
       * "SCTE35_ENHANCED" generates ad markers and blackout tags based on SCTE-35 messages in the input
       * source.
       * @enum ["NONE","SCTE35_ENHANCED","PASSTHROUGH"]
       */
      AdMarkers?: "NONE" | "SCTE35_ENHANCED" | "PASSTHROUGH";
      /** When enabled, an I-Frame only stream will be included in the output. */
      IncludeIframeOnlyStream?: boolean;
      ManifestName?: string;
      /**
       * The interval (in seconds) between each EXT-X-PROGRAM-DATE-TIME tag inserted into manifests.
       * Additionally, when an interval is specified ID3Timed Metadata messages will be generated every 5
       * seconds using the ingest time of the content. If the interval is not specified, or set to 0, then
       * no EXT-X-PROGRAM-DATE-TIME tags will be inserted into manifests and no ID3Timed Metadata messages
       * will be generated. Note that irrespective of this parameter, if any ID3 Timed Metadata is found in
       * HTTP Live Streaming (HLS) input, it will be passed through to HLS output.
       */
      ProgramDateTimeIntervalSeconds?: number;
      /** When enabled, the EXT-X-KEY tag will be repeated in output manifests. */
      RepeatExtXKey?: boolean;
      StreamSelection?: {
        /** The maximum video bitrate (bps) to include in output. */
        MaxVideoBitsPerSecond?: number;
        /** The minimum video bitrate (bps) to include in output. */
        MinVideoBitsPerSecond?: number;
        /**
         * A directive that determines the order of streams in the output.
         * @enum ["ORIGINAL","VIDEO_BITRATE_ASCENDING","VIDEO_BITRATE_DESCENDING"]
         */
        StreamOrder?: "ORIGINAL" | "VIDEO_BITRATE_ASCENDING" | "VIDEO_BITRATE_DESCENDING";
      };
    })[];
    SegmentDurationSeconds?: number;
    /**
     * When includeEncoderConfigurationInSegments is set to true, MediaPackage places your encoder's
     * Sequence Parameter Set (SPS), Picture Parameter Set (PPS), and Video Parameter Set (VPS) metadata
     * in every video segment instead of in the init fragment. This lets you use different SPS/PPS/VPS
     * settings for your assets during content playback.
     */
    IncludeEncoderConfigurationInSegments?: boolean;
  };
  /** A Dynamic Adaptive Streaming over HTTP (DASH) packaging configuration. */
  DashPackage?: {
    /** A list of DASH manifest configurations. */
    DashManifests: ({
      /**
       * Determines the position of some tags in the Media Presentation Description (MPD). When set to FULL,
       * elements like SegmentTemplate and ContentProtection are included in each Representation. When set
       * to COMPACT, duplicate elements are combined and presented at the AdaptationSet level.
       * @enum ["FULL","COMPACT"]
       */
      ManifestLayout?: "FULL" | "COMPACT";
      ManifestName?: string;
      /** Minimum duration (in seconds) that a player will buffer media before starting the presentation. */
      MinBufferTimeSeconds?: number;
      /**
       * The Dynamic Adaptive Streaming over HTTP (DASH) profile type. When set to "HBBTV_1_5", HbbTV 1.5
       * compliant output is enabled.
       * @enum ["NONE","HBBTV_1_5"]
       */
      Profile?: "NONE" | "HBBTV_1_5";
      /**
       * The source of scte markers used. When set to SEGMENTS, the scte markers are sourced from the
       * segments of the ingested content. When set to MANIFEST, the scte markers are sourced from the
       * manifest of the ingested content.
       * @enum ["SEGMENTS","MANIFEST"]
       */
      ScteMarkersSource?: "SEGMENTS" | "MANIFEST";
      StreamSelection?: {
        /** The maximum video bitrate (bps) to include in output. */
        MaxVideoBitsPerSecond?: number;
        /** The minimum video bitrate (bps) to include in output. */
        MinVideoBitsPerSecond?: number;
        /**
         * A directive that determines the order of streams in the output.
         * @enum ["ORIGINAL","VIDEO_BITRATE_ASCENDING","VIDEO_BITRATE_DESCENDING"]
         */
        StreamOrder?: "ORIGINAL" | "VIDEO_BITRATE_ASCENDING" | "VIDEO_BITRATE_DESCENDING";
      };
    })[];
    Encryption?: {
      SpekeKeyProvider: {
        EncryptionContractConfiguration?: {
          /**
           * A collection of audio encryption presets.
           * @enum ["PRESET-AUDIO-1","PRESET-AUDIO-2","PRESET-AUDIO-3","SHARED","UNENCRYPTED"]
           */
          PresetSpeke20Audio: "PRESET-AUDIO-1" | "PRESET-AUDIO-2" | "PRESET-AUDIO-3" | "SHARED" | "UNENCRYPTED";
          /**
           * A collection of video encryption presets.
           * @enum ["PRESET-VIDEO-1","PRESET-VIDEO-2","PRESET-VIDEO-3","PRESET-VIDEO-4","PRESET-VIDEO-5","PRESET-VIDEO-6","PRESET-VIDEO-7","PRESET-VIDEO-8","SHARED","UNENCRYPTED"]
           */
          PresetSpeke20Video: "PRESET-VIDEO-1" | "PRESET-VIDEO-2" | "PRESET-VIDEO-3" | "PRESET-VIDEO-4" | "PRESET-VIDEO-5" | "PRESET-VIDEO-6" | "PRESET-VIDEO-7" | "PRESET-VIDEO-8" | "SHARED" | "UNENCRYPTED";
        };
        RoleArn: string;
        /** The system IDs to include in key requests. */
        SystemIds: string[];
        /** The URL of the external key provider service. */
        Url: string;
      };
    };
    /**
     * A list of triggers that controls when the outgoing Dynamic Adaptive Streaming over HTTP (DASH)
     * Media Presentation Description (MPD) will be partitioned into multiple periods. If empty, the
     * content will not be partitioned into more than one period. If the list contains "ADS", new periods
     * will be created where the Asset contains SCTE-35 ad markers.
     */
    PeriodTriggers?: "ADS"[];
    SegmentDurationSeconds?: number;
    /**
     * Determines the type of SegmentTemplate included in the Media Presentation Description (MPD). When
     * set to NUMBER_WITH_TIMELINE, a full timeline is presented in each SegmentTemplate, with $Number$
     * media URLs. When set to TIME_WITH_TIMELINE, a full timeline is presented in each SegmentTemplate,
     * with $Time$ media URLs. When set to NUMBER_WITH_DURATION, only a duration is included in each
     * SegmentTemplate, with $Number$ media URLs.
     * @enum ["NUMBER_WITH_TIMELINE","TIME_WITH_TIMELINE","NUMBER_WITH_DURATION"]
     */
    SegmentTemplateFormat?: "NUMBER_WITH_TIMELINE" | "TIME_WITH_TIMELINE" | "NUMBER_WITH_DURATION";
    /**
     * When includeEncoderConfigurationInSegments is set to true, MediaPackage places your encoder's
     * Sequence Parameter Set (SPS), Picture Parameter Set (PPS), and Video Parameter Set (VPS) metadata
     * in every video segment instead of in the init fragment. This lets you use different SPS/PPS/VPS
     * settings for your assets during content playback.
     */
    IncludeEncoderConfigurationInSegments?: boolean;
    /** When enabled, an I-Frame only stream will be included in the output. */
    IncludeIframeOnlyStream?: boolean;
  };
  /** An HTTP Live Streaming (HLS) packaging configuration. */
  HlsPackage?: {
    Encryption?: {
      /** An HTTP Live Streaming (HLS) encryption configuration. */
      ConstantInitializationVector?: string;
      /**
       * The encryption method to use.
       * @enum ["AES_128","SAMPLE_AES"]
       */
      EncryptionMethod?: "AES_128" | "SAMPLE_AES";
      SpekeKeyProvider: {
        EncryptionContractConfiguration?: {
          /**
           * A collection of audio encryption presets.
           * @enum ["PRESET-AUDIO-1","PRESET-AUDIO-2","PRESET-AUDIO-3","SHARED","UNENCRYPTED"]
           */
          PresetSpeke20Audio: "PRESET-AUDIO-1" | "PRESET-AUDIO-2" | "PRESET-AUDIO-3" | "SHARED" | "UNENCRYPTED";
          /**
           * A collection of video encryption presets.
           * @enum ["PRESET-VIDEO-1","PRESET-VIDEO-2","PRESET-VIDEO-3","PRESET-VIDEO-4","PRESET-VIDEO-5","PRESET-VIDEO-6","PRESET-VIDEO-7","PRESET-VIDEO-8","SHARED","UNENCRYPTED"]
           */
          PresetSpeke20Video: "PRESET-VIDEO-1" | "PRESET-VIDEO-2" | "PRESET-VIDEO-3" | "PRESET-VIDEO-4" | "PRESET-VIDEO-5" | "PRESET-VIDEO-6" | "PRESET-VIDEO-7" | "PRESET-VIDEO-8" | "SHARED" | "UNENCRYPTED";
        };
        RoleArn: string;
        /** The system IDs to include in key requests. */
        SystemIds: string[];
        /** The URL of the external key provider service. */
        Url: string;
      };
    };
    /** A list of HLS manifest configurations. */
    HlsManifests: ({
      /**
       * This setting controls how ad markers are included in the packaged OriginEndpoint. "NONE" will omit
       * all SCTE-35 ad markers from the output. "PASSTHROUGH" causes the manifest to contain a copy of the
       * SCTE-35 ad markers (comments) taken directly from the input HTTP Live Streaming (HLS) manifest.
       * "SCTE35_ENHANCED" generates ad markers and blackout tags based on SCTE-35 messages in the input
       * source.
       * @enum ["NONE","SCTE35_ENHANCED","PASSTHROUGH"]
       */
      AdMarkers?: "NONE" | "SCTE35_ENHANCED" | "PASSTHROUGH";
      /** When enabled, an I-Frame only stream will be included in the output. */
      IncludeIframeOnlyStream?: boolean;
      ManifestName?: string;
      /**
       * The interval (in seconds) between each EXT-X-PROGRAM-DATE-TIME tag inserted into manifests.
       * Additionally, when an interval is specified ID3Timed Metadata messages will be generated every 5
       * seconds using the ingest time of the content. If the interval is not specified, or set to 0, then
       * no EXT-X-PROGRAM-DATE-TIME tags will be inserted into manifests and no ID3Timed Metadata messages
       * will be generated. Note that irrespective of this parameter, if any ID3 Timed Metadata is found in
       * HTTP Live Streaming (HLS) input, it will be passed through to HLS output.
       */
      ProgramDateTimeIntervalSeconds?: number;
      /** When enabled, the EXT-X-KEY tag will be repeated in output manifests. */
      RepeatExtXKey?: boolean;
      StreamSelection?: {
        /** The maximum video bitrate (bps) to include in output. */
        MaxVideoBitsPerSecond?: number;
        /** The minimum video bitrate (bps) to include in output. */
        MinVideoBitsPerSecond?: number;
        /**
         * A directive that determines the order of streams in the output.
         * @enum ["ORIGINAL","VIDEO_BITRATE_ASCENDING","VIDEO_BITRATE_DESCENDING"]
         */
        StreamOrder?: "ORIGINAL" | "VIDEO_BITRATE_ASCENDING" | "VIDEO_BITRATE_DESCENDING";
      };
    })[];
    /**
     * When enabled, MediaPackage passes through digital video broadcasting (DVB) subtitles into the
     * output.
     */
    IncludeDvbSubtitles?: boolean;
    SegmentDurationSeconds?: number;
    /** When enabled, audio streams will be placed in rendition groups in the output. */
    UseAudioRenditionGroup?: boolean;
  };
  /** A Microsoft Smooth Streaming (MSS) PackagingConfiguration. */
  MssPackage?: {
    Encryption?: {
      SpekeKeyProvider: {
        EncryptionContractConfiguration?: {
          /**
           * A collection of audio encryption presets.
           * @enum ["PRESET-AUDIO-1","PRESET-AUDIO-2","PRESET-AUDIO-3","SHARED","UNENCRYPTED"]
           */
          PresetSpeke20Audio: "PRESET-AUDIO-1" | "PRESET-AUDIO-2" | "PRESET-AUDIO-3" | "SHARED" | "UNENCRYPTED";
          /**
           * A collection of video encryption presets.
           * @enum ["PRESET-VIDEO-1","PRESET-VIDEO-2","PRESET-VIDEO-3","PRESET-VIDEO-4","PRESET-VIDEO-5","PRESET-VIDEO-6","PRESET-VIDEO-7","PRESET-VIDEO-8","SHARED","UNENCRYPTED"]
           */
          PresetSpeke20Video: "PRESET-VIDEO-1" | "PRESET-VIDEO-2" | "PRESET-VIDEO-3" | "PRESET-VIDEO-4" | "PRESET-VIDEO-5" | "PRESET-VIDEO-6" | "PRESET-VIDEO-7" | "PRESET-VIDEO-8" | "SHARED" | "UNENCRYPTED";
        };
        RoleArn: string;
        /** The system IDs to include in key requests. */
        SystemIds: string[];
        /** The URL of the external key provider service. */
        Url: string;
      };
    };
    /** A list of MSS manifest configurations. */
    MssManifests: ({
      ManifestName?: string;
      StreamSelection?: {
        /** The maximum video bitrate (bps) to include in output. */
        MaxVideoBitsPerSecond?: number;
        /** The minimum video bitrate (bps) to include in output. */
        MinVideoBitsPerSecond?: number;
        /**
         * A directive that determines the order of streams in the output.
         * @enum ["ORIGINAL","VIDEO_BITRATE_ASCENDING","VIDEO_BITRATE_DESCENDING"]
         */
        StreamOrder?: "ORIGINAL" | "VIDEO_BITRATE_ASCENDING" | "VIDEO_BITRATE_DESCENDING";
      };
    })[];
    SegmentDurationSeconds?: number;
  };
  /**
   * A collection of tags associated with a resource
   * @uniqueItems true
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
