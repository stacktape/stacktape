// This file is auto-generated. Do not edit manually.
// Source: aws-amazonmq-configurationassociation.json

/** Resource Type definition for AWS::AmazonMQ::ConfigurationAssociation */
export type AwsAmazonmqConfigurationassociation = {
  /** The ID of the ConfigurationAssociation Resource */
  Id?: string;
  /** ID of the Broker that the configuration should be applied to */
  Broker: string;
  Configuration: {
    /** Revision of the Configuration to apply to a Broker */
    Revision: number;
    /** ID of the Configuration to apply to a Broker */
    Id: string;
  };
};
