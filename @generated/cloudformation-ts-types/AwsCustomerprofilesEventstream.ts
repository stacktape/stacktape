// This file is auto-generated. Do not edit manually.
// Source: aws-customerprofiles-eventstream.json

/** An Event Stream resource of Amazon Connect Customer Profiles */
export type AwsCustomerprofilesEventstream = {
  /**
   * The unique name of the domain.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  DomainName: string;
  /**
   * The name of the event stream.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  EventStreamName: string;
  Uri: string;
  /**
   * A unique identifier for the event stream.
   * @minLength 1
   * @maxLength 255
   */
  EventStreamArn?: string;
  /**
   * The tags used to organize, track, or control access for this resource.
   * @minItems 0
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
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
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
  /** The timestamp of when the export was created. */
  CreatedAt?: string;
  /**
   * The operational state of destination stream for export.
   * @enum ["RUNNING","STOPPED"]
   */
  State?: "RUNNING" | "STOPPED";
  /** Details regarding the Kinesis stream. */
  DestinationDetails?: {
    Uri: string;
    Status: "HEALTHY" | "UNHEALTHY";
  };
};
