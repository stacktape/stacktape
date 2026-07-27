// This file is auto-generated. Do not edit manually.
// Source: aws-vpclattice-service.json

/**
 * A service is any software application that can run on instances containers, or serverless functions
 * within an account or virtual private cloud (VPC).
 */
export type AwsVpclatticeService = {
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:service/svc-[0-9a-z]{17}$
   */
  Arn?: string;
  /**
   * @default "NONE"
   * @enum ["NONE","AWS_IAM"]
   */
  AuthType?: "NONE" | "AWS_IAM";
  CreatedAt?: string;
  DnsEntry?: {
    DomainName?: string;
    HostedZoneId?: string;
  };
  /**
   * @minLength 21
   * @maxLength 21
   * @pattern ^svc-[0-9a-z]{17}$
   */
  Id?: string;
  LastUpdatedAt?: string;
  /**
   * @minLength 3
   * @maxLength 40
   * @pattern ^(?!svc-)(?![-])(?!.*[-]$)(?!.*[-]{2})[a-z0-9-]+$
   */
  Name?: string;
  /** @enum ["ACTIVE","CREATE_IN_PROGRESS","DELETE_IN_PROGRESS","CREATE_FAILED","DELETE_FAILED"] */
  Status?: "ACTIVE" | "CREATE_IN_PROGRESS" | "DELETE_IN_PROGRESS" | "CREATE_FAILED" | "DELETE_FAILED";
  /**
   * @maxLength 2048
   * @pattern ^(arn(:[a-z0-9]+([.-][a-z0-9]+)*){2}(:([a-z0-9]+([.-][a-z0-9]+)*)?){2}:certificate/[0-9a-z-]+)?$
   */
  CertificateArn?: string;
  /**
   * @minLength 3
   * @maxLength 255
   */
  CustomDomainName?: string;
  /**
   * @minItems 0
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
