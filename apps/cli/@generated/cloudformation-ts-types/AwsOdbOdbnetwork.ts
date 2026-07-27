// This file is auto-generated. Do not edit manually.
// Source: aws-odb-odbnetwork.json

/** The AWS::ODB::OdbNetwork resource creates an ODB Network */
export type AwsOdbOdbnetwork = {
  /**
   * The AWS Availability Zone (AZ) where the ODB network is located.
   * @minLength 1
   * @maxLength 255
   */
  AvailabilityZone?: string;
  /**
   * The AZ ID of the AZ where the ODB network is located.
   * @minLength 1
   * @maxLength 255
   */
  AvailabilityZoneId?: string;
  /**
   * The CIDR range of the backup subnet in the ODB network.
   * @minLength 1
   * @maxLength 255
   */
  BackupSubnetCidr?: string;
  /**
   * The CIDR range of the client subnet in the ODB network.
   * @minLength 1
   * @maxLength 255
   */
  ClientSubnetCidr?: string;
  /**
   * The domain name to use for the resources in the ODB network.
   * @minLength 1
   * @maxLength 255
   */
  CustomDomainName?: string;
  /**
   * The DNS prefix to the default DNS domain name. The default DNS domain name is oraclevcn.com.
   * @minLength 1
   * @maxLength 255
   */
  DefaultDnsPrefix?: string;
  /** Specifies whether to delete associated OCI networking resources along with the ODB network. */
  DeleteAssociatedResources?: boolean;
  /**
   * The user-friendly name of the ODB network.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z_](?!.*--)[a-zA-Z0-9_-]*$
   */
  DisplayName?: string;
  /**
   * The unique identifier of the OCI network anchor for the ODB network.
   * @minLength 1
   * @maxLength 255
   */
  OciNetworkAnchorId?: string;
  /** The name of the OCI resource anchor that's associated with the ODB network. */
  OciResourceAnchorName?: string;
  /** The URL for the VCN that's associated with the ODB network. */
  OciVcnUrl?: string;
  /** The Amazon Resource Name (ARN) of the ODB network. */
  OdbNetworkArn?: string;
  /** The unique identifier of the ODB network. */
  OdbNetworkId?: string;
  /**
   * Specifies the configuration for Amazon S3 access from the ODB network.
   * @enum ["ENABLED","DISABLED"]
   */
  S3Access?: "ENABLED" | "DISABLED";
  /** Specifies the endpoint policy for Amazon S3 access from the ODB network. */
  S3PolicyDocument?: string;
  /**
   * Tags to assign to the Odb Network.
   * @uniqueItems false
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that's 1 to 128 Unicode characters in length and
     * can't be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., :, /, =, +, @, -, and ".
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that's 1 to 256 characters in length. You can use
     * any of the following characters: the set of Unicode letters, digits, whitespace, _, ., /, =, +, and
     * -.
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
  ManagedServices?: {
    /** The Amazon Resource Name (ARN) of the service network. */
    ServiceNetworkArn?: string;
    /** The Amazon Resource Name (ARN) of the resource gateway. */
    ResourceGatewayArn?: string;
    /**
     * The IPv4 CIDR blocks for the managed services.
     * @uniqueItems false
     */
    ManagedServicesIpv4Cidrs?: string[];
    /** The service network endpoint configuration. */
    ServiceNetworkEndpoint?: {
      /** The identifier of the VPC endpoint. */
      VpcEndpointId?: string;
      /**
       * The type of the VPC endpoint.
       * @enum ["SERVICENETWORK"]
       */
      VpcEndpointType?: "SERVICENETWORK";
    };
    /** The managed Amazon S3 backup access configuration. */
    ManagedS3BackupAccess?: {
      /** The status of the managed Amazon S3 backup access. */
      Status?: "ENABLED" | "ENABLING" | "DISABLED" | "DISABLING";
      /**
       * The IPv4 addresses for the managed Amazon S3 backup access.
       * @uniqueItems false
       */
      Ipv4Addresses?: string[];
    };
    /** The Zero-ETL access configuration. */
    ZeroEtlAccess?: {
      /** The status of the Zero-ETL access. */
      Status?: "ENABLED" | "ENABLING" | "DISABLED" | "DISABLING";
      /** The CIDR block for the Zero-ETL access. */
      Cidr?: string;
    };
    /** The Amazon S3 access configuration. */
    S3Access?: {
      /** The status of the Amazon S3 access. */
      Status?: "ENABLED" | "ENABLING" | "DISABLED" | "DISABLING";
      /**
       * The IPv4 addresses for the Amazon S3 access.
       * @uniqueItems false
       */
      Ipv4Addresses?: string[];
      /** The domain name for the Amazon S3 access. */
      DomainName?: string;
      /** The endpoint policy for the Amazon S3 access. */
      S3PolicyDocument?: string;
    };
  };
  /**
   * Specifies the configuration for Zero-ETL access from the ODB network.
   * @enum ["ENABLED","DISABLED"]
   */
  ZeroEtlAccess?: "ENABLED" | "DISABLED";
};
