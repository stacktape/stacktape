// This file is auto-generated. Do not edit manually.
// Source: aws-datasync-storagesystem.json

/** Resource schema for AWS::DataSync::StorageSystem. */
export type AwsDatasyncStoragesystem = {
  ServerConfiguration: {
    /**
     * The domain name or IP address of the storage system's management interface.
     * @maxLength 255
     * @pattern ^(([a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9\-]*[A-Za-z0-9])$
     */
    ServerHostname: string;
    /**
     * The network port needed to access the system's management interface
     * @minimum 1
     * @maximum 65535
     */
    ServerPort?: number;
  };
  ServerCredentials?: {
    /**
     * The username for your storage system's management interface.
     * @maxLength 1024
     */
    Username: string;
    /**
     * The password for your storage system's management interface
     * @maxLength 1024
     */
    Password: string;
  };
  /**
   * The ARN of a secret stored by AWS Secrets Manager.
   * @maxLength 2048
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):secretsmanager:[a-z\-0-9]+:[0-9]{12}:secret:.*
   */
  SecretsManagerArn?: string;
  /**
   * The type of on-premises storage system that DataSync Discovery will analyze.
   * @enum ["NetAppONTAP"]
   */
  SystemType: "NetAppONTAP";
  /**
   * The ARN of the DataSync agent that connects to and reads from the on-premises storage system's
   * management interface.
   * @minItems 1
   * @maxItems 1
   */
  AgentArns: string[];
  /**
   * The ARN of the Amazon CloudWatch log group used to monitor and log discovery job events.
   * @maxLength 562
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):logs:[a-z\-0-9]+:[0-9]{12}:log-group:([^:\*]*)(:\*)?$
   */
  CloudWatchLogGroupArn?: string;
  /**
   * A familiar name for the on-premises storage system.
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9\s+=._:@/-]+$
   */
  Name?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key for an AWS resource tag.
     * @minLength 1
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9\s+=._:/-]+$
     */
    Key: string;
    /**
     * The value for an AWS resource tag.
     * @minLength 1
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9\s+=._:@/-]+$
     */
    Value: string;
  }[];
  /**
   * The ARN of the on-premises storage system added to DataSync Discovery.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):datasync:[a-z\-0-9]+:[0-9]{12}:system/storage-system-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$
   */
  StorageSystemArn?: string;
  /**
   * Indicates whether the DataSync agent can access the on-premises storage system.
   * @enum ["PASS","FAIL","UNKNOWN"]
   */
  ConnectivityStatus?: "PASS" | "FAIL" | "UNKNOWN";
};
