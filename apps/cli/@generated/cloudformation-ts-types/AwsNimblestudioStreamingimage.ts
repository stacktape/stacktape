// This file is auto-generated. Do not edit manually.
// Source: aws-nimblestudio-streamingimage.json

/** Represents a streaming session machine image that can be used to launch a streaming session */
export type AwsNimblestudioStreamingimage = {
  /**
   * <p>A human-readable description of the streaming image.</p>
   * @minLength 0
   * @maxLength 256
   */
  Description?: string;
  /**
   * <p>The ID of an EC2 machine image with which to create this streaming image.</p>
   * @pattern ^ami-[0-9A-z]+$
   */
  Ec2ImageId: string;
  EncryptionConfiguration?: {
    KeyType: "CUSTOMER_MANAGED_KEY";
    /**
     * <p>The ARN for a KMS key that is used to encrypt studio data.</p>
     * @minLength 4
     * @pattern ^arn:.*
     */
    KeyArn?: string;
  };
  /**
   * <p>The list of EULAs that must be accepted before a Streaming Session can be started using this
   * streaming image.</p>
   */
  EulaIds?: string[];
  /**
   * <p>A friendly name for a streaming image resource.</p>
   * @minLength 0
   * @maxLength 64
   */
  Name: string;
  /**
   * <p>The owner of the streaming image, either the studioId that contains the streaming image, or
   * 'amazon' for images that are provided by Amazon Nimble Studio.</p>
   */
  Owner?: string;
  /**
   * <p>The platform of the streaming image, either WINDOWS or LINUX.</p>
   * @pattern ^[a-zA-Z]*$
   */
  Platform?: string;
  StreamingImageId?: string;
  /** <p>The studioId. </p> */
  StudioId: string;
  Tags?: Record<string, string>;
};
