// This file is auto-generated. Do not edit manually.
// Source: aws-ce-anomalymonitor.json

/**
 * AWS Cost Anomaly Detection leverages advanced Machine Learning technologies to identify anomalous
 * spend and root causes, so you can quickly take action. You can use Cost Anomaly Detection by
 * creating monitor.
 */
export type AwsCeAnomalymonitor = {
  MonitorArn?: string;
  /** @enum ["DIMENSIONAL","CUSTOM"] */
  MonitorType: "DIMENSIONAL" | "CUSTOM";
  /**
   * The name of the monitor.
   * @minLength 0
   * @maxLength 1024
   * @pattern [\S\s]*
   */
  MonitorName: string;
  /**
   * The date when the monitor was created.
   * @minLength 0
   * @maxLength 40
   * @pattern (\d{4}-\d{2}-\d{2})(T\d{2}:\d{2}:\d{2}Z)?
   */
  CreationDate?: string;
  /**
   * The date when the monitor last evaluated for anomalies.
   * @minLength 0
   * @maxLength 40
   * @pattern (\d{4}-\d{2}-\d{2})(T\d{2}:\d{2}:\d{2}Z)?|(NOT_EVALUATED_YET)
   */
  LastEvaluatedDate?: string;
  /**
   * The date when the monitor was last updated.
   * @minLength 0
   * @maxLength 40
   * @pattern (\d{4}-\d{2}-\d{2})(T\d{2}:\d{2}:\d{2}Z)?
   */
  LastUpdatedDate?: string;
  /**
   * The dimensions to evaluate
   * @enum ["SERVICE","LINKED_ACCOUNT","TAG","COST_CATEGORY"]
   */
  MonitorDimension?: "SERVICE" | "LINKED_ACCOUNT" | "TAG" | "COST_CATEGORY";
  MonitorSpecification?: string;
  /**
   * The value for evaluated dimensions.
   * @minimum 0
   */
  DimensionalValueCount?: number;
  /**
   * Tags to assign to monitor.
   * @minItems 0
   * @maxItems 200
   */
  ResourceTags?: {
    /**
     * The key name for the tag.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:).*$
     */
    Key: string;
    /**
     * The value for the tag.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
