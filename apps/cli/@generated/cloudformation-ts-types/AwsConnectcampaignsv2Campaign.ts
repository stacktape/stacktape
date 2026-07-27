// This file is auto-generated. Do not edit manually.
// Source: aws-connectcampaignsv2-campaign.json

/** Definition of AWS::ConnectCampaignsV2::Campaign Resource Type */
export type AwsConnectcampaignsv2Campaign = {
  /**
   * Amazon Connect Campaign Arn
   * @minLength 0
   * @maxLength 256
   * @pattern ^arn:aws[-a-z0-9]*:connect-campaigns:[-a-z0-9]*:[0-9]{12}:campaign/[-a-zA-Z0-9]*$
   */
  Arn?: string;
  Name: string;
  ConnectInstanceId: string;
  ChannelSubtypeConfig: unknown | unknown | unknown;
  Source?: unknown | unknown;
  ConnectCampaignFlowArn?: string;
  Schedule?: {
    StartTime: string;
    EndTime: string;
    RefreshFrequency?: string;
  };
  CommunicationTimeConfig?: {
    LocalTimeZoneConfig: {
      DefaultTimeZone?: string;
      LocalTimeZoneDetection?: ("ZIP_CODE" | "AREA_CODE")[];
    };
    Telephony?: {
      OpenHours: {
        DailyHours: ({
          Key?: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
          Value?: {
            StartTime: string;
            EndTime: string;
          }[];
        })[];
      };
      RestrictedPeriods?: unknown;
    };
    Sms?: {
      OpenHours: {
        DailyHours: ({
          Key?: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
          Value?: {
            StartTime: string;
            EndTime: string;
          }[];
        })[];
      };
      RestrictedPeriods?: unknown;
    };
    Email?: {
      OpenHours: {
        DailyHours: ({
          Key?: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
          Value?: {
            StartTime: string;
            EndTime: string;
          }[];
        })[];
      };
      RestrictedPeriods?: unknown;
    };
  };
  CommunicationLimitsOverride?: {
    AllChannelsSubtypes?: {
      CommunicationLimitList?: {
        /** @minimum 1 */
        MaxCountPerRecipient: number;
        /** @minimum 1 */
        Frequency: number;
        Unit: "DAY";
      }[];
    };
    InstanceLimitsHandling?: "OPT_IN" | "OPT_OUT";
  };
  /**
   * One or more tags.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /** The key name of the tag. */
    Key: string;
    /** The value for the tag. */
    Value: string;
  }[];
};
