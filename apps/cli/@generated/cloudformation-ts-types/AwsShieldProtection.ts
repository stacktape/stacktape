// This file is auto-generated. Do not edit manually.
// Source: aws-shield-protection.json

/**
 * Enables AWS Shield Advanced for a specific AWS resource. The resource can be an Amazon CloudFront
 * distribution, Amazon Route 53 hosted zone, AWS Global Accelerator standard accelerator, Elastic IP
 * Address, Application Load Balancer, or a Classic Load Balancer. You can protect Amazon EC2
 * instances and Network Load Balancers by association with protected Amazon EC2 Elastic IP addresses.
 */
export type AwsShieldProtection = {
  /** The unique identifier (ID) of the protection. */
  ProtectionId?: string;
  /** The ARN (Amazon Resource Name) of the protection. */
  ProtectionArn?: string;
  /**
   * Friendly name for the Protection.
   * @minLength 1
   * @maxLength 128
   * @pattern [ a-zA-Z0-9_\.\-]*
   */
  Name: string;
  /**
   * The ARN (Amazon Resource Name) of the resource to be protected.
   * @minLength 1
   * @maxLength 2048
   */
  ResourceArn: string;
  /**
   * The Amazon Resource Names (ARNs) of the health check to associate with the protection.
   * @maxItems 1
   */
  HealthCheckArns?: string[];
  ApplicationLayerAutomaticResponseConfiguration?: {
    /**
     * Specifies the action setting that Shield Advanced should use in the AWS WAF rules that it creates
     * on behalf of the protected resource in response to DDoS attacks. You specify this as part of the
     * configuration for the automatic application layer DDoS mitigation feature, when you enable or
     * update automatic mitigation. Shield Advanced creates the AWS WAF rules in a Shield Advanced-managed
     * rule group, inside the web ACL that you have associated with the resource.
     */
    Action: {
      /**
       * Specifies that Shield Advanced should configure its AWS WAF rules with the AWS WAF `Count` action.
       * You must specify exactly one action, either `Block` or `Count`.
       */
      Count?: Record<string, unknown>;
    } | {
      /**
       * Specifies that Shield Advanced should configure its AWS WAF rules with the AWS WAF `Block` action.
       * You must specify exactly one action, either `Block` or `Count`.
       */
      Block?: Record<string, unknown>;
    };
    /**
     * Indicates whether automatic application layer DDoS mitigation is enabled for the protection.
     * @enum ["ENABLED","DISABLED"]
     */
    Status: "ENABLED" | "DISABLED";
  };
  /**
   * One or more tag key-value pairs for the Protection object.
   * @maxItems 200
   */
  Tags?: {
    /**
     * Part of the key:value pair that defines a tag. You can use a tag key to describe a category of
     * information, such as "customer." Tag keys are case-sensitive.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * Part of the key:value pair that defines a tag. You can use a tag value to describe a specific value
     * within a category, such as "companyA" or "companyB." Tag values are case-sensitive.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
