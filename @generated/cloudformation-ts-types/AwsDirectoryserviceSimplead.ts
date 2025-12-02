// This file is auto-generated. Do not edit manually.
// Source: aws-directoryservice-simplead.json

/** Resource Type definition for AWS::DirectoryService::SimpleAD */
export type AwsDirectoryserviceSimplead = {
  /** The unique identifier for a directory. */
  DirectoryId?: string;
  /** The alias for a directory. */
  Alias?: string;
  /**
   * The IP addresses of the DNS servers for the directory, such as [ "172.31.3.154", "172.31.63.203" ].
   * @uniqueItems false
   */
  DnsIpAddresses?: string[];
  /** The name of the configuration set. */
  CreateAlias?: boolean;
  /** Description for the directory. */
  Description?: string;
  /** Whether to enable single sign-on for a Simple Active Directory in AWS. */
  EnableSso?: boolean;
  /** The fully qualified domain name for the AWS Managed Simple AD directory. */
  Name: string;
  /** The password for the default administrative user named Admin. */
  Password?: string;
  /** The NetBIOS name for your domain. */
  ShortName?: string;
  /** The size of the directory. */
  Size: string;
  /** VPC settings of the Simple AD directory server in AWS. */
  VpcSettings: {
    /**
     * The identifiers of the subnets for the directory servers. The two subnets must be in different
     * Availability Zones. AWS Directory Service specifies a directory server and a DNS server in each of
     * these subnets.
     * @uniqueItems true
     */
    SubnetIds: string[];
    /** The identifier of the VPC in which to create the directory. */
    VpcId: string;
  };
};
