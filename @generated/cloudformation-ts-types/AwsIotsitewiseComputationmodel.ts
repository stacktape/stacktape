// This file is auto-generated. Do not edit manually.
// Source: aws-iotsitewise-computationmodel.json

/** Resource schema for AWS::IoTSiteWise::ComputationModel. */
export type AwsIotsitewiseComputationmodel = {
  /**
   * The ID of the computation model.
   * @minLength 36
   * @maxLength 36
   * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
   */
  ComputationModelId?: string;
  /**
   * The ARN of the computation model.
   * @minLength 1
   * @maxLength 1600
   * @pattern ^arn:aws(-cn|-us-gov)?:[a-zA-Z0-9-:/_\.]+$
   */
  ComputationModelArn?: string;
  /**
   * The name of the computation model.
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9 _\-#$*!@]+$
   */
  ComputationModelName: string;
  /**
   * A description about the computation model.
   * @minLength 1
   * @maxLength 2048
   * @pattern ^[a-zA-Z0-9 _\-#$*!@]+$
   */
  ComputationModelDescription?: string;
  /** The configuration for the computation model. */
  ComputationModelConfiguration: {
    /** Contains configuration for anomaly detection computation model. */
    AnomalyDetection?: {
      /**
       * Input properties for anomaly detection.
       * @minLength 4
       * @maxLength 67
       * @pattern ^\$\{[a-z][a-z0-9_]*\}$
       */
      InputProperties: string;
      /**
       * Result property for anomaly detection.
       * @minLength 4
       * @maxLength 67
       * @pattern ^\$\{[a-z][a-z0-9_]*\}$
       */
      ResultProperty: string;
    };
  };
  /** The data binding for the computation model. */
  ComputationModelDataBinding: Record<string, {
    /** Defines an asset model property binding. */
    AssetModelProperty?: {
      /**
       * The ID of the asset model.
       * @minLength 36
       * @maxLength 36
       * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
       */
      AssetModelId: string;
      /**
       * The ID of the asset model property.
       * @minLength 36
       * @maxLength 36
       * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
       */
      PropertyId: string;
    };
    /** Defines an asset property binding. */
    AssetProperty?: {
      /**
       * The ID of the asset.
       * @minLength 36
       * @maxLength 36
       * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
       */
      AssetId: string;
      /**
       * The ID of the asset property.
       * @minLength 36
       * @maxLength 36
       * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
       */
      PropertyId: string;
    };
    /** Defines a list of computation model binding values. */
    List?: unknown[];
  }>;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
