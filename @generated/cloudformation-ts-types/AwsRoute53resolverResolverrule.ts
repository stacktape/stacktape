// This file is auto-generated. Do not edit manually.
// Source: aws-route53resolver-resolverrule.json

/** Resource Type definition for AWS::Route53Resolver::ResolverRule */
export type AwsRoute53resolverResolverrule = {
  /**
   * The ID of the endpoint that the rule is associated with.
   * @minLength 1
   * @maxLength 64
   */
  ResolverEndpointId?: string;
  /**
   * DNS queries for this domain name are forwarded to the IP addresses that are specified in TargetIps
   * @minLength 1
   * @maxLength 256
   */
  DomainName?: string;
  /**
   * The name for the Resolver rule
   * @minLength 0
   * @maxLength 64
   */
  Name?: string;
  /**
   * When you want to forward DNS queries for specified domain name to resolvers on your network,
   * specify FORWARD. When you have a forwarding rule to forward DNS queries for a domain to your
   * network and you want Resolver to process queries for a subdomain of that domain, specify SYSTEM.
   * @enum ["FORWARD","SYSTEM","RECURSIVE","DELEGATE"]
   */
  RuleType: "FORWARD" | "SYSTEM" | "RECURSIVE" | "DELEGATE";
  /**
   * The name server domain for queries to be delegated to if a query matches the delegation record.
   * @minLength 1
   * @maxLength 256
   */
  DelegationRecord?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems false
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
    Value: string;
  }[];
  /**
   * An array that contains the IP addresses and ports that an outbound endpoint forwards DNS queries
   * to. Typically, these are the IP addresses of DNS resolvers on your network. Specify IPv4 addresses.
   * IPv6 is not supported.
   * @uniqueItems false
   */
  TargetIps?: ({
    /** One IP address that you want to forward DNS queries to. You can specify only IPv4 addresses. */
    Ip?: string;
    /** One IPv6 address that you want to forward DNS queries to. You can specify only IPv6 addresses. */
    Ipv6?: string;
    /**
     * The port at Ip that you want to forward DNS queries to.
     * @minLength 0
     * @maxLength 65535
     */
    Port?: string;
    /**
     * The protocol that you want to use to forward DNS queries.
     * @enum ["Do53","DoH"]
     */
    Protocol?: "Do53" | "DoH";
    /**
     * The SNI of the target name servers for DoH/DoH-FIPS outbound endpoints
     * @minLength 0
     * @maxLength 255
     */
    ServerNameIndication?: string;
  })[];
  /** The Amazon Resource Name (ARN) of the resolver rule. */
  Arn?: string;
  /** The ID of the endpoint that the rule is associated with. */
  ResolverRuleId?: string;
};
