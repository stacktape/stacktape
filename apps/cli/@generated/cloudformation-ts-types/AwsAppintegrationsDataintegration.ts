// This file is auto-generated. Do not edit manually.
// Source: aws-appintegrations-dataintegration.json

/** Resource Type definition for AWS::AppIntegrations::DataIntegration */
export type AwsAppintegrationsDataintegration = {
  /**
   * The data integration description.
   * @minLength 1
   * @maxLength 1000
   */
  Description?: string;
  /**
   * The unique identifer of the data integration.
   * @minLength 1
   * @maxLength 255
   * @pattern [a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}
   */
  Id?: string;
  /**
   * The Amazon Resource Name (ARN) of the data integration.
   * @minLength 1
   * @maxLength 2048
   * @pattern ^arn:aws[-a-z]*:[A-Za-z0-9][A-Za-z0-9_/.-]{0,62}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9][A-Za-z0-9:_/+=,@.-]{0,1023}$
   */
  DataIntegrationArn?: string;
  /**
   * The name of the data integration.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9/\._\-]+$
   */
  Name: string;
  /**
   * The KMS key of the data integration.
   * @minLength 1
   * @maxLength 255
   * @pattern .*\S.*
   */
  KmsKey: string;
  /** The name of the data and how often it should be pulled from the source. */
  ScheduleConfig?: {
    /**
     * The start date for objects to import in the first flow run. Epoch or ISO timestamp format is
     * supported.
     * @minLength 1
     * @maxLength 255
     * @pattern .*\S.*
     */
    FirstExecutionFrom?: string;
    /**
     * The name of the object to pull from the data source.
     * @minLength 1
     * @maxLength 255
     * @pattern ^[a-zA-Z0-9/\._\-]+$
     */
    Object?: string;
    /**
     * How often the data should be pulled from data source.
     * @minLength 1
     * @maxLength 255
     * @pattern .*\S.*
     */
    ScheduleExpression: string;
  };
  /**
   * The URI of the data source.
   * @minLength 1
   * @maxLength 1000
   * @pattern ^(\w+\:\/\/[\w.-]+[\w/!@#+=.-]+$)|(\w+\:\/\/[\w.-]+[\w/!@#+=.-]+[\w/!@#+=.-]+[\w/!@#+=.,-]+$)
   */
  SourceURI: string;
  /**
   * The tags (keys and values) associated with the data integration.
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * A key to identify the tag.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * Corresponding tag value for the key.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /** The configuration for what files should be pulled from the source. */
  FileConfiguration?: {
    /**
     * Identifiers for the source folders to pull all files from recursively.
     * @minItems 1
     * @maxItems 10
     */
    Folders: string[];
    /** Restrictions for what files should be pulled from the source. */
    Filters?: Record<string, string[]>;
  };
  /** The configuration for what data should be pulled from the source. */
  ObjectConfiguration?: Record<string, Record<string, string[]>>;
};
