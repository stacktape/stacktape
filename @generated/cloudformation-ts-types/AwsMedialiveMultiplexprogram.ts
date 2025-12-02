// This file is auto-generated. Do not edit manually.
// Source: aws-medialive-multiplexprogram.json

/** Resource schema for AWS::MediaLive::Multiplexprogram */
export type AwsMedialiveMultiplexprogram = {
  /** The MediaLive channel associated with the program. */
  ChannelId?: string;
  /** The ID of the multiplex that the program belongs to. */
  MultiplexId?: string;
  /** The settings for this multiplex program. */
  MultiplexProgramSettings?: {
    PreferredChannelPipeline?: "CURRENTLY_ACTIVE" | "PIPELINE_0" | "PIPELINE_1";
    /**
     * Unique program number.
     * @minimum 0
     * @maximum 65535
     */
    ProgramNumber: number;
    /** Transport stream service descriptor configuration for the Multiplex program. */
    ServiceDescriptor?: {
      /**
       * Name of the provider.
       * @minLength 1
       * @maxLength 256
       */
      ProviderName: string;
      /**
       * Name of the service.
       * @minLength 1
       * @maxLength 256
       */
      ServiceName: string;
    };
    /** Program video settings configuration. */
    VideoSettings?: {
      /**
       * The constant bitrate configuration for the video encode.
       * When this field is defined, StatmuxSettings must be undefined.
       * @minimum 100000
       * @maximum 100000000
       */
      ConstantBitrate: number;
    } | {
      /**
       * Statmux rate control settings.
       * When this field is defined, ConstantBitrate must be undefined.
       */
      StatmuxSettings: {
        /**
         * Maximum statmux bitrate.
         * @minimum 100000
         * @maximum 100000000
         */
        MaximumBitrate?: number;
        /**
         * Minimum statmux bitrate.
         * @minimum 100000
         * @maximum 100000000
         */
        MinimumBitrate?: number;
        /**
         * The purpose of the priority is to use a combination of the\nmultiplex rate control algorithm and
         * the QVBR capability of the\nencoder to prioritize the video quality of some channels in
         * a\nmultiplex over others.  Channels that have a higher priority will\nget higher video quality at
         * the expense of the video quality of\nother channels in the multiplex with lower priority.
         * @minimum -5
         * @maximum 5
         */
        Priority?: number;
      };
    };
  };
  /** The settings for this multiplex program. */
  PreferredChannelPipeline?: "CURRENTLY_ACTIVE" | "PIPELINE_0" | "PIPELINE_1";
  /** The packet identifier map for this multiplex program. */
  PacketIdentifiersMap?: {
    AudioPids?: number[];
    DvbSubPids?: number[];
    DvbTeletextPid?: number;
    EtvPlatformPid?: number;
    EtvSignalPid?: number;
    KlvDataPids?: number[];
    PcrPid?: number;
    PmtPid?: number;
    PrivateMetadataPid?: number;
    Scte27Pids?: number[];
    Scte35Pid?: number;
    TimedMetadataPid?: number;
    VideoPid?: number;
  };
  /**
   * Contains information about the current sources for the specified program in the specified
   * multiplex. Keep in mind that each multiplex pipeline connects to both pipelines in a given source
   * channel (the channel identified by the program). But only one of those channel pipelines is ever
   * active at one time.
   */
  PipelineDetails?: {
    /**
     * Identifies the channel pipeline that is currently active for the pipeline (identified by
     * PipelineId) in the multiplex.
     */
    ActiveChannelPipeline?: string;
    /** Identifies a specific pipeline in the multiplex. */
    PipelineId?: string;
  }[];
  /** The name of the multiplex program. */
  ProgramName?: string;
};
