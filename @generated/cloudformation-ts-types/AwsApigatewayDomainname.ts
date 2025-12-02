// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-domainname.json

/**
 * The ``AWS::ApiGateway::DomainName`` resource specifies a public custom domain name for your API in
 * API Gateway.
 * To create a custom domain name for private APIs, use
 * [AWS::ApiGateway::DomainNameV2](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-domainnamev2.html).
 * You can use a custom domain name to provide a URL that's more intuitive and easier to recall. For
 * more information about using custom domain names, see [Set up Custom Domain Name for an API in API
 * Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html)
 * in the *API Gateway Developer Guide*.
 */
export type AwsApigatewayDomainname = {
  DomainName?: string;
  DomainNameArn?: string;
  DistributionDomainName?: string;
  DistributionHostedZoneId?: string;
  /**
   * The endpoint configuration of this DomainName showing the endpoint types and IP address types of
   * the domain name.
   */
  EndpointConfiguration?: {
    Types?: string[];
    IpAddressType?: string;
  };
  MutualTlsAuthentication?: {
    TruststoreUri?: string;
    TruststoreVersion?: string;
  };
  RegionalDomainName?: string;
  RegionalHostedZoneId?: string;
  CertificateArn?: string;
  RegionalCertificateArn?: string;
  /**
   * The ARN of the public certificate issued by ACM to validate ownership of your custom domain. Only
   * required when configuring mutual TLS and using an ACM imported or private CA certificate ARN as the
   * RegionalCertificateArn.
   */
  OwnershipVerificationCertificateArn?: string;
  SecurityPolicy?: string;
  EndpointAccessMode?: string;
  /**
   * @default "BASE_PATH_MAPPING_ONLY"
   * @enum ["BASE_PATH_MAPPING_ONLY","ROUTING_RULE_THEN_BASE_PATH_MAPPING","ROUTING_RULE_ONLY"]
   */
  RoutingMode?: "BASE_PATH_MAPPING_ONLY" | "ROUTING_RULE_THEN_BASE_PATH_MAPPING" | "ROUTING_RULE_ONLY";
  Tags?: {
    /**
     * A string you can use to assign a value. The combination of tag keys and values can help you
     * organize and categorize your resources.
     */
    Key?: string;
    /** The value for the specified tag key. */
    Value?: string;
  }[];
};
