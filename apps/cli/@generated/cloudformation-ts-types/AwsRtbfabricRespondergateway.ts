// This file is auto-generated. Do not edit manually.
// Source: aws-rtbfabric-respondergateway.json

/** Resource Type definition for AWS::RTBFabric::ResponderGateway Resource Type */
export type AwsRtbfabricRespondergateway = {
  UpdatedTimestamp?: string;
  TrustStoreConfiguration?: {
    CertificateAuthorityCertificates: string[];
  };
  Description?: string;
  CreatedTimestamp?: string;
  DomainName?: string;
  Port: number;
  GatewayId?: string;
  ManagedEndpointConfiguration?: unknown | unknown;
  SubnetIds: string[];
  SecurityGroupIds: (unknown | unknown)[];
  VpcId: string;
  ResponderGatewayStatus?: "PENDING_CREATION" | "ACTIVE" | "PENDING_DELETION" | "DELETED" | "ERROR" | "PENDING_UPDATE" | "ISOLATED" | "PENDING_ISOLATION" | "PENDING_RESTORATION";
  Arn?: string;
  Protocol: "HTTP" | "HTTPS";
  Tags?: {
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
};
