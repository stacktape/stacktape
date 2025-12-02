// This file is auto-generated. Do not edit manually.
// Source: aws-pinpoint-segment.json

/** Resource Type definition for AWS::Pinpoint::Segment */
export type AwsPinpointSegment = {
  SegmentId?: string;
  Arn?: string;
  SegmentGroups?: {
    /** @uniqueItems false */
    Groups?: {
      Type?: string;
      SourceType?: string;
      /** @uniqueItems false */
      Dimensions?: {
        Demographic?: {
          AppVersion?: {
            DimensionType?: string;
            /** @uniqueItems false */
            Values?: string[];
          };
          DeviceType?: {
            DimensionType?: string;
            /** @uniqueItems false */
            Values?: string[];
          };
          Platform?: {
            DimensionType?: string;
            /** @uniqueItems false */
            Values?: string[];
          };
          Channel?: {
            DimensionType?: string;
            /** @uniqueItems false */
            Values?: string[];
          };
          Model?: {
            DimensionType?: string;
            /** @uniqueItems false */
            Values?: string[];
          };
          Make?: {
            DimensionType?: string;
            /** @uniqueItems false */
            Values?: string[];
          };
        };
        Metrics?: Record<string, unknown>;
        Attributes?: Record<string, unknown>;
        Behavior?: {
          Recency?: {
            Duration: string;
            RecencyType: string;
          };
        };
        UserAttributes?: Record<string, unknown>;
        Location?: {
          GPSPoint?: {
            RangeInKilometers: number;
            Coordinates: {
              Latitude: number;
              Longitude: number;
            };
          };
          Country?: {
            DimensionType?: string;
            /** @uniqueItems false */
            Values?: string[];
          };
        };
      }[];
      /** @uniqueItems false */
      SourceSegments?: {
        Version?: number;
        Id: string;
      }[];
    }[];
    Include?: string;
  };
  Dimensions?: {
    Demographic?: {
      AppVersion?: {
        DimensionType?: string;
        /** @uniqueItems false */
        Values?: string[];
      };
      DeviceType?: {
        DimensionType?: string;
        /** @uniqueItems false */
        Values?: string[];
      };
      Platform?: {
        DimensionType?: string;
        /** @uniqueItems false */
        Values?: string[];
      };
      Channel?: {
        DimensionType?: string;
        /** @uniqueItems false */
        Values?: string[];
      };
      Model?: {
        DimensionType?: string;
        /** @uniqueItems false */
        Values?: string[];
      };
      Make?: {
        DimensionType?: string;
        /** @uniqueItems false */
        Values?: string[];
      };
    };
    Metrics?: Record<string, unknown>;
    Attributes?: Record<string, unknown>;
    Behavior?: {
      Recency?: {
        Duration: string;
        RecencyType: string;
      };
    };
    UserAttributes?: Record<string, unknown>;
    Location?: {
      GPSPoint?: {
        RangeInKilometers: number;
        Coordinates: {
          Latitude: number;
          Longitude: number;
        };
      };
      Country?: {
        DimensionType?: string;
        /** @uniqueItems false */
        Values?: string[];
      };
    };
  };
  ApplicationId: string;
  Tags?: Record<string, unknown>;
  Name: string;
};
