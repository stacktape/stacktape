// This file is auto-generated. Do not edit manually.
// Source: aws-globalaccelerator-crossaccountattachment.json

/** Resource Type definition for AWS::GlobalAccelerator::CrossAccountAttachment */
export type AwsGlobalacceleratorCrossaccountattachment = {
  /**
   * The Friendly identifier of the attachment.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9_-]{0,64}$
   */
  Name: string;
  /** The Amazon Resource Name (ARN) of the attachment. */
  AttachmentArn?: string;
  /** Principals to share the resources with. */
  Principals?: string[];
  /** Resources shared using the attachment. */
  Resources?: {
    EndpointId?: string;
    Cidr?: string;
    Region?: string;
  }[];
  Tags?: {
    /**
     * Key of the tag. Value can be 1 to 127 characters.
     * @minLength 1
     * @maxLength 127
     */
    Key: string;
    /**
     * Value for the tag. Value can be 1 to 255 characters.
     * @minLength 1
     * @maxLength 255
     */
    Value: string;
  }[];
};
