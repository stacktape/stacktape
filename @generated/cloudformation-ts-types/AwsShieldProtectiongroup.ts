// This file is auto-generated. Do not edit manually.
// Source: aws-shield-protectiongroup.json

/**
 * A grouping of protected resources so they can be handled as a collective. This resource grouping
 * improves the accuracy of detection and reduces false positives.
 */
export type AwsShieldProtectiongroup = {
  /**
   * The name of the protection group. You use this to identify the protection group in lists and to
   * manage the protection group, for example to update, delete, or describe it.
   * @minLength 1
   * @maxLength 36
   * @pattern [a-zA-Z0-9\-]*
   */
  ProtectionGroupId: string;
  /** The ARN (Amazon Resource Name) of the protection group. */
  ProtectionGroupArn?: string;
  /**
   * Defines how AWS Shield combines resource data for the group in order to detect, mitigate, and
   * report events.
   * * Sum - Use the total traffic across the group. This is a good choice for most cases. Examples
   * include Elastic IP addresses for EC2 instances that scale manually or automatically.
   * * Mean - Use the average of the traffic across the group. This is a good choice for resources that
   * share traffic uniformly. Examples include accelerators and load balancers.
   * * Max - Use the highest traffic from each resource. This is useful for resources that don't share
   * traffic and for resources that share that traffic in a non-uniform way. Examples include Amazon
   * CloudFront and origin resources for CloudFront distributions.
   * @enum ["SUM","MEAN","MAX"]
   */
  Aggregation: "SUM" | "MEAN" | "MAX";
  /**
   * The criteria to use to choose the protected resources for inclusion in the group. You can include
   * all resources that have protections, provide a list of resource Amazon Resource Names (ARNs), or
   * include all resources of a specified resource type.
   * @enum ["ALL","ARBITRARY","BY_RESOURCE_TYPE"]
   */
  Pattern: "ALL" | "ARBITRARY" | "BY_RESOURCE_TYPE";
  /**
   * The Amazon Resource Names (ARNs) of the resources to include in the protection group. You must set
   * this when you set `Pattern` to `ARBITRARY` and you must not set it for any other `Pattern` setting.
   * @maxItems 10000
   */
  Members?: string[];
  /**
   * The resource type to include in the protection group. All protected resources of this type are
   * included in the protection group. Newly protected resources of this type are automatically added to
   * the group. You must set this when you set `Pattern` to `BY_RESOURCE_TYPE` and you must not set it
   * for any other `Pattern` setting.
   * @enum ["CLOUDFRONT_DISTRIBUTION","ROUTE_53_HOSTED_ZONE","ELASTIC_IP_ALLOCATION","CLASSIC_LOAD_BALANCER","APPLICATION_LOAD_BALANCER","GLOBAL_ACCELERATOR"]
   */
  ResourceType?: "CLOUDFRONT_DISTRIBUTION" | "ROUTE_53_HOSTED_ZONE" | "ELASTIC_IP_ALLOCATION" | "CLASSIC_LOAD_BALANCER" | "APPLICATION_LOAD_BALANCER" | "GLOBAL_ACCELERATOR";
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
