// This file is auto-generated. Do not edit manually.
// Source: aws-eventschemas-discoverer.json

/** Resource Type definition for AWS::EventSchemas::Discoverer */
export type AwsEventschemasDiscoverer = {
  /** The ARN of the discoverer. */
  DiscovererArn?: string;
  /** The Id of the discoverer. */
  DiscovererId?: string;
  /** A description for the discoverer. */
  Description?: string;
  /** The ARN of the event bus. */
  SourceArn: string;
  /**
   * Defines whether event schemas from other accounts are discovered. Default is True.
   * @default true
   */
  CrossAccount?: boolean;
  /** Defines the current state of the discoverer. */
  State?: string;
  /**
   * Tags associated with the resource.
   * @uniqueItems false
   */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
