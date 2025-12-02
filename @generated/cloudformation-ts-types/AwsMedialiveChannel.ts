// This file is auto-generated. Do not edit manually.
// Source: aws-medialive-channel.json

/** Resource Type definition for AWS::MediaLive::Channel */
export type AwsMedialiveChannel = {
  /** @uniqueItems false */
  InputAttachments?: {
    InputAttachmentName?: string;
    InputId?: string;
    /** @uniqueItems false */
    LogicalInterfaceNames?: string[];
    AutomaticInputFailoverSettings?: {
      ErrorClearTimeMsec?: number;
      /** @uniqueItems false */
      FailoverConditions?: {
        FailoverConditionSettings?: {
          AudioSilenceSettings?: {
            AudioSelectorName?: string;
            AudioSilenceThresholdMsec?: number;
          };
          VideoBlackSettings?: {
            BlackDetectThreshold?: number;
            VideoBlackThresholdMsec?: number;
          };
          InputLossSettings?: {
            InputLossThresholdMsec?: number;
          };
        };
      }[];
      InputPreference?: string;
      SecondaryInputId?: string;
    };
    InputSettings?: {
      Scte35Pid?: number;
      DeblockFilter?: string;
      FilterStrength?: number;
      InputFilter?: string;
      SourceEndBehavior?: string;
      VideoSelector?: {
        ColorSpaceSettings?: {
          Hdr10Settings?: {
            MaxCll?: number;
            MaxFall?: number;
          };
        };
        ColorSpaceUsage?: string;
        SelectorSettings?: {
          VideoSelectorProgramId?: {
            ProgramId?: number;
          };
          VideoSelectorPid?: {
            Pid?: number;
          };
        };
        ColorSpace?: string;
      };
      Smpte2038DataPreference?: string;
      /** @uniqueItems false */
      AudioSelectors?: {
        SelectorSettings?: {
          AudioLanguageSelection?: {
            LanguageCode?: string;
            LanguageSelectionPolicy?: string;
          };
          AudioTrackSelection?: {
            DolbyEDecode?: {
              ProgramSelection?: string;
            };
            /** @uniqueItems false */
            Tracks?: {
              Track?: number;
            }[];
          };
          AudioPidSelection?: {
            Pid?: number;
          };
          AudioHlsRenditionSelection?: {
            GroupId?: string;
            Name?: string;
          };
        };
        Name?: string;
      }[];
      /** @uniqueItems false */
      CaptionSelectors?: {
        LanguageCode?: string;
        SelectorSettings?: {
          DvbSubSourceSettings?: {
            OcrLanguage?: string;
            Pid?: number;
          };
          Scte27SourceSettings?: {
            OcrLanguage?: string;
            Pid?: number;
          };
          AribSourceSettings?: Record<string, unknown>;
          EmbeddedSourceSettings?: {
            Source608ChannelNumber?: number;
            Scte20Detection?: string;
            Source608TrackNumber?: number;
            Convert608To708?: string;
          };
          Scte20SourceSettings?: {
            Source608ChannelNumber?: number;
            Convert608To708?: string;
          };
          TeletextSourceSettings?: {
            OutputRectangle?: {
              Height?: number;
              TopOffset?: number;
              Width?: number;
              LeftOffset?: number;
            };
            PageNumber?: string;
          };
          AncillarySourceSettings?: {
            SourceAncillaryChannelNumber?: number;
          };
        };
        Name?: string;
      }[];
      DenoiseFilter?: string;
      NetworkInputSettings?: {
        MulticastInputSettings?: {
          SourceIpAddress?: string;
        };
        ServerValidation?: string;
        HlsInputSettings?: {
          Scte35Source?: string;
          BufferSegments?: number;
          RetryInterval?: number;
          Retries?: number;
          Bandwidth?: number;
        };
      };
    };
  }[];
  InputSpecification?: {
    Codec?: string;
    MaximumBitrate?: string;
    Resolution?: string;
  };
  /** @uniqueItems false */
  Destinations?: {
    /** @uniqueItems false */
    SrtSettings?: {
      StreamId?: string;
      EncryptionPassphraseSecretArn?: string;
      Url?: string;
    }[];
    /** @uniqueItems false */
    LogicalInterfaceNames?: string[];
    MultiplexSettings?: {
      ProgramName?: string;
      MultiplexId?: string;
    };
    Id?: string;
    /** @uniqueItems false */
    Settings?: {
      StreamName?: string;
      PasswordParam?: string;
      Username?: string;
      Url?: string;
    }[];
    /** @uniqueItems false */
    MediaPackageSettings?: {
      ChannelName?: string;
      ChannelId?: string;
      ChannelGroup?: string;
    }[];
  }[];
  DryRun?: boolean;
  Vpc?: {
    /** @uniqueItems false */
    SecurityGroupIds?: string[];
    /** @uniqueItems false */
    SubnetIds?: string[];
    /** @uniqueItems false */
    PublicAddressAllocationIds?: string[];
  };
  ChannelEngineVersion?: {
    Version?: string;
  };
  Maintenance?: {
    MaintenanceDay?: string;
    MaintenanceStartTime?: string;
  };
  LogLevel?: string;
  RoleArn?: string;
  Name?: string;
  ChannelClass?: string;
  EncoderSettings?: {
    /** @uniqueItems false */
    AudioDescriptions?: {
      /** @uniqueItems false */
      AudioDashRoles?: string[];
      LanguageCodeControl?: string;
      CodecSettings?: {
        Eac3Settings?: {
          CodingMode?: string;
          SurroundMode?: string;
          PassthroughControl?: string;
          Dialnorm?: number;
          LoRoSurroundMixLevel?: number;
          PhaseControl?: string;
          LtRtCenterMixLevel?: number;
          LfeFilter?: string;
          LfeControl?: string;
          Bitrate?: number;
          DrcLine?: string;
          DcFilter?: string;
          MetadataControl?: string;
          LtRtSurroundMixLevel?: number;
          LoRoCenterMixLevel?: number;
          DrcRf?: string;
          AttenuationControl?: string;
          BitstreamMode?: string;
          SurroundExMode?: string;
          StereoDownmix?: string;
        };
        Ac3Settings?: {
          CodingMode?: string;
          DrcProfile?: string;
          MetadataControl?: string;
          Dialnorm?: number;
          LfeFilter?: string;
          BitstreamMode?: string;
          AttenuationControl?: string;
          Bitrate?: number;
        };
        Mp2Settings?: {
          CodingMode?: string;
          SampleRate?: number;
          Bitrate?: number;
        };
        Eac3AtmosSettings?: {
          CodingMode?: string;
          Dialnorm?: number;
          SurroundTrim?: number;
          DrcRf?: string;
          Bitrate?: number;
          DrcLine?: string;
          HeightTrim?: number;
        };
        PassThroughSettings?: Record<string, unknown>;
        WavSettings?: {
          CodingMode?: string;
          SampleRate?: number;
          BitDepth?: number;
        };
        AacSettings?: {
          CodingMode?: string;
          RateControlMode?: string;
          SampleRate?: number;
          InputType?: string;
          VbrQuality?: string;
          RawFormat?: string;
          Spec?: string;
          Bitrate?: number;
          Profile?: string;
        };
      };
      Name?: string;
      AudioWatermarkingSettings?: {
        NielsenWatermarksSettings?: {
          NielsenNaesIiNwSettings?: {
            Timezone?: string;
            CheckDigitString?: string;
            Sid?: number;
          };
          NielsenDistributionType?: string;
          NielsenCbetSettings?: {
            CbetStepaside?: string;
            CbetCheckDigitString?: string;
            Csid?: string;
          };
        };
      };
      AudioNormalizationSettings?: {
        TargetLkfs?: number;
        Algorithm?: string;
        AlgorithmControl?: string;
      };
      LanguageCode?: string;
      RemixSettings?: {
        ChannelsOut?: number;
        ChannelsIn?: number;
        /** @uniqueItems false */
        ChannelMappings?: {
          /** @uniqueItems false */
          InputChannelLevels?: {
            InputChannel?: number;
            Gain?: number;
          }[];
          OutputChannel?: number;
        }[];
      };
      AudioSelectorName?: string;
      StreamName?: string;
      DvbDashAccessibility?: string;
      AudioType?: string;
      AudioTypeControl?: string;
    }[];
    /** @uniqueItems false */
    VideoDescriptions?: {
      ScalingBehavior?: string;
      RespondToAfd?: string;
      Height?: number;
      Sharpness?: number;
      Width?: number;
      CodecSettings?: {
        FrameCaptureSettings?: {
          TimecodeBurninSettings?: {
            Prefix?: string;
            FontSize?: string;
            Position?: string;
          };
          CaptureIntervalUnits?: string;
          CaptureInterval?: number;
        };
        H264Settings?: {
          TimecodeBurninSettings?: {
            Prefix?: string;
            FontSize?: string;
            Position?: string;
          };
          NumRefFrames?: number;
          TemporalAq?: string;
          Slices?: number;
          FramerateControl?: string;
          QvbrQualityLevel?: number;
          FramerateNumerator?: number;
          ParControl?: string;
          GopClosedCadence?: number;
          FlickerAq?: string;
          Profile?: string;
          QualityLevel?: string;
          MinBitrate?: number;
          MinIInterval?: number;
          SceneChangeDetect?: string;
          ForceFieldPictures?: string;
          FramerateDenominator?: number;
          Softness?: number;
          GopSize?: number;
          AdaptiveQuantization?: string;
          FilterSettings?: {
            TemporalFilterSettings?: {
              PostFilterSharpening?: string;
              Strength?: string;
            };
            BandwidthReductionFilterSettings?: {
              PostFilterSharpening?: string;
              Strength?: string;
            };
          };
          MinQp?: number;
          ColorSpaceSettings?: {
            Rec601Settings?: Record<string, unknown>;
            Rec709Settings?: Record<string, unknown>;
            ColorSpacePassthroughSettings?: Record<string, unknown>;
          };
          EntropyEncoding?: string;
          SpatialAq?: string;
          ParDenominator?: number;
          FixedAfd?: string;
          GopSizeUnits?: string;
          AfdSignaling?: string;
          Bitrate?: number;
          ParNumerator?: number;
          RateControlMode?: string;
          ScanType?: string;
          BufSize?: number;
          TimecodeInsertion?: string;
          ColorMetadata?: string;
          BufFillPct?: number;
          GopBReference?: string;
          LookAheadRateControl?: string;
          Level?: string;
          MaxBitrate?: number;
          Syntax?: string;
          SubgopLength?: string;
          GopNumBFrames?: number;
        };
        Mpeg2Settings?: {
          TimecodeBurninSettings?: {
            Prefix?: string;
            FontSize?: string;
            Position?: string;
          };
          ColorSpace?: string;
          FixedAfd?: string;
          GopSizeUnits?: string;
          FramerateNumerator?: number;
          GopClosedCadence?: number;
          AfdSignaling?: string;
          DisplayAspectRatio?: string;
          ScanType?: string;
          TimecodeInsertion?: string;
          ColorMetadata?: string;
          FramerateDenominator?: number;
          GopSize?: number;
          AdaptiveQuantization?: string;
          SubgopLength?: string;
          FilterSettings?: {
            TemporalFilterSettings?: {
              PostFilterSharpening?: string;
              Strength?: string;
            };
          };
          GopNumBFrames?: number;
        };
        H265Settings?: {
          MvOverPictureBoundaries?: string;
          TimecodeBurninSettings?: {
            Prefix?: string;
            FontSize?: string;
            Position?: string;
          };
          Slices?: number;
          QvbrQualityLevel?: number;
          TileHeight?: number;
          FramerateNumerator?: number;
          GopClosedCadence?: number;
          FlickerAq?: string;
          Profile?: string;
          MvTemporalPredictor?: string;
          MinBitrate?: number;
          MinIInterval?: number;
          SceneChangeDetect?: string;
          FramerateDenominator?: number;
          GopSize?: number;
          AdaptiveQuantization?: string;
          TileWidth?: number;
          FilterSettings?: {
            TemporalFilterSettings?: {
              PostFilterSharpening?: string;
              Strength?: string;
            };
            BandwidthReductionFilterSettings?: {
              PostFilterSharpening?: string;
              Strength?: string;
            };
          };
          MinQp?: number;
          AlternativeTransferFunction?: string;
          ColorSpaceSettings?: {
            Rec601Settings?: Record<string, unknown>;
            Rec709Settings?: Record<string, unknown>;
            ColorSpacePassthroughSettings?: Record<string, unknown>;
            DolbyVision81Settings?: Record<string, unknown>;
            Hdr10Settings?: {
              MaxCll?: number;
              MaxFall?: number;
            };
          };
          Tier?: string;
          ParDenominator?: number;
          FixedAfd?: string;
          GopSizeUnits?: string;
          TilePadding?: string;
          AfdSignaling?: string;
          Bitrate?: number;
          ParNumerator?: number;
          RateControlMode?: string;
          ScanType?: string;
          BufSize?: number;
          TimecodeInsertion?: string;
          Deblocking?: string;
          ColorMetadata?: string;
          LookAheadRateControl?: string;
          GopBReference?: string;
          Level?: string;
          MaxBitrate?: number;
          TreeblockSize?: string;
          SubgopLength?: string;
          GopNumBFrames?: number;
        };
        Av1Settings?: {
          TimecodeBurninSettings?: {
            Prefix?: string;
            FontSize?: string;
            Position?: string;
          };
          ColorSpaceSettings?: {
            Rec601Settings?: Record<string, unknown>;
            Rec709Settings?: Record<string, unknown>;
            ColorSpacePassthroughSettings?: Record<string, unknown>;
            Hdr10Settings?: {
              MaxCll?: number;
              MaxFall?: number;
            };
          };
          QvbrQualityLevel?: number;
          ParDenominator?: number;
          FixedAfd?: string;
          GopSizeUnits?: string;
          FramerateNumerator?: number;
          AfdSignaling?: string;
          Bitrate?: number;
          ParNumerator?: number;
          RateControlMode?: string;
          BufSize?: number;
          MinBitrate?: number;
          MinIInterval?: number;
          SceneChangeDetect?: string;
          FramerateDenominator?: number;
          LookAheadRateControl?: string;
          Level?: string;
          MaxBitrate?: number;
          GopSize?: number;
        };
      };
      Name?: string;
    }[];
    GlobalConfiguration?: {
      InputEndAction?: string;
      OutputLockingSettings?: {
        EpochLockingSettings?: {
          JamSyncTime?: string;
          CustomEpoch?: string;
        };
        PipelineLockingSettings?: Record<string, unknown>;
      };
      OutputTimingSource?: string;
      OutputLockingMode?: string;
      SupportLowFramerateInputs?: string;
      InitialAudioGain?: number;
      InputLossBehavior?: {
        InputLossImageType?: string;
        InputLossImageSlate?: {
          PasswordParam?: string;
          Username?: string;
          Uri?: string;
        };
        InputLossImageColor?: string;
        RepeatFrameMsec?: number;
        BlackFrameMsec?: number;
      };
    };
    MotionGraphicsConfiguration?: {
      MotionGraphicsSettings?: {
        HtmlMotionGraphicsSettings?: Record<string, unknown>;
      };
      MotionGraphicsInsertion?: string;
    };
    ThumbnailConfiguration?: {
      State?: string;
    };
    FeatureActivations?: {
      OutputStaticImageOverlayScheduleActions?: string;
      InputPrepareScheduleActions?: string;
    };
    /** @uniqueItems false */
    CaptionDescriptions?: {
      DestinationSettings?: {
        AribDestinationSettings?: Record<string, unknown>;
        EbuTtDDestinationSettings?: {
          FontFamily?: string;
          DefaultFontSize?: number;
          DefaultLineHeight?: number;
          FillLineGap?: string;
          StyleControl?: string;
          CopyrightHolder?: string;
        };
        SmpteTtDestinationSettings?: Record<string, unknown>;
        EmbeddedPlusScte20DestinationSettings?: Record<string, unknown>;
        TtmlDestinationSettings?: {
          StyleControl?: string;
        };
        Scte20PlusEmbeddedDestinationSettings?: Record<string, unknown>;
        DvbSubDestinationSettings?: {
          BackgroundOpacity?: number;
          FontResolution?: number;
          OutlineColor?: string;
          FontColor?: string;
          ShadowColor?: string;
          ShadowOpacity?: number;
          Font?: {
            PasswordParam?: string;
            Username?: string;
            Uri?: string;
          };
          ShadowYOffset?: number;
          Alignment?: string;
          XPosition?: number;
          FontSize?: string;
          YPosition?: number;
          OutlineSize?: number;
          TeletextGridControl?: string;
          SubtitleRows?: string;
          FontOpacity?: number;
          ShadowXOffset?: number;
          BackgroundColor?: string;
        };
        TeletextDestinationSettings?: Record<string, unknown>;
        BurnInDestinationSettings?: {
          BackgroundOpacity?: number;
          FontResolution?: number;
          OutlineColor?: string;
          FontColor?: string;
          ShadowColor?: string;
          ShadowOpacity?: number;
          Font?: {
            PasswordParam?: string;
            Username?: string;
            Uri?: string;
          };
          ShadowYOffset?: number;
          Alignment?: string;
          XPosition?: number;
          FontSize?: string;
          YPosition?: number;
          OutlineSize?: number;
          TeletextGridControl?: string;
          SubtitleRows?: string;
          FontOpacity?: number;
          ShadowXOffset?: number;
          BackgroundColor?: string;
        };
        WebvttDestinationSettings?: {
          StyleControl?: string;
        };
        EmbeddedDestinationSettings?: Record<string, unknown>;
        RtmpCaptionInfoDestinationSettings?: Record<string, unknown>;
        Scte27DestinationSettings?: Record<string, unknown>;
      };
      LanguageCode?: string;
      LanguageDescription?: string;
      Accessibility?: string;
      DvbDashAccessibility?: string;
      CaptionSelectorName?: string;
      /** @uniqueItems false */
      CaptionDashRoles?: string[];
      Name?: string;
    }[];
    AvailConfiguration?: {
      Scte35SegmentationScope?: string;
      AvailSettings?: {
        Scte35SpliceInsert?: {
          AdAvailOffset?: number;
          WebDeliveryAllowedFlag?: string;
          NoRegionalBlackoutFlag?: string;
        };
        Scte35TimeSignalApos?: {
          AdAvailOffset?: number;
          WebDeliveryAllowedFlag?: string;
          NoRegionalBlackoutFlag?: string;
        };
        Esam?: {
          AdAvailOffset?: number;
          ZoneIdentity?: string;
          AcquisitionPointId?: string;
          PoisEndpoint?: string;
          Username?: string;
          PasswordParam?: string;
        };
      };
    };
    ColorCorrectionSettings?: {
      /** @uniqueItems false */
      GlobalColorCorrections?: {
        OutputColorSpace?: string;
        InputColorSpace?: string;
        Uri?: string;
      }[];
    };
    /** @uniqueItems false */
    OutputGroups?: {
      /** @uniqueItems false */
      Outputs?: {
        OutputSettings?: {
          MediaPackageOutputSettings?: {
            MediaPackageV2DestinationSettings?: {
              HlsDefault?: string;
              AudioRenditionSets?: string;
              AudioGroupId?: string;
              HlsAutoSelect?: string;
            };
          };
          MsSmoothOutputSettings?: {
            NameModifier?: string;
            H265PackagingType?: string;
          };
          FrameCaptureOutputSettings?: {
            NameModifier?: string;
          };
          HlsOutputSettings?: {
            HlsSettings?: {
              Fmp4HlsSettings?: {
                AudioRenditionSets?: string;
                NielsenId3Behavior?: string;
                TimedMetadataBehavior?: string;
              };
              FrameCaptureHlsSettings?: Record<string, unknown>;
              StandardHlsSettings?: {
                AudioRenditionSets?: string;
                M3u8Settings?: {
                  PatInterval?: number;
                  ProgramNum?: number;
                  PcrPeriod?: number;
                  PmtInterval?: number;
                  KlvDataPids?: string;
                  NielsenId3Behavior?: string;
                  PcrPid?: string;
                  VideoPid?: string;
                  AudioFramesPerPes?: number;
                  TransportStreamId?: number;
                  PmtPid?: string;
                  Scte35Pid?: string;
                  Scte35Behavior?: string;
                  KlvBehavior?: string;
                  EcmPid?: string;
                  TimedMetadataPid?: string;
                  AudioPids?: string;
                  PcrControl?: string;
                  TimedMetadataBehavior?: string;
                };
              };
              AudioOnlyHlsSettings?: {
                SegmentType?: string;
                AudioTrackType?: string;
                AudioGroupId?: string;
                AudioOnlyImage?: {
                  PasswordParam?: string;
                  Username?: string;
                  Uri?: string;
                };
              };
            };
            NameModifier?: string;
            H265PackagingType?: string;
            SegmentModifier?: string;
          };
          RtmpOutputSettings?: {
            Destination?: {
              DestinationRefId?: string;
            };
            CertificateMode?: string;
            NumRetries?: number;
            ConnectionRetryInterval?: number;
          };
          UdpOutputSettings?: {
            Destination?: {
              DestinationRefId?: string;
            };
            FecOutputSettings?: {
              ColumnDepth?: number;
              IncludeFec?: string;
              RowLength?: number;
            };
            BufferMsec?: number;
            ContainerSettings?: {
              M2tsSettings?: {
                EtvPlatformPid?: string;
                AribCaptionsPid?: string;
                EbpPlacement?: string;
                DvbSubPids?: string;
                SegmentationStyle?: string;
                Klv?: string;
                Scte35PrerollPullupMilliseconds?: number;
                TimedMetadataBehavior?: string;
                DvbTeletextPid?: string;
                Scte35Control?: string;
                PcrPeriod?: number;
                SegmentationTime?: number;
                CcDescriptor?: string;
                PmtPid?: string;
                DvbNitSettings?: {
                  NetworkName?: string;
                  NetworkId?: number;
                  RepInterval?: number;
                };
                EtvSignalPid?: string;
                Arib?: string;
                TimedMetadataPid?: string;
                AudioPids?: string;
                AudioBufferModel?: string;
                Ebif?: string;
                PcrControl?: string;
                PatInterval?: number;
                ProgramNum?: number;
                RateMode?: string;
                KlvDataPids?: string;
                NullPacketBitrate?: number;
                PmtInterval?: number;
                EsRateInPes?: string;
                VideoPid?: string;
                TransportStreamId?: number;
                Scte35Pid?: string;
                AudioStreamType?: string;
                EbpLookaheadMs?: number;
                DvbTdtSettings?: {
                  RepInterval?: number;
                };
                EbpAudioInterval?: string;
                FragmentTime?: number;
                NielsenId3Behavior?: string;
                PcrPid?: string;
                AudioFramesPerPes?: number;
                AbsentInputAudioBehavior?: string;
                Bitrate?: number;
                Scte27Pids?: string;
                SegmentationMarkers?: string;
                DvbSdtSettings?: {
                  ServiceProviderName?: string;
                  OutputSdt?: string;
                  ServiceName?: string;
                  RepInterval?: number;
                };
                BufferModel?: string;
                EcmPid?: string;
                AribCaptionsPidControl?: string;
              };
            };
          };
          MultiplexOutputSettings?: {
            Destination?: {
              DestinationRefId?: string;
            };
            ContainerSettings?: {
              MultiplexM2tsSettings?: {
                Scte35Control?: string;
                PcrPeriod?: number;
                NielsenId3Behavior?: string;
                EsRateInPes?: string;
                CcDescriptor?: string;
                AudioFramesPerPes?: number;
                AbsentInputAudioBehavior?: string;
                AudioStreamType?: string;
                Klv?: string;
                Arib?: string;
                AudioBufferModel?: string;
                Ebif?: string;
                Scte35PrerollPullupMilliseconds?: number;
                PcrControl?: string;
              };
            };
          };
          CmafIngestOutputSettings?: {
            NameModifier?: string;
          };
          SrtOutputSettings?: {
            EncryptionType?: string;
            Destination?: {
              DestinationRefId?: string;
            };
            BufferMsec?: number;
            ContainerSettings?: {
              M2tsSettings?: {
                EtvPlatformPid?: string;
                AribCaptionsPid?: string;
                EbpPlacement?: string;
                DvbSubPids?: string;
                SegmentationStyle?: string;
                Klv?: string;
                Scte35PrerollPullupMilliseconds?: number;
                TimedMetadataBehavior?: string;
                DvbTeletextPid?: string;
                Scte35Control?: string;
                PcrPeriod?: number;
                SegmentationTime?: number;
                CcDescriptor?: string;
                PmtPid?: string;
                DvbNitSettings?: {
                  NetworkName?: string;
                  NetworkId?: number;
                  RepInterval?: number;
                };
                EtvSignalPid?: string;
                Arib?: string;
                TimedMetadataPid?: string;
                AudioPids?: string;
                AudioBufferModel?: string;
                Ebif?: string;
                PcrControl?: string;
                PatInterval?: number;
                ProgramNum?: number;
                RateMode?: string;
                KlvDataPids?: string;
                NullPacketBitrate?: number;
                PmtInterval?: number;
                EsRateInPes?: string;
                VideoPid?: string;
                TransportStreamId?: number;
                Scte35Pid?: string;
                AudioStreamType?: string;
                EbpLookaheadMs?: number;
                DvbTdtSettings?: {
                  RepInterval?: number;
                };
                EbpAudioInterval?: string;
                FragmentTime?: number;
                NielsenId3Behavior?: string;
                PcrPid?: string;
                AudioFramesPerPes?: number;
                AbsentInputAudioBehavior?: string;
                Bitrate?: number;
                Scte27Pids?: string;
                SegmentationMarkers?: string;
                DvbSdtSettings?: {
                  ServiceProviderName?: string;
                  OutputSdt?: string;
                  ServiceName?: string;
                  RepInterval?: number;
                };
                BufferModel?: string;
                EcmPid?: string;
                AribCaptionsPidControl?: string;
              };
            };
            Latency?: number;
          };
          ArchiveOutputSettings?: {
            Extension?: string;
            NameModifier?: string;
            ContainerSettings?: {
              M2tsSettings?: {
                EtvPlatformPid?: string;
                AribCaptionsPid?: string;
                EbpPlacement?: string;
                DvbSubPids?: string;
                SegmentationStyle?: string;
                Klv?: string;
                Scte35PrerollPullupMilliseconds?: number;
                TimedMetadataBehavior?: string;
                DvbTeletextPid?: string;
                Scte35Control?: string;
                PcrPeriod?: number;
                SegmentationTime?: number;
                CcDescriptor?: string;
                PmtPid?: string;
                DvbNitSettings?: {
                  NetworkName?: string;
                  NetworkId?: number;
                  RepInterval?: number;
                };
                EtvSignalPid?: string;
                Arib?: string;
                TimedMetadataPid?: string;
                AudioPids?: string;
                AudioBufferModel?: string;
                Ebif?: string;
                PcrControl?: string;
                PatInterval?: number;
                ProgramNum?: number;
                RateMode?: string;
                KlvDataPids?: string;
                NullPacketBitrate?: number;
                PmtInterval?: number;
                EsRateInPes?: string;
                VideoPid?: string;
                TransportStreamId?: number;
                Scte35Pid?: string;
                AudioStreamType?: string;
                EbpLookaheadMs?: number;
                DvbTdtSettings?: {
                  RepInterval?: number;
                };
                EbpAudioInterval?: string;
                FragmentTime?: number;
                NielsenId3Behavior?: string;
                PcrPid?: string;
                AudioFramesPerPes?: number;
                AbsentInputAudioBehavior?: string;
                Bitrate?: number;
                Scte27Pids?: string;
                SegmentationMarkers?: string;
                DvbSdtSettings?: {
                  ServiceProviderName?: string;
                  OutputSdt?: string;
                  ServiceName?: string;
                  RepInterval?: number;
                };
                BufferModel?: string;
                EcmPid?: string;
                AribCaptionsPidControl?: string;
              };
              RawSettings?: Record<string, unknown>;
            };
          };
        };
        /** @uniqueItems false */
        CaptionDescriptionNames?: string[];
        /** @uniqueItems false */
        AudioDescriptionNames?: string[];
        OutputName?: string;
        VideoDescriptionName?: string;
      }[];
      OutputGroupSettings?: {
        HlsGroupSettings?: {
          SegmentationMode?: string;
          Destination?: {
            DestinationRefId?: string;
          };
          CodecSpecification?: string;
          IvSource?: string;
          TimedMetadataId3Frame?: string;
          KeyFormatVersions?: string;
          RedundantManifest?: string;
          OutputSelection?: string;
          KeyProviderSettings?: {
            StaticKeySettings?: {
              KeyProviderServer?: {
                PasswordParam?: string;
                Username?: string;
                Uri?: string;
              };
              StaticKeyValue?: string;
            };
          };
          StreamInfResolution?: string;
          /** @uniqueItems false */
          CaptionLanguageMappings?: {
            LanguageCode?: string;
            LanguageDescription?: string;
            CaptionChannel?: number;
          }[];
          HlsId3SegmentTagging?: string;
          IFrameOnlyPlaylists?: string;
          CaptionLanguageSetting?: string;
          KeepSegments?: number;
          ConstantIv?: string;
          DirectoryStructure?: string;
          EncryptionType?: string;
          /** @uniqueItems false */
          AdMarkers?: string[];
          HlsCdnSettings?: {
            HlsWebdavSettings?: {
              FilecacheDuration?: number;
              RestartDelay?: number;
              NumRetries?: number;
              ConnectionRetryInterval?: number;
              HttpTransferMode?: string;
            };
            HlsS3Settings?: {
              CannedAcl?: string;
            };
            HlsBasicPutSettings?: {
              FilecacheDuration?: number;
              RestartDelay?: number;
              NumRetries?: number;
              ConnectionRetryInterval?: number;
            };
            HlsMediaStoreSettings?: {
              FilecacheDuration?: number;
              MediaStoreStorageClass?: string;
              RestartDelay?: number;
              NumRetries?: number;
              ConnectionRetryInterval?: number;
            };
            HlsAkamaiSettings?: {
              Salt?: string;
              FilecacheDuration?: number;
              NumRetries?: number;
              Token?: string;
              RestartDelay?: number;
              ConnectionRetryInterval?: number;
              HttpTransferMode?: string;
            };
          };
          IndexNSegments?: number;
          DiscontinuityTags?: string;
          InputLossAction?: string;
          Mode?: string;
          TsFileMode?: string;
          BaseUrlManifest1?: string;
          ClientCache?: string;
          MinSegmentLength?: number;
          KeyFormat?: string;
          IvInManifest?: string;
          BaseUrlContent1?: string;
          ProgramDateTimeClock?: string;
          ManifestCompression?: string;
          ManifestDurationFormat?: string;
          TimedMetadataId3Period?: number;
          IncompleteSegmentBehavior?: string;
          ProgramDateTimePeriod?: number;
          SegmentLength?: number;
          TimestampDeltaMilliseconds?: number;
          ProgramDateTime?: string;
          SegmentsPerSubdirectory?: number;
          BaseUrlContent?: string;
          BaseUrlManifest?: string;
        };
        FrameCaptureGroupSettings?: {
          FrameCaptureCdnSettings?: {
            FrameCaptureS3Settings?: {
              CannedAcl?: string;
            };
          };
          Destination?: {
            DestinationRefId?: string;
          };
        };
        MultiplexGroupSettings?: Record<string, unknown>;
        SrtGroupSettings?: {
          InputLossAction?: string;
        };
        ArchiveGroupSettings?: {
          Destination?: {
            DestinationRefId?: string;
          };
          ArchiveCdnSettings?: {
            ArchiveS3Settings?: {
              CannedAcl?: string;
            };
          };
          RolloverInterval?: number;
        };
        MediaPackageGroupSettings?: {
          MediapackageV2GroupSettings?: {
            /** @uniqueItems false */
            CaptionLanguageMappings?: {
              LanguageCode?: string;
              LanguageDescription?: string;
              CaptionChannel?: number;
            }[];
            Scte35Type?: string;
            SegmentLengthUnits?: string;
            TimedMetadataId3Frame?: string;
            TimedMetadataId3Period?: number;
            TimedMetadataPassthrough?: string;
            NielsenId3Behavior?: string;
            KlvBehavior?: string;
            Id3Behavior?: string;
            SegmentLength?: number;
          };
          Destination?: {
            DestinationRefId?: string;
          };
        };
        UdpGroupSettings?: {
          TimedMetadataId3Frame?: string;
          TimedMetadataId3Period?: number;
          InputLossAction?: string;
        };
        MsSmoothGroupSettings?: {
          SegmentationMode?: string;
          Destination?: {
            DestinationRefId?: string;
          };
          EventStopBehavior?: string;
          FilecacheDuration?: number;
          CertificateMode?: string;
          AcquisitionPointId?: string;
          StreamManifestBehavior?: string;
          InputLossAction?: string;
          FragmentLength?: number;
          RestartDelay?: number;
          SparseTrackType?: string;
          EventIdMode?: string;
          TimestampOffsetMode?: string;
          AudioOnlyTimecodeControl?: string;
          NumRetries?: number;
          TimestampOffset?: string;
          EventId?: string;
          SendDelayMs?: number;
          ConnectionRetryInterval?: number;
        };
        RtmpGroupSettings?: {
          AuthenticationScheme?: string;
          CacheLength?: number;
          /** @uniqueItems false */
          AdMarkers?: string[];
          IncludeFillerNalUnits?: string;
          InputLossAction?: string;
          RestartDelay?: number;
          CaptionData?: string;
          CacheFullBehavior?: string;
        };
        CmafIngestGroupSettings?: {
          Destination?: {
            DestinationRefId?: string;
          };
          KlvNameModifier?: string;
          Scte35Type?: string;
          TimedMetadataId3Frame?: string;
          TimedMetadataPassthrough?: string;
          NielsenId3Behavior?: string;
          Scte35NameModifier?: string;
          /** @uniqueItems false */
          CaptionLanguageMappings?: {
            LanguageCode?: string;
            CaptionChannel?: number;
          }[];
          SegmentLengthUnits?: string;
          TimedMetadataId3Period?: number;
          /** @uniqueItems false */
          AdditionalDestinations?: {
            Destination?: {
              DestinationRefId?: string;
            };
          }[];
          NielsenId3NameModifier?: string;
          KlvBehavior?: string;
          SegmentLength?: number;
          Id3Behavior?: string;
          SendDelayMs?: number;
          Id3NameModifier?: string;
        };
      };
      Name?: string;
    }[];
    AvailBlanking?: {
      State?: string;
      AvailBlankingImage?: {
        PasswordParam?: string;
        Username?: string;
        Uri?: string;
      };
    };
    NielsenConfiguration?: {
      DistributorId?: string;
      NielsenPcmToId3Tagging?: string;
    };
    BlackoutSlate?: {
      NetworkId?: string;
      NetworkEndBlackoutImage?: {
        PasswordParam?: string;
        Username?: string;
        Uri?: string;
      };
      NetworkEndBlackout?: string;
      State?: string;
      BlackoutSlateImage?: {
        PasswordParam?: string;
        Username?: string;
        Uri?: string;
      };
    };
    TimecodeConfig?: {
      SyncThreshold?: number;
      Source?: string;
    };
  };
  AnywhereSettings?: {
    ChannelPlacementGroupId?: string;
    ClusterId?: string;
  };
  CdiInputSpecification?: {
    Resolution?: string;
  };
  Id?: string;
  Arn?: string;
  /** @uniqueItems false */
  Inputs?: string[];
  Tags?: Record<string, unknown>;
};
