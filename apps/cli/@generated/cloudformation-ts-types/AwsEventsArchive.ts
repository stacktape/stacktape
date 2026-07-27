// This file is auto-generated. Do not edit manually.
// Source: aws-events-archive.json

/** Resource Type definition for AWS::Events::Archive */
export type AwsEventsArchive = {
  /**
   * @minLength 1
   * @maxLength 48
   * @pattern [\.\-_A-Za-z0-9]+
   */
  ArchiveName?: string;
  SourceArn: string;
  Description?: string;
  EventPattern?: Record<string, unknown>;
  /** @pattern ^arn:aws([a-z]|\-)*:events:([a-z]|\d|\-)*:([0-9]{12})?:.+\/.+$ */
  Arn?: string;
  RetentionDays?: number;
  /**
   * @minLength 0
   * @maxLength 2048
   */
  KmsKeyIdentifier?: string;
};
