// This file is auto-generated. Do not edit manually.
// Source: aws-ssmguiconnect-preferences.json

/** Definition of AWS::SSMGuiConnect::Preferences Resource Type */
export type AwsSsmguiconnectPreferences = {
  /**
   * The AWS Account Id that the preference is associated with, used as the unique identifier for this
   * resource.
   * @pattern \d{12}
   */
  AccountId?: string;
  /**
   * The set of preferences used for recording RDP connections in the requesting AWS account and AWS
   * Region. This includes details such as which S3 bucket recordings are stored in.
   */
  ConnectionRecordingPreferences?: {
    RecordingDestinations: {
      S3Buckets: {
        BucketOwner: string;
        BucketName: string;
      }[];
    };
    KMSKeyArn: string;
  };
};
