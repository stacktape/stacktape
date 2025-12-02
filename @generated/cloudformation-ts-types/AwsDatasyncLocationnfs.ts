// This file is auto-generated. Do not edit manually.
// Source: aws-datasync-locationnfs.json

/** Resource schema for AWS::DataSync::LocationNFS */
export type AwsDatasyncLocationnfs = {
  /** @default {"Version":"AUTOMATIC"} */
  MountOptions?: {
    /**
     * The specific NFS version that you want DataSync to use to mount your NFS share.
     * @enum ["AUTOMATIC","NFS3","NFS4_0","NFS4_1"]
     */
    Version?: "AUTOMATIC" | "NFS3" | "NFS4_0" | "NFS4_1";
  };
  OnPremConfig: {
    /**
     * ARN(s) of the agent(s) to use for an NFS location.
     * @minItems 1
     * @maxItems 4
     */
    AgentArns: string[];
  };
  /**
   * The name of the NFS server. This value is the IP address or DNS name of the NFS server.
   * @maxLength 255
   * @pattern ^(([a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9\-]*[A-Za-z0-9])$
   */
  ServerHostname?: string;
  /**
   * The subdirectory in the NFS file system that is used to read data from the NFS source location or
   * write data to the NFS destination.
   * @maxLength 4096
   * @pattern ^[a-zA-Z0-9_\-\+\./\(\)\$\p{Zs}]+$
   */
  Subdirectory?: string;
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
   * The Amazon Resource Name (ARN) of the NFS location.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):datasync:[a-z\-0-9]+:[0-9]{12}:location/loc-[0-9a-z]{17}$
   */
  LocationArn?: string;
  /**
   * The URL of the NFS location that was described.
   * @maxLength 4356
   * @pattern ^(efs|nfs|s3|smb|fsxw)://[a-zA-Z0-9./\-]+$
   */
  LocationUri?: string;
};
