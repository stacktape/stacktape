// This file is auto-generated. Do not edit manually.
// Source: aws-groundstation-config.json

/** AWS Ground Station config resource type for CloudFormation. */
export type AwsGroundstationConfig = {
  /** @pattern ^[ a-zA-Z0-9_:-]{1,256}$ */
  Name: string;
  Tags?: {
    /** @pattern ^[ a-zA-Z0-9\+\-=._:/@]{1,128}$ */
    Key?: string;
    /** @pattern ^[ a-zA-Z0-9\+\-=._:/@]{1,256}$ */
    Value?: string;
  }[];
  Type?: string;
  ConfigData: {
    AntennaDownlinkConfig?: {
      SpectrumConfig?: {
        CenterFrequency?: {
          Value?: number;
          Units?: "GHz" | "MHz" | "kHz";
        };
        Bandwidth?: {
          Value?: number;
          Units?: "GHz" | "MHz" | "kHz";
        };
        Polarization?: "LEFT_HAND" | "RIGHT_HAND" | "NONE";
      };
    };
    TrackingConfig?: {
      /** @enum ["REQUIRED","PREFERRED","REMOVED"] */
      Autotrack?: "REQUIRED" | "PREFERRED" | "REMOVED";
    };
    DataflowEndpointConfig?: {
      DataflowEndpointName?: string;
      DataflowEndpointRegion?: string;
    };
    AntennaDownlinkDemodDecodeConfig?: {
      SpectrumConfig?: {
        CenterFrequency?: {
          Value?: number;
          Units?: "GHz" | "MHz" | "kHz";
        };
        Bandwidth?: {
          Value?: number;
          Units?: "GHz" | "MHz" | "kHz";
        };
        Polarization?: "LEFT_HAND" | "RIGHT_HAND" | "NONE";
      };
      DemodulationConfig?: {
        UnvalidatedJSON?: string;
      };
      DecodeConfig?: {
        UnvalidatedJSON?: string;
      };
    };
    AntennaUplinkConfig?: {
      SpectrumConfig?: {
        CenterFrequency?: {
          Value?: number;
          Units?: "GHz" | "MHz" | "kHz";
        };
        Polarization?: "LEFT_HAND" | "RIGHT_HAND" | "NONE";
      };
      TargetEirp?: {
        Value?: number;
        Units?: "dBW";
      };
      TransmitDisabled?: boolean;
    };
    UplinkEchoConfig?: {
      Enabled?: boolean;
      /** @pattern ^(arn:(aws[a-zA-Z-]*)?:[a-z0-9-.]+:.*)|()$ */
      AntennaUplinkConfigArn?: string;
    };
    S3RecordingConfig?: {
      BucketArn?: string;
      RoleArn?: string;
      Prefix?: string;
    };
  };
  /** @pattern ^(arn:(aws[a-zA-Z-]*)?:[a-z0-9-.]+:.*)|()$ */
  Arn?: string;
  Id?: string;
};
