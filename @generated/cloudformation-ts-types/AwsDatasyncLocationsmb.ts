// This file is auto-generated. Do not edit manually.
// Source: aws-datasync-locationsmb.json

/** Resource Type definition for AWS::DataSync::LocationSMB. */
export type AwsDatasyncLocationsmb = {
  /**
   * The Amazon Resource Names (ARNs) of agents to use for a Simple Message Block (SMB) location.
   * @minItems 1
   * @maxItems 4
   */
  AgentArns: string[];
  /**
   * The name of the Windows domain that the SMB server belongs to.
   * @maxLength 253
   * @pattern ^([A-Za-z0-9]+[A-Za-z0-9-.]*)*[A-Za-z0-9-]*[A-Za-z0-9]$
   */
  Domain?: string;
  /** @default {"Version":"AUTOMATIC"} */
  MountOptions?: {
    /**
     * The specific SMB version that you want DataSync to use to mount your SMB share.
     * @enum ["AUTOMATIC","SMB1","SMB2_0","SMB2","SMB3"]
     */
    Version?: "AUTOMATIC" | "SMB1" | "SMB2_0" | "SMB2" | "SMB3";
  };
  /**
   * The password of the user who can mount the share and has the permissions to access files and
   * folders in the SMB share.
   * @maxLength 104
   * @pattern ^.{0,104}$
   */
  Password?: string;
  /**
   * The name of the SMB server. This value is the IP address or Domain Name Service (DNS) name of the
   * SMB server.
   * @maxLength 255
   * @pattern ^(([a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9\-]*[A-Za-z0-9])$
   */
  ServerHostname?: string;
  /**
   * The subdirectory in the SMB file system that is used to read data from the SMB source location or
   * write data to the SMB destination
   * @maxLength 4096
   * @pattern ^[a-zA-Z0-9_\-\+\./\(\)\$\p{Zs}]+$
   */
  Subdirectory?: string;
  /**
   * The user who can mount the share, has the permissions to access files and folders in the SMB share.
   * @maxLength 104
   * @pattern ^[^\x5B\x5D\\/:;|=,+*?]{1,104}$
   */
  User?: string;
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
   * The Amazon Resource Name (ARN) of the SMB location that is created.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):datasync:[a-z\-0-9]+:[0-9]{12}:location/loc-[0-9a-z]{17}$
   */
  LocationArn?: string;
  /**
   * The URL of the SMB location that was described.
   * @maxLength 4356
   * @pattern ^(efs|nfs|s3|smb|fsxw)://[a-zA-Z0-9./\-]+$
   */
  LocationUri?: string;
  /**
   * The authentication mode used to determine identity of user.
   * @enum ["NTLM","KERBEROS"]
   */
  AuthenticationType?: "NTLM" | "KERBEROS";
  /**
   * Specifies the IPv4 addresses for the DNS servers that your SMB file server belongs to. This
   * parameter applies only if AuthenticationType is set to KERBEROS. If you have multiple domains in
   * your environment, configuring this parameter makes sure that DataSync connects to the right SMB
   * file server.
   * @default null
   * @maxItems 2
   */
  DnsIpAddresses?: string[];
  /**
   * Specifies a service principal name (SPN), which is an identity in your Kerberos realm that has
   * permission to access the files, folders, and file metadata in your SMB file server. SPNs are case
   * sensitive and must include a prepended cifs/. For example, an SPN might look like
   * cifs/kerberosuser@EXAMPLE.COM. Your task execution will fail if the SPN that you provide for this
   * parameter doesn't match exactly what's in your keytab or krb5.conf files.
   * @minLength 1
   * @maxLength 256
   * @pattern ^.+$
   */
  KerberosPrincipal?: string;
  /**
   * The Base64 string representation of the Keytab file. Specifies your Kerberos key table (keytab)
   * file, which includes mappings between your service principal name (SPN) and encryption keys. To
   * avoid task execution errors, make sure that the SPN in the keytab file matches exactly what you
   * specify for KerberosPrincipal and in your krb5.conf file.
   * @maxLength 87384
   */
  KerberosKeytab?: string;
  /**
   * The string representation of the Krb5Conf file, or the presigned URL to access the Krb5.conf file
   * within an S3 bucket. Specifies a Kerberos configuration file (krb5.conf) that defines your Kerberos
   * realm configuration. To avoid task execution errors, make sure that the service principal name
   * (SPN) in the krb5.conf file matches exactly what you specify for KerberosPrincipal and in your
   * keytab file.
   * @maxLength 174764
   */
  KerberosKrb5Conf?: string;
  CmkSecretConfig?: {
    /**
     * Specifies the ARN for an AWS Secrets Manager secret, managed by DataSync.
     * @maxLength 2048
     * @pattern ^(arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):secretsmanager:[a-z-0-9]+:[0-9]{12}:secret:.*|)$
     */
    SecretArn?: string;
    /**
     * Specifies the ARN for the customer-managed AWS KMS key used to encrypt the secret specified for
     * SecretArn. DataSync provides this key to AWS Secrets Manager.
     * @maxLength 2048
     * @pattern ^(arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):kms:[a-z-0-9]+:[0-9]{12}:key/.*|)$
     */
    KmsKeyArn?: string;
  };
  CustomSecretConfig?: {
    /**
     * Specifies the ARN for a customer created AWS Secrets Manager secret.
     * @maxLength 2048
     * @pattern ^(arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):secretsmanager:[a-z-0-9]+:[0-9]{12}:secret:.*|)$
     */
    SecretArn: string;
    /**
     * Specifies the ARN for the AWS Identity and Access Management role that DataSync uses to access the
     * secret specified for SecretArn.
     * @maxLength 2048
     * @pattern ^(arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):iam::[0-9]{12}:role/.*|)$
     */
    SecretAccessRoleArn: string;
  };
  ManagedSecretConfig?: {
    /**
     * Specifies the ARN for an AWS Secrets Manager secret.
     * @maxLength 2048
     * @pattern ^(arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):secretsmanager:[a-z-0-9]+:[0-9]{12}:secret:.*|)$
     */
    SecretArn: string;
  };
};
