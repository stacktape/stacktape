// This file is auto-generated. Do not edit manually.
// Source: aws-ses-mailmanagerrelay.json

/** Definition of AWS::SES::MailManagerRelay Resource Type */
export type AwsSesMailmanagerrelay = {
  Authentication: {
    /** @pattern ^arn:(aws|aws-cn|aws-us-gov):secretsmanager:[a-z0-9-]+:\d{12}:secret:[a-zA-Z0-9/_+=,.@-]+$ */
    SecretArn: string;
  } | {
    NoAuthentication: Record<string, unknown>;
  };
  RelayArn?: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[a-zA-Z0-9-]+$
   */
  RelayId?: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[a-zA-Z0-9-_]+$
   */
  RelayName?: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[a-zA-Z0-9-\.]+$
   */
  ServerName: string;
  /**
   * @minimum 1
   * @maximum 65535
   */
  ServerPort: number;
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^[a-zA-Z0-9/_\+=\.:@\-]+$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9/_\+=\.:@\-]*$
     */
    Value: string;
  }[];
};
