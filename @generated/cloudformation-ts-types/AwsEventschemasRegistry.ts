// This file is auto-generated. Do not edit manually.
// Source: aws-eventschemas-registry.json

/** Resource Type definition for AWS::EventSchemas::Registry */
export type AwsEventschemasRegistry = {
  /** The name of the schema registry. */
  RegistryName?: string;
  /** A description of the registry to be created. */
  Description?: string;
  /** The ARN of the registry. */
  RegistryArn?: string;
  /**
   * Tags associated with the resource.
   * @uniqueItems false
   */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
