// This file is auto-generated. Do not edit manually.
// Source: aws-iot-fleetmetric.json

/** An aggregated metric of certain devices in your fleet */
export type AwsIotFleetmetric = {
  /** The name of the fleet metric */
  MetricName: string;
  /** The description of a fleet metric */
  Description?: string;
  /** The Fleet Indexing query used by a fleet metric */
  QueryString?: string;
  /** The period of metric emission in seconds */
  Period?: number;
  /** The aggregation field to perform aggregation and metric emission */
  AggregationField?: string;
  /** The version of a Fleet Indexing query used by a fleet metric */
  QueryVersion?: string;
  /** The index name of a fleet metric */
  IndexName?: string;
  /** The unit of data points emitted by a fleet metric */
  Unit?: string;
  AggregationType?: {
    /** Fleet Indexing aggregation type names such as Statistics, Percentiles and Cardinality */
    Name: string;
    /** Fleet Indexing aggregation type values */
    Values: string[];
  };
  /** The Amazon Resource Number (ARN) of a fleet metric metric */
  MetricArn?: string;
  /** The creation date of a fleet metric */
  CreationDate?: string;
  /** The last modified date of a fleet metric */
  LastModifiedDate?: string;
  /** The version of a fleet metric */
  Version?: number;
  /**
   * An array of key-value pairs to apply to this resource
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The tag's key
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The tag's value
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
