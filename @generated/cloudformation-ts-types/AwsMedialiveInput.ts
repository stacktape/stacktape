// This file is auto-generated. Do not edit manually.
// Source: aws-medialive-input.json

/** Resource Type definition for AWS::MediaLive::Input */
export type AwsMedialiveInput = {
  SrtSettings?: {
    /** @uniqueItems false */
    SrtCallerSources?: {
      SrtListenerPort?: string;
      StreamId?: string;
      MinimumLatency?: number;
      Decryption?: {
        Algorithm?: string;
        PassphraseSecretArn?: string;
      };
      SrtListenerAddress?: string;
    }[];
  };
  InputNetworkLocation?: string;
  /** @uniqueItems false */
  Destinations?: {
    StreamName?: string;
    /** @uniqueItems false */
    NetworkRoutes?: {
      Cidr?: string;
      Gateway?: string;
    }[];
    StaticIpAddress?: string;
    Network?: string;
  }[];
  Vpc?: {
    /** @uniqueItems false */
    SecurityGroupIds?: string[];
    /** @uniqueItems false */
    SubnetIds?: string[];
  };
  /** @uniqueItems false */
  MediaConnectFlows?: {
    FlowArn?: string;
  }[];
  /** @uniqueItems false */
  Sources?: {
    PasswordParam?: string;
    Username?: string;
    Url?: string;
  }[];
  RoleArn?: string;
  Name?: string;
  Type?: string;
  Smpte2110ReceiverGroupSettings?: {
    /** @uniqueItems false */
    Smpte2110ReceiverGroups?: {
      SdpSettings?: {
        /** @uniqueItems false */
        AudioSdps?: {
          MediaIndex?: number;
          SdpUrl?: string;
        }[];
        /** @uniqueItems false */
        AncillarySdps?: {
          MediaIndex?: number;
          SdpUrl?: string;
        }[];
        VideoSdp?: {
          MediaIndex?: number;
          SdpUrl?: string;
        };
      };
    }[];
  };
  /** @uniqueItems false */
  SdiSources?: string[];
  Id?: string;
  Arn?: string;
  /** @uniqueItems false */
  InputSecurityGroups?: string[];
  MulticastSettings?: {
    /** @uniqueItems false */
    Sources?: {
      Url?: string;
      SourceIp?: string;
    }[];
  };
  /** @uniqueItems false */
  InputDevices?: {
    Id?: string;
  }[];
  Tags?: Record<string, unknown>;
};
