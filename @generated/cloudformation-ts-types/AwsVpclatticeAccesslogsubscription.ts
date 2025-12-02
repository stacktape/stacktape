// This file is auto-generated. Do not edit manually.
// Source: aws-vpclattice-accesslogsubscription.json

/**
 * Enables access logs to be sent to Amazon CloudWatch, Amazon S3, and Amazon Kinesis Data Firehose.
 * The service network owner can use the access logs to audit the services in the network. The service
 * network owner will only see access logs from clients and services that are associated with their
 * service network. Access log entries represent traffic originated from VPCs associated with that
 * network.
 */
export type AwsVpclatticeAccesslogsubscription = {
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:accesslogsubscription/als-[0-9a-z]{17}$
   */
  Arn?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn(:[a-z0-9]+([.-][a-z0-9]+)*){2}(:([a-z0-9]+([.-][a-z0-9]+)*)?){2}:([^/].*)?$
   */
  DestinationArn: string;
  /**
   * @minLength 21
   * @maxLength 21
   * @pattern ^als-[0-9a-z]{17}$
   */
  Id?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn(:[a-z0-9]+([.-][a-z0-9]+)*){2}(:([a-z0-9]+([.-][a-z0-9]+)*)?){2}:((servicenetwork/sn)|(service/svc)|(resourceconfiguration/rcfg))-[0-9a-z]{17}$
   */
  ResourceArn?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^((sn)|(svc))-[0-9a-z]{17}$
   */
  ResourceId?: string;
  /**
   * @minLength 17
   * @maxLength 2048
   * @pattern ^((((sn)|(svc)|(rcfg))-[0-9a-z]{17})|(arn(:[a-z0-9]+([.-][a-z0-9]+)*){2}(:([a-z0-9]+([.-][a-z0-9]+)*)?){2}:((servicenetwork/sn)|(resourceconfiguration/rcfg)|(service/svc))-[0-9a-z]{17}))$
   */
  ResourceIdentifier?: string;
  /** @enum ["SERVICE","RESOURCE"] */
  ServiceNetworkLogType?: "SERVICE" | "RESOURCE";
  /**
   * @minItems 0
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
