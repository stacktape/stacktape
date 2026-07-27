// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-domainnameaccessassociation.json

/** Resource Type definition for AWS::ApiGateway::DomainNameAccessAssociation. */
export type AwsApigatewayDomainnameaccessassociation = {
  /** The amazon resource name (ARN) of the domain name access association resource. */
  DomainNameAccessAssociationArn?: string;
  /** The amazon resource name (ARN) of the domain name resource. */
  DomainNameArn: string;
  /** The source of the domain name access association resource. */
  AccessAssociationSource: string;
  /**
   * The source type of the domain name access association resource.
   * @enum ["VPCE"]
   */
  AccessAssociationSourceType: "VPCE";
  /**
   * An array of arbitrary tags (key-value pairs) to associate with the domainname access association.
   * @uniqueItems false
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
