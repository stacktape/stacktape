// This file is auto-generated. Do not edit manually.
// Source: aws-ses-mailmanageringresspoint.json

/** Definition of AWS::SES::MailManagerIngressPoint Resource Type */
export type AwsSesMailmanageringresspoint = {
  ARecord?: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  TrafficPolicyId: string;
  IngressPointConfiguration?: {
    /**
     * @minLength 8
     * @maxLength 64
     * @pattern ^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|.,?]+$
     */
    SmtpPassword: string;
  } | {
    /** @pattern ^arn:(aws|aws-cn|aws-us-gov):secretsmanager:[a-z0-9-]+:\d{12}:secret:[a-zA-Z0-9/_+=,.@-]+$ */
    SecretArn: string;
  };
  IngressPointArn?: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  IngressPointId?: string;
  /**
   * @minLength 3
   * @maxLength 63
   * @pattern ^[A-Za-z0-9_\-]+$
   */
  IngressPointName?: string;
  NetworkConfiguration?: {
    PublicNetworkConfiguration: {
      IpType: "IPV4" | "DUAL_STACK" & unknown;
    };
  } | {
    PrivateNetworkConfiguration: {
      /** @pattern ^vpce-[a-zA-Z0-9]{17}$ */
      VpcEndpointId: string;
    };
  };
  /**
   * @minLength 1
   * @maxLength 100
   */
  RuleSetId: string;
  Status?: "PROVISIONING" | "DEPROVISIONING" | "UPDATING" | "ACTIVE" | "CLOSED" | "FAILED";
  StatusToUpdate?: "ACTIVE" | "CLOSED";
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
  Type: "OPEN" | "AUTH";
};
