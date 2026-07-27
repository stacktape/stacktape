// This file is auto-generated. Do not edit manually.
// Source: aws-connect-instancestorageconfig.json

/** Resource Type definition for AWS::Connect::InstanceStorageConfig */
export type AwsConnectInstancestorageconfig = {
  /**
   * Connect Instance ID with which the storage config will be associated
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  InstanceArn: string;
  ResourceType: "CHAT_TRANSCRIPTS" | "CALL_RECORDINGS" | "SCHEDULED_REPORTS" | "MEDIA_STREAMS" | "CONTACT_TRACE_RECORDS" | "AGENT_EVENTS";
  AssociationId?: string;
  StorageType: "S3" | "KINESIS_VIDEO_STREAM" | "KINESIS_STREAM" | "KINESIS_FIREHOSE";
  S3Config?: {
    BucketName: string;
    BucketPrefix: string;
    EncryptionConfig?: {
      EncryptionType: "KMS";
      KeyId: string;
    };
  };
  KinesisVideoStreamConfig?: {
    Prefix: string;
    RetentionPeriodHours: number;
    EncryptionConfig: {
      EncryptionType: "KMS";
      KeyId: string;
    };
  };
  KinesisStreamConfig?: {
    StreamArn: string;
  };
  KinesisFirehoseConfig?: {
    FirehoseArn: string;
  };
};
