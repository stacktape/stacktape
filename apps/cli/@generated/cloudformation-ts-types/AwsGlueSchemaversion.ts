// This file is auto-generated. Do not edit manually.
// Source: aws-glue-schemaversion.json

/** This resource represents an individual schema version of a schema defined in Glue Schema Registry. */
export type AwsGlueSchemaversion = {
  Schema: {
    /**
     * Amazon Resource Name for the Schema. This attribute can be used to uniquely represent the Schema.
     * @pattern arn:(aws|aws-us-gov|aws-cn):glue:.*
     */
    SchemaArn?: string;
    /**
     * Name of the schema. This parameter requires RegistryName to be provided.
     * @minLength 1
     * @maxLength 255
     */
    SchemaName?: string;
    /**
     * Name of the registry to identify where the Schema is located.
     * @minLength 1
     * @maxLength 255
     */
    RegistryName?: string;
  };
  /**
   * Complete definition of the schema in plain-text.
   * @minLength 1
   * @maxLength 170000
   */
  SchemaDefinition: string;
  /**
   * Represents the version ID associated with the schema version.
   * @pattern [a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}
   */
  VersionId?: string;
};
