// This file is auto-generated. Do not edit manually.
// Source: aws-apprunner-vpcingressconnection.json

/**
 * The AWS::AppRunner::VpcIngressConnection resource is an App Runner resource that specifies an App
 * Runner VpcIngressConnection.
 */
export type AwsApprunnerVpcingressconnection = {
  /**
   * The Amazon Resource Name (ARN) of the VpcIngressConnection.
   * @minLength 1
   * @maxLength 1011
   * @pattern arn:aws(-[\w]+)*:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[0-9]{12}:(\w|/|-){1,1011}
   */
  VpcIngressConnectionArn?: string;
  /**
   * The customer-provided Vpc Ingress Connection name.
   * @minLength 4
   * @maxLength 40
   * @pattern [A-Za-z0-9][A-Za-z0-9\-_]{3,39}
   */
  VpcIngressConnectionName?: string;
  /**
   * The Amazon Resource Name (ARN) of the service.
   * @minLength 1
   * @maxLength 1011
   * @pattern arn:aws(-[\w]+)*:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[0-9]{12}:(\w|/|-){1,1011}
   */
  ServiceArn: string;
  /**
   * The current status of the VpcIngressConnection.
   * @enum ["AVAILABLE","PENDING_CREATION","PENDING_UPDATE","PENDING_DELETION","FAILED_CREATION","FAILED_UPDATE","FAILED_DELETION","DELETED"]
   */
  Status?: "AVAILABLE" | "PENDING_CREATION" | "PENDING_UPDATE" | "PENDING_DELETION" | "FAILED_CREATION" | "FAILED_UPDATE" | "FAILED_DELETION" | "DELETED";
  /**
   * The Domain name associated with the VPC Ingress Connection.
   * @minLength 1
   * @maxLength 255
   * @pattern [A-Za-z0-9*.-]{1,255}
   */
  DomainName?: string;
  IngressVpcConfiguration: {
    /** The ID of the VPC that the VPC endpoint is used in. */
    VpcId: string;
    /** The ID of the VPC endpoint that your App Runner service connects to. */
    VpcEndpointId: string;
  };
  Tags?: {
    Key?: string;
    Value?: string;
  }[];
};
