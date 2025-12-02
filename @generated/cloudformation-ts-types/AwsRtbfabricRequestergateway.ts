// This file is auto-generated. Do not edit manually.
// Source: aws-rtbfabric-requestergateway.json

/** Resource Type definition for AWS::RTBFabric::RequesterGateway Resource Type. */
export type AwsRtbfabricRequestergateway = {
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(resourceArn|internalId|(?!aws:)[a-zA-Z0-9+\-=._:/@]+)$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 1600
     */
    Value?: string;
  }[];
  Description?: string;
  VpcId: string;
  SubnetIds: string[];
  SecurityGroupIds: (unknown | unknown)[];
  GatewayId?: string;
  DomainName?: string;
  RequesterGatewayStatus?: "PENDING_CREATION" | "ACTIVE" | "PENDING_DELETION" | "DELETED" | "ERROR" | "PENDING_UPDATE" | "ISOLATED" | "PENDING_ISOLATION" | "PENDING_RESTORATION";
  CreatedTimestamp?: string;
  UpdatedTimestamp?: string;
  Arn?: string;
  ActiveLinksCount?: number;
  TotalLinksCount?: number;
};
