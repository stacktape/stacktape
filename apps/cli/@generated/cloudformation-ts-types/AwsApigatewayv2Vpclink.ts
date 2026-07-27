// This file is auto-generated. Do not edit manually.
// Source: aws-apigatewayv2-vpclink.json

/**
 * The ``AWS::ApiGatewayV2::VpcLink`` resource creates a VPC link. Supported only for HTTP APIs. The
 * VPC link status must transition from ``PENDING`` to ``AVAILABLE`` to successfully create a VPC
 * link, which can take up to 10 minutes. To learn more, see [Working with VPC Links for HTTP
 * APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vpc-links.html) in the
 * *API Gateway Developer Guide*.
 */
export type AwsApigatewayv2Vpclink = {
  VpcLinkId?: string;
  /**
   * A list of subnet IDs to include in the VPC link.
   * @uniqueItems false
   */
  SubnetIds: string[];
  /**
   * A list of security group IDs for the VPC link.
   * @uniqueItems false
   */
  SecurityGroupIds?: string[];
  /** The collection of tags. Each tag element is associated with a given resource. */
  Tags?: Record<string, string>;
  /** The name of the VPC link. */
  Name: string;
};
