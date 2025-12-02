// This file is auto-generated. Do not edit manually.
// Source: aws-rds-dbproxyendpoint.json

/** Resource schema for AWS::RDS::DBProxyEndpoint. */
export type AwsRdsDbproxyendpoint = {
  /**
   * The identifier for the DB proxy endpoint. This name must be unique for all DB proxy endpoints owned
   * by your AWS account in the specified AWS Region.
   * @maxLength 64
   * @pattern [0-z]*
   */
  DBProxyEndpointName: string;
  /**
   * The Amazon Resource Name (ARN) for the DB proxy endpoint.
   * @pattern arn:aws[A-Za-z0-9-]{0,64}:rds:[A-Za-z0-9-]{1,64}:[0-9]{12}:.*
   */
  DBProxyEndpointArn?: string;
  /**
   * The identifier for the proxy. This name must be unique for all proxies owned by your AWS account in
   * the specified AWS Region.
   * @maxLength 64
   * @pattern [0-z]*
   */
  DBProxyName: string;
  /** VPC ID to associate with the new DB proxy endpoint. */
  VpcId?: string;
  /**
   * VPC security group IDs to associate with the new DB proxy endpoint.
   * @minItems 1
   */
  VpcSecurityGroupIds?: string[];
  /**
   * VPC subnet IDs to associate with the new DB proxy endpoint.
   * @minItems 2
   */
  VpcSubnetIds: string[];
  /**
   * The endpoint that you can use to connect to the DB proxy. You include the endpoint value in the
   * connection string for a database client application.
   * @maxLength 256
   */
  Endpoint?: string;
  /**
   * The network type of the DB proxy endpoint. The network type determines the IP version that the
   * proxy endpoint supports.
   * @enum ["IPV4","IPV6","DUAL"]
   */
  EndpointNetworkType?: "IPV4" | "IPV6" | "DUAL";
  /**
   * A value that indicates whether the DB proxy endpoint can be used for read/write or read-only
   * operations.
   * @enum ["READ_WRITE","READ_ONLY"]
   */
  TargetRole?: "READ_WRITE" | "READ_ONLY";
  /**
   * A value that indicates whether this endpoint is the default endpoint for the associated DB proxy.
   * Default DB proxy endpoints always have read/write capability. Other endpoints that you associate
   * with the DB proxy can be either read/write or read-only.
   */
  IsDefault?: boolean;
  /**
   * An optional set of key-value pairs to associate arbitrary data of your choosing with the DB proxy
   * endpoint.
   */
  Tags?: {
    /**
     * @maxLength 128
     * @pattern (\w|\d|\s|\\|-|\.:=+-)*
     */
    Key?: string;
    /**
     * @maxLength 128
     * @pattern (\w|\d|\s|\\|-|\.:=+-)*
     */
    Value?: string;
  }[];
};
