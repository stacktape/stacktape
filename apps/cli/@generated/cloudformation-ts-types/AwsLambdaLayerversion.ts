// This file is auto-generated. Do not edit manually.
// Source: aws-lambda-layerversion.json

/** Resource Type definition for AWS::Lambda::LayerVersion */
export type AwsLambdaLayerversion = {
  /**
   * A list of compatible function runtimes. Used for filtering with ListLayers and ListLayerVersions.
   * @uniqueItems false
   */
  CompatibleRuntimes?: string[];
  /** The layer's software license. */
  LicenseInfo?: string;
  /** The description of the version. */
  Description?: string;
  /** The name or Amazon Resource Name (ARN) of the layer. */
  LayerName?: string;
  /** The function layer archive. */
  Content: {
    /** For versioned objects, the version of the layer archive object to use. */
    S3ObjectVersion?: string;
    /** The Amazon S3 bucket of the layer archive. */
    S3Bucket: string;
    /** The Amazon S3 key of the layer archive. */
    S3Key: string;
  };
  LayerVersionArn?: string;
  /**
   * A list of compatible instruction set architectures.
   * @uniqueItems false
   */
  CompatibleArchitectures?: string[];
};
