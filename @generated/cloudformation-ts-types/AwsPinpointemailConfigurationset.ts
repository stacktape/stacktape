// This file is auto-generated. Do not edit manually.
// Source: aws-pinpointemail-configurationset.json

/** Resource Type definition for AWS::PinpointEmail::ConfigurationSet */
export type AwsPinpointemailConfigurationset = {
  Id?: string;
  SendingOptions?: {
    SendingEnabled?: boolean;
  };
  TrackingOptions?: {
    CustomRedirectDomain?: string;
  };
  ReputationOptions?: {
    ReputationMetricsEnabled?: boolean;
  };
  DeliveryOptions?: {
    SendingPoolName?: string;
  };
  /** @uniqueItems false */
  Tags?: {
    Value?: string;
    Key?: string;
  }[];
  Name: string;
};
