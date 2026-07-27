// This file is auto-generated. Do not edit manually.
// Source: aws-forecast-datasetgroup.json

/** Represents a dataset group that holds a collection of related datasets */
export type AwsForecastDatasetgroup = {
  /**
   * An array of Amazon Resource Names (ARNs) of the datasets that you want to include in the dataset
   * group.
   */
  DatasetArns?: string[];
  /**
   * A name for the dataset group.
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z][a-zA-Z0-9_]*
   */
  DatasetGroupName: string;
  /**
   * The domain associated with the dataset group. When you add a dataset to a dataset group, this value
   * and the value specified for the Domain parameter of the CreateDataset operation must match.
   * @enum ["RETAIL","CUSTOM","INVENTORY_PLANNING","EC2_CAPACITY","WORK_FORCE","WEB_TRAFFIC","METRICS"]
   */
  Domain: "RETAIL" | "CUSTOM" | "INVENTORY_PLANNING" | "EC2_CAPACITY" | "WORK_FORCE" | "WEB_TRAFFIC" | "METRICS";
  /**
   * The tags of Application Insights application.
   * @minItems 0
   * @maxItems 200
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
  /**
   * The Amazon Resource Name (ARN) of the dataset group to delete.
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9\-\_\.\/\:]+$
   */
  DatasetGroupArn?: string;
};
