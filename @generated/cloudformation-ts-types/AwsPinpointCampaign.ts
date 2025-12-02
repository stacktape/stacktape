// This file is auto-generated. Do not edit manually.
// Source: aws-pinpoint-campaign.json

/** Resource Type definition for AWS::Pinpoint::Campaign */
export type AwsPinpointCampaign = {
  Description?: string;
  SegmentId: string;
  Priority?: number;
  TemplateConfiguration?: {
    SMSTemplate?: {
      Version?: string;
      Name?: string;
    };
    EmailTemplate?: {
      Version?: string;
      Name?: string;
    };
    PushTemplate?: {
      Version?: string;
      Name?: string;
    };
    VoiceTemplate?: {
      Version?: string;
      Name?: string;
    };
  };
  IsPaused?: boolean;
  /** @uniqueItems false */
  AdditionalTreatments?: {
    TreatmentDescription?: string;
    MessageConfiguration?: {
      APNSMessage?: {
        Action?: string;
        MediaUrl?: string;
        TimeToLive?: number;
        ImageSmallIconUrl?: string;
        ImageUrl?: string;
        Title?: string;
        Url?: string;
        JsonBody?: string;
        ImageIconUrl?: string;
        SilentPush?: boolean;
        Body?: string;
        RawContent?: string;
      };
      BaiduMessage?: {
        Action?: string;
        MediaUrl?: string;
        TimeToLive?: number;
        ImageSmallIconUrl?: string;
        ImageUrl?: string;
        Title?: string;
        Url?: string;
        JsonBody?: string;
        ImageIconUrl?: string;
        SilentPush?: boolean;
        Body?: string;
        RawContent?: string;
      };
      DefaultMessage?: {
        Action?: string;
        MediaUrl?: string;
        TimeToLive?: number;
        ImageSmallIconUrl?: string;
        ImageUrl?: string;
        Title?: string;
        Url?: string;
        JsonBody?: string;
        ImageIconUrl?: string;
        SilentPush?: boolean;
        Body?: string;
        RawContent?: string;
      };
      InAppMessage?: {
        CustomConfig?: Record<string, unknown>;
        Layout?: string;
        /** @uniqueItems false */
        Content?: {
          BodyConfig?: {
            Alignment?: string;
            TextColor?: string;
            Body?: string;
          };
          SecondaryBtn?: {
            IOS?: {
              ButtonAction?: string;
              Link?: string;
            };
            Web?: {
              ButtonAction?: string;
              Link?: string;
            };
            DefaultConfig?: {
              ButtonAction?: string;
              BorderRadius?: number;
              Text?: string;
              TextColor?: string;
              Link?: string;
              BackgroundColor?: string;
            };
            Android?: {
              ButtonAction?: string;
              Link?: string;
            };
          };
          ImageUrl?: string;
          PrimaryBtn?: {
            IOS?: {
              ButtonAction?: string;
              Link?: string;
            };
            Web?: {
              ButtonAction?: string;
              Link?: string;
            };
            DefaultConfig?: {
              ButtonAction?: string;
              BorderRadius?: number;
              Text?: string;
              TextColor?: string;
              Link?: string;
              BackgroundColor?: string;
            };
            Android?: {
              ButtonAction?: string;
              Link?: string;
            };
          };
          HeaderConfig?: {
            Alignment?: string;
            TextColor?: string;
            Header?: string;
          };
          BackgroundColor?: string;
        }[];
      };
      EmailMessage?: {
        Title?: string;
        FromAddress?: string;
        HtmlBody?: string;
        Body?: string;
      };
      GCMMessage?: {
        Action?: string;
        MediaUrl?: string;
        TimeToLive?: number;
        ImageSmallIconUrl?: string;
        ImageUrl?: string;
        Title?: string;
        Url?: string;
        JsonBody?: string;
        ImageIconUrl?: string;
        SilentPush?: boolean;
        Body?: string;
        RawContent?: string;
      };
      SMSMessage?: {
        EntityId?: string;
        OriginationNumber?: string;
        SenderId?: string;
        Body?: string;
        MessageType?: string;
        TemplateId?: string;
      };
      CustomMessage?: {
        Data?: string;
      };
      ADMMessage?: {
        Action?: string;
        MediaUrl?: string;
        TimeToLive?: number;
        ImageSmallIconUrl?: string;
        ImageUrl?: string;
        Title?: string;
        Url?: string;
        JsonBody?: string;
        ImageIconUrl?: string;
        SilentPush?: boolean;
        Body?: string;
        RawContent?: string;
      };
    };
    Schedule?: {
      TimeZone?: string;
      QuietTime?: {
        Start: string;
        End: string;
      };
      EndTime?: string;
      StartTime?: string;
      Frequency?: string;
      EventFilter?: {
        Dimensions?: {
          Attributes?: Record<string, unknown>;
          Metrics?: Record<string, unknown>;
          EventType?: {
            /** @uniqueItems false */
            Values?: string[];
            DimensionType?: string;
          };
        };
        FilterType?: string;
      };
      IsLocalTime?: boolean;
    };
    TemplateConfiguration?: {
      SMSTemplate?: {
        Version?: string;
        Name?: string;
      };
      EmailTemplate?: {
        Version?: string;
        Name?: string;
      };
      PushTemplate?: {
        Version?: string;
        Name?: string;
      };
      VoiceTemplate?: {
        Version?: string;
        Name?: string;
      };
    };
    CustomDeliveryConfiguration?: {
      /** @uniqueItems false */
      EndpointTypes?: string[];
      DeliveryUri?: string;
    };
    SizePercent?: number;
    TreatmentName?: string;
  }[];
  Name: string;
  SegmentVersion?: number;
  TreatmentDescription?: string;
  MessageConfiguration?: {
    APNSMessage?: {
      Action?: string;
      MediaUrl?: string;
      TimeToLive?: number;
      ImageSmallIconUrl?: string;
      ImageUrl?: string;
      Title?: string;
      Url?: string;
      JsonBody?: string;
      ImageIconUrl?: string;
      SilentPush?: boolean;
      Body?: string;
      RawContent?: string;
    };
    BaiduMessage?: {
      Action?: string;
      MediaUrl?: string;
      TimeToLive?: number;
      ImageSmallIconUrl?: string;
      ImageUrl?: string;
      Title?: string;
      Url?: string;
      JsonBody?: string;
      ImageIconUrl?: string;
      SilentPush?: boolean;
      Body?: string;
      RawContent?: string;
    };
    DefaultMessage?: {
      Action?: string;
      MediaUrl?: string;
      TimeToLive?: number;
      ImageSmallIconUrl?: string;
      ImageUrl?: string;
      Title?: string;
      Url?: string;
      JsonBody?: string;
      ImageIconUrl?: string;
      SilentPush?: boolean;
      Body?: string;
      RawContent?: string;
    };
    InAppMessage?: {
      CustomConfig?: Record<string, unknown>;
      Layout?: string;
      /** @uniqueItems false */
      Content?: {
        BodyConfig?: {
          Alignment?: string;
          TextColor?: string;
          Body?: string;
        };
        SecondaryBtn?: {
          IOS?: {
            ButtonAction?: string;
            Link?: string;
          };
          Web?: {
            ButtonAction?: string;
            Link?: string;
          };
          DefaultConfig?: {
            ButtonAction?: string;
            BorderRadius?: number;
            Text?: string;
            TextColor?: string;
            Link?: string;
            BackgroundColor?: string;
          };
          Android?: {
            ButtonAction?: string;
            Link?: string;
          };
        };
        ImageUrl?: string;
        PrimaryBtn?: {
          IOS?: {
            ButtonAction?: string;
            Link?: string;
          };
          Web?: {
            ButtonAction?: string;
            Link?: string;
          };
          DefaultConfig?: {
            ButtonAction?: string;
            BorderRadius?: number;
            Text?: string;
            TextColor?: string;
            Link?: string;
            BackgroundColor?: string;
          };
          Android?: {
            ButtonAction?: string;
            Link?: string;
          };
        };
        HeaderConfig?: {
          Alignment?: string;
          TextColor?: string;
          Header?: string;
        };
        BackgroundColor?: string;
      }[];
    };
    EmailMessage?: {
      Title?: string;
      FromAddress?: string;
      HtmlBody?: string;
      Body?: string;
    };
    GCMMessage?: {
      Action?: string;
      MediaUrl?: string;
      TimeToLive?: number;
      ImageSmallIconUrl?: string;
      ImageUrl?: string;
      Title?: string;
      Url?: string;
      JsonBody?: string;
      ImageIconUrl?: string;
      SilentPush?: boolean;
      Body?: string;
      RawContent?: string;
    };
    SMSMessage?: {
      EntityId?: string;
      OriginationNumber?: string;
      SenderId?: string;
      Body?: string;
      MessageType?: string;
      TemplateId?: string;
    };
    CustomMessage?: {
      Data?: string;
    };
    ADMMessage?: {
      Action?: string;
      MediaUrl?: string;
      TimeToLive?: number;
      ImageSmallIconUrl?: string;
      ImageUrl?: string;
      Title?: string;
      Url?: string;
      JsonBody?: string;
      ImageIconUrl?: string;
      SilentPush?: boolean;
      Body?: string;
      RawContent?: string;
    };
  };
  Limits?: {
    MessagesPerSecond?: number;
    Daily?: number;
    MaximumDuration?: number;
    Total?: number;
    Session?: number;
  };
  CampaignId?: string;
  HoldoutPercent?: number;
  Schedule: {
    TimeZone?: string;
    QuietTime?: {
      Start: string;
      End: string;
    };
    EndTime?: string;
    StartTime?: string;
    Frequency?: string;
    EventFilter?: {
      Dimensions?: {
        Attributes?: Record<string, unknown>;
        Metrics?: Record<string, unknown>;
        EventType?: {
          /** @uniqueItems false */
          Values?: string[];
          DimensionType?: string;
        };
      };
      FilterType?: string;
    };
    IsLocalTime?: boolean;
  };
  CustomDeliveryConfiguration?: {
    /** @uniqueItems false */
    EndpointTypes?: string[];
    DeliveryUri?: string;
  };
  Arn?: string;
  ApplicationId: string;
  CampaignHook?: {
    WebUrl?: string;
    LambdaFunctionName?: string;
    Mode?: string;
  };
  Tags?: Record<string, unknown>;
  TreatmentName?: string;
};
