// This file is auto-generated. Do not edit manually.
// Source: aws-eventschemas-schema.json

/** Resource Type definition for AWS::EventSchemas::Schema */
export type AwsEventschemasSchema = {
  /** The type of schema. Valid types include OpenApi3 and JSONSchemaDraft4. */
  Type: string;
  /** A description of the schema. */
  Description?: string;
  /** The version number of the schema. */
  SchemaVersion?: string;
  /** The source of the schema definition. */
  Content: string;
  /** The name of the schema registry. */
  RegistryName: string;
  /** The ARN of the schema. */
  SchemaArn?: string;
  /** The name of the schema. */
  SchemaName?: string;
  /** The last modified time of the schema. */
  LastModified?: string;
  /** The date the schema version was created. */
  VersionCreatedDate?: string;
  /**
   * Tags associated with the resource.
   * @uniqueItems false
   */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
