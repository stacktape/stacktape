// This file is auto-generated. Do not edit manually.
// Source: aws-sso-instanceaccesscontrolattributeconfiguration.json

/** Resource Type definition for SSO InstanceAccessControlAttributeConfiguration */
export type AwsSsoInstanceaccesscontrolattributeconfiguration = {
  /**
   * The ARN of the AWS SSO instance under which the operation will be executed.
   * @minLength 10
   * @maxLength 1224
   * @pattern arn:(aws|aws-us-gov|aws-cn|aws-iso|aws-iso-b):sso:::instance/(sso)?ins-[a-zA-Z0-9-.]{16}
   */
  InstanceArn: string;
  /**
   * The InstanceAccessControlAttributeConfiguration property has been deprecated but is still supported
   * for backwards compatibility purposes. We recomend that you use  AccessControlAttributes property
   * instead.
   */
  InstanceAccessControlAttributeConfiguration?: {
    AccessControlAttributes: {
      /**
       * @minLength 1
       * @maxLength 128
       * @pattern [\p{L}\p{Z}\p{N}_.:\/=+\-@]+
       */
      Key: string;
      Value: {
        Source: string[];
      };
    }[];
  };
  AccessControlAttributes?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern [\p{L}\p{Z}\p{N}_.:\/=+\-@]+
     */
    Key: string;
    Value: {
      Source: string[];
    };
  }[];
};
