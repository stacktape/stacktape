// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-domainnamev2.json

/** Resource Type definition for AWS::ApiGateway::DomainNameV2. */
export type AwsApigatewayDomainnamev2 = {
  CertificateArn?: string;
  DomainName?: string;
  EndpointConfiguration?: {
    Types?: string[];
    IpAddressType?: string;
  };
  SecurityPolicy?: string;
  EndpointAccessMode?: string;
  Policy?: Record<string, unknown> | string;
  DomainNameId?: string;
  /** The amazon resource name (ARN) of the domain name resource. */
  DomainNameArn?: string;
  /**
   * The valid routing modes are [BASE_PATH_MAPPING_ONLY], [ROUTING_RULE_THEN_BASE_PATH_MAPPING] and
   * [ROUTING_RULE_ONLY]. All other inputs are invalid.
   * @default "BASE_PATH_MAPPING_ONLY"
   * @enum ["BASE_PATH_MAPPING_ONLY","ROUTING_RULE_THEN_BASE_PATH_MAPPING","ROUTING_RULE_ONLY"]
   */
  RoutingMode?: "BASE_PATH_MAPPING_ONLY" | "ROUTING_RULE_THEN_BASE_PATH_MAPPING" | "ROUTING_RULE_ONLY";
  Tags?: {
    Key?: string;
    Value?: string;
  }[];
};
