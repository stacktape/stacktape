// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-vpclink.json

/**
 * The ``AWS::ApiGateway::VpcLink`` resource creates an API Gateway VPC link for a REST API to access
 * resources in an Amazon Virtual Private Cloud (VPC). For more information, see
 * [vpclink:create](https://docs.aws.amazon.com/apigateway/latest/api/API_CreateVpcLink.html) in the
 * ``Amazon API Gateway REST API Reference``.
 */
export type AwsApigatewayVpclink = {
  Name: string;
  Description?: string;
  /**
   * An array of arbitrary tags (key-value pairs) to associate with the VPC link.
   * @uniqueItems true
   */
  Tags?: {
    /** The value for the specified tag key. */
    Value: string;
    /**
     * A string you can use to assign a value. The combination of tag keys and values can help you
     * organize and categorize your resources.
     */
    Key: string;
  }[];
  /** @uniqueItems false */
  TargetArns: string[];
  VpcLinkId?: string;
};
