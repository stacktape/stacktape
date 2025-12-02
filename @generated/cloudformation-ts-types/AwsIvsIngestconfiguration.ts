// This file is auto-generated. Do not edit manually.
// Source: aws-ivs-ingestconfiguration.json

/** Resource Type definition for AWS::IVS::IngestConfiguration */
export type AwsIvsIngestconfiguration = {
  /**
   * IngestConfiguration ARN is automatically generated on creation and assigned as the unique
   * identifier.
   * @minLength 1
   * @maxLength 128
   * @pattern ^arn:aws:ivs:[a-z0-9-]+:[0-9]+:ingest-configuration/[a-zA-Z0-9-]+$
   */
  Arn?: string;
  /**
   * IngestConfiguration
   * @default "-"
   * @minLength 0
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-_]*$
   */
  Name?: string;
  /**
   * Stage ARN. A value other than an empty string indicates that stage is linked to
   * IngestConfiguration. Default: "" (recording is disabled).
   * @default ""
   * @minLength 0
   * @maxLength 128
   * @pattern ^arn:aws:ivs:[a-z0-9-]+:[0-9]+:stage/[a-zA-Z0-9-]+$
   */
  StageArn?: string;
  /**
   * Participant Id is automatically generated on creation and assigned.
   * @minLength 0
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9-_]*$
   */
  ParticipantId?: string;
  /**
   * Ingest Protocol.
   * @default "RTMPS"
   * @enum ["RTMP","RTMPS"]
   */
  IngestProtocol?: "RTMP" | "RTMPS";
  /**
   * Whether ingest configuration allows insecure ingest.
   * @default false
   */
  InsecureIngest?: boolean;
  /**
   * State of IngestConfiguration which determines whether IngestConfiguration is in use or not.
   * @default "INACTIVE"
   * @enum ["ACTIVE","INACTIVE"]
   */
  State?: "ACTIVE" | "INACTIVE";
  /** Stream-key value. */
  StreamKey?: string;
  /** User defined indentifier for participant associated with IngestConfiguration. */
  UserId?: string;
  /**
   * A list of key-value pairs that contain metadata for the asset model.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
