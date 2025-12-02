// This file is auto-generated. Do not edit manually.
// Source: aws-timestream-influxdbinstance.json

/** The AWS::Timestream::InfluxDBInstance resource creates an InfluxDB instance. */
export type AwsTimestreamInfluxdbinstance = {
  /**
   * The username for the InfluxDB instance.
   * @minLength 1
   * @maxLength 64
   */
  Username?: string;
  /**
   * The password for the InfluxDB instance.
   * @minLength 8
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9]+$
   */
  Password?: string;
  /**
   * The organization for the InfluxDB instance.
   * @minLength 1
   * @maxLength 64
   */
  Organization?: string;
  /**
   * The bucket for the InfluxDB instance.
   * @minLength 2
   * @maxLength 64
   * @pattern ^[^_][^"]*$
   */
  Bucket?: string;
  /**
   * The compute instance of the InfluxDB instance.
   * @enum ["db.influx.medium","db.influx.large","db.influx.xlarge","db.influx.2xlarge","db.influx.4xlarge","db.influx.8xlarge","db.influx.12xlarge","db.influx.16xlarge","db.influx.24xlarge"]
   */
  DbInstanceType?: "db.influx.medium" | "db.influx.large" | "db.influx.xlarge" | "db.influx.2xlarge" | "db.influx.4xlarge" | "db.influx.8xlarge" | "db.influx.12xlarge" | "db.influx.16xlarge" | "db.influx.24xlarge";
  /**
   * A list of EC2 subnet IDs for this InfluxDB instance.
   * @minItems 1
   * @maxItems 3
   */
  VpcSubnetIds?: string[];
  /**
   * A list of Amazon EC2 VPC security groups to associate with this InfluxDB instance.
   * @minItems 1
   * @maxItems 5
   */
  VpcSecurityGroupIds?: string[];
  /**
   * Attach a public IP to the customer ENI.
   * @default false
   */
  PubliclyAccessible?: boolean;
  /**
   * The storage type of the InfluxDB instance.
   * @enum ["InfluxIOIncludedT1","InfluxIOIncludedT2","InfluxIOIncludedT3"]
   */
  DbStorageType?: "InfluxIOIncludedT1" | "InfluxIOIncludedT2" | "InfluxIOIncludedT3";
  /**
   * The allocated storage for the InfluxDB instance.
   * @minimum 20
   * @maximum 16384
   */
  AllocatedStorage?: number;
  /**
   * The name of an existing InfluxDB parameter group.
   * @minLength 3
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9]+$
   */
  DbParameterGroupIdentifier?: string;
  /**
   * The port number on which InfluxDB accepts connections.
   * @minimum 1024
   * @maximum 65535
   */
  Port?: number;
  /**
   * Network type of the InfluxDB Instance.
   * @enum ["IPV4","DUAL"]
   */
  NetworkType?: "IPV4" | "DUAL";
  /** Configuration for sending logs to customer account from the InfluxDB instance. */
  LogDeliveryConfiguration?: {
    /** S3 configuration for sending logs to customer account from the InfluxDB instance. */
    S3Configuration: {
      /**
       * The bucket name for logs to be sent from the InfluxDB instance
       * @minLength 3
       * @maxLength 63
       * @pattern ^[0-9a-z]+[0-9a-z\.\-]*[0-9a-z]+$
       */
      BucketName: string;
      /** Specifies whether logging to customer specified bucket is enabled. */
      Enabled: boolean;
    };
  };
  /**
   * Status of the InfluxDB Instance.
   * @enum ["CREATING","AVAILABLE","DELETING","MODIFYING","UPDATING","UPDATING_DEPLOYMENT_TYPE","UPDATING_INSTANCE_TYPE","DELETED","FAILED"]
   */
  Status?: "CREATING" | "AVAILABLE" | "DELETING" | "MODIFYING" | "UPDATING" | "UPDATING_DEPLOYMENT_TYPE" | "UPDATING_INSTANCE_TYPE" | "DELETED" | "FAILED";
  /**
   * The Amazon Resource Name (ARN) that is associated with the InfluxDB instance.
   * @minLength 1
   * @maxLength 1011
   * @pattern ^arn:aws[a-z\-]*:timestream\-influxdb:[a-z0-9\-]+:[0-9]{12}:(db\-instance)/[a-zA-Z0-9]{3,64}$
   */
  Arn?: string;
  /**
   * The unique name that is associated with the InfluxDB instance.
   * @minLength 3
   * @maxLength 40
   * @pattern ^[a-zA-Z][a-zA-Z0-9]*(-[a-zA-Z0-9]+)*$
   */
  Name?: string;
  /** The Availability Zone (AZ) where the InfluxDB instance is created. */
  AvailabilityZone?: string;
  /**
   * The Secondary Availability Zone (AZ) where the InfluxDB instance is created, if DeploymentType is
   * set as WITH_MULTIAZ_STANDBY.
   */
  SecondaryAvailabilityZone?: string;
  /** The connection endpoint for the InfluxDB instance. */
  Endpoint?: string;
  /**
   * The Auth parameters secret Amazon Resource name (ARN) that is associated with the InfluxDB
   * instance.
   * @pattern ^arn:[a-z]*:secretsmanager:[a-z\-0-9]*:[0-9]*:secret:[a-zA-Z0-9\-]*
   */
  InfluxAuthParametersSecretArn?: string;
  /**
   * The service generated unique identifier for InfluxDB instance.
   * @minLength 3
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9]+$
   */
  Id?: string;
  /**
   * Deployment type of the InfluxDB Instance.
   * @enum ["SINGLE_AZ","WITH_MULTIAZ_STANDBY"]
   */
  DeploymentType?: "SINGLE_AZ" | "WITH_MULTIAZ_STANDBY";
  /**
   * An arbitrary set of tags (key-value pairs) for this DB instance.
   * @minItems 1
   * @maxItems 200
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
};
