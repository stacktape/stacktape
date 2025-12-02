// This file is auto-generated. Do not edit manually.
// Source: aws-proton-environmenttemplate.json

/** Definition of AWS::Proton::EnvironmentTemplate Resource Type */
export type AwsProtonEnvironmenttemplate = {
  /** <p>The Amazon Resource Name (ARN) of the environment template.</p> */
  Arn?: string;
  /**
   * <p>A description of the environment template.</p>
   * @minLength 0
   * @maxLength 500
   */
  Description?: string;
  /**
   * <p>The environment template name as displayed in the developer interface.</p>
   * @minLength 1
   * @maxLength 100
   */
  DisplayName?: string;
  /**
   * <p>A customer provided encryption key that Proton uses to encrypt data.</p>
   * @minLength 1
   * @maxLength 200
   * @pattern ^arn:(aws|aws-cn|aws-us-gov):[a-zA-Z0-9-]+:[a-zA-Z0-9-]*:\d{12}:([\w+=,.@-]+[/:])*[\w+=,.@-]+$
   */
  EncryptionKey?: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[0-9A-Za-z]+[0-9A-Za-z_\-]*$
   */
  Name?: string;
  Provisioning?: "CUSTOMER_MANAGED";
  /**
   * <p>An optional list of metadata items that you can associate with the Proton environment template.
   * A tag is a key-value pair.</p>
   * <p>For more information, see <a
   * href="https://docs.aws.amazon.com/proton/latest/userguide/resources.html">Proton resources and
   * tagging</a> in the
   * <i>Proton User Guide</i>.</p>
   * @minItems 0
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * <p>The key of the resource tag.</p>
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * <p>The value of the resource tag.</p>
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
