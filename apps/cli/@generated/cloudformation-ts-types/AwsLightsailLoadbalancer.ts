// This file is auto-generated. Do not edit manually.
// Source: aws-lightsail-loadbalancer.json

/** Resource Type definition for AWS::Lightsail::LoadBalancer */
export type AwsLightsailLoadbalancer = {
  /**
   * The name of your load balancer.
   * @pattern \w[\w\-]*\w
   */
  LoadBalancerName: string;
  LoadBalancerArn?: string;
  /** The instance port where you're creating your load balancer. */
  InstancePort: number;
  /**
   * The IP address type for the load balancer. The possible values are ipv4 for IPv4 only, and
   * dualstack for IPv4 and IPv6. The default value is dualstack.
   */
  IpAddressType?: string;
  /**
   * The names of the instances attached to the load balancer.
   * @uniqueItems true
   */
  AttachedInstances?: string[];
  /**
   * The path you provided to perform the load balancer health check. If you didn't specify a health
   * check path, Lightsail uses the root path of your website (e.g., "/").
   */
  HealthCheckPath?: string;
  /** Configuration option to enable session stickiness. */
  SessionStickinessEnabled?: boolean;
  /** Configuration option to adjust session stickiness cookie duration parameter. */
  SessionStickinessLBCookieDurationSeconds?: string;
  /** The name of the TLS policy to apply to the load balancer. */
  TlsPolicyName?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
};
