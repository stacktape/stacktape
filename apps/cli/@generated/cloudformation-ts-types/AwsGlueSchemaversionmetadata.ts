// This file is auto-generated. Do not edit manually.
// Source: aws-glue-schemaversionmetadata.json

/** This resource adds Key-Value metadata to a Schema version of Glue Schema Registry. */
export type AwsGlueSchemaversionmetadata = {
  /**
   * Represents the version ID associated with the schema version.
   * @pattern [a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}
   */
  SchemaVersionId: string;
  /**
   * Metadata key
   * @minLength 1
   * @maxLength 128
   */
  Key: string;
  /**
   * Metadata value
   * @minLength 1
   * @maxLength 256
   */
  Value: string;
};
