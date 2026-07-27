// This file is auto-generated. Do not edit manually.
// Source: aws-pinpointemail-configurationseteventdestination.json

/** Resource Type definition for AWS::PinpointEmail::ConfigurationSetEventDestination */
export type AwsPinpointemailConfigurationseteventdestination = {
  Id?: string;
  EventDestinationName: string;
  ConfigurationSetName: string;
  EventDestination?: {
    SnsDestination?: {
      TopicArn: string;
    };
    CloudWatchDestination?: {
      /** @uniqueItems false */
      DimensionConfigurations?: {
        DimensionValueSource: string;
        DefaultDimensionValue: string;
        DimensionName: string;
      }[];
    };
    Enabled?: boolean;
    /** @uniqueItems false */
    MatchingEventTypes: string[];
    PinpointDestination?: {
      ApplicationArn?: string;
    };
    KinesisFirehoseDestination?: {
      DeliveryStreamArn: string;
      IamRoleArn: string;
    };
  };
};
