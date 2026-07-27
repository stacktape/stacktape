// This file is auto-generated. Do not edit manually.
// Source: aws-odb-cloudvmcluster.json

/** The AWS::ODB::CloudVmCluster resource creates a Cloud VM Cluster */
export type AwsOdbCloudvmcluster = {
  /** The unique identifier of the Exadata infrastructure that this VM cluster belongs to. */
  CloudExadataInfrastructureId?: string;
  /** The Amazon Resource Name (ARN) of the VM cluster. */
  CloudVmClusterArn?: string;
  /** The unique identifier of the VM cluster. */
  CloudVmClusterId?: string;
  /**
   * The name of the Grid Infrastructure (GI) cluster.
   * @minLength 1
   * @maxLength 11
   * @pattern ^[a-zA-Z][a-zA-Z0-9-]*$
   */
  ClusterName?: string;
  /**
   * The OCI model compute model used when you create or clone an instance: ECPU or OCPU. An ECPU is an
   * abstracted measure of compute resources. ECPUs are based on the number of cores elastically
   * allocated from a pool of compute and storage servers. An OCPU is a legacy physical measure of
   * compute resources. OCPUs are based on the physical core of a processor with hyper-threading
   * enabled.
   */
  ComputeModel?: string;
  /**
   * The number of CPU cores enabled on the VM cluster.
   * @minimum 0
   * @maximum 368
   */
  CpuCoreCount?: number;
  /** The set of diagnostic collection options enabled for the VM cluster. */
  DataCollectionOptions?: {
    /** Indicates whether diagnostic collection is enabled for the VM cluster. */
    IsDiagnosticsEventsEnabled?: boolean;
    /** Indicates whether health monitoring is enabled for the VM cluster. */
    IsHealthMonitoringEnabled?: boolean;
    /** Indicates whether incident logs are enabled for the cloud VM cluster. */
    IsIncidentLogsEnabled?: boolean;
  };
  /** The size of the data disk group, in terabytes (TB), that's allocated for the VM cluster. */
  DataStorageSizeInTBs?: number;
  /** The amount of local node storage, in gigabytes (GB), that's allocated for the VM cluster. */
  DbNodeStorageSizeInGBs?: number;
  /**
   * The user-friendly name for the VM cluster.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z_](?!.*--)[a-zA-Z0-9_-]*$
   */
  DisplayName?: string;
  /**
   * The type of redundancy configured for the VM cluster. NORMAL is 2-way redundancy. HIGH is 3-way
   * redundancy.
   */
  DiskRedundancy?: string;
  /** The domain of the VM cluster. */
  Domain?: string;
  /**
   * The software version of the Oracle Grid Infrastructure (GI) for the VM cluster.
   * @minLength 1
   * @maxLength 255
   */
  GiVersion?: string;
  /**
   * The host name for the VM cluster.
   * @minLength 1
   * @maxLength 12
   * @pattern ^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$
   */
  Hostname?: string;
  /** Indicates whether database backups to local Exadata storage is enabled for the VM cluster. */
  IsLocalBackupEnabled?: boolean;
  /** Indicates whether the VM cluster is configured with a sparse disk group. */
  IsSparseDiskgroupEnabled?: boolean;
  /**
   * The Oracle license model applied to the VM cluster.
   * @enum ["BRING_YOUR_OWN_LICENSE","LICENSE_INCLUDED"]
   */
  LicenseModel?: "BRING_YOUR_OWN_LICENSE" | "LICENSE_INCLUDED";
  /** The port number configured for the listener on the VM cluster. */
  ListenerPort?: number;
  /** The amount of memory, in gigabytes (GB), that's allocated for the VM cluster. */
  MemorySizeInGBs?: number;
  /** The number of nodes in the VM cluster. */
  NodeCount?: number;
  /** The unique identifier of the ODB network for the VM cluster. */
  OdbNetworkId?: string;
  /** The OCID of the VM cluster. */
  Ocid?: string;
  /** The name of the OCI resource anchor for the VM cluster. */
  OciResourceAnchorName?: string;
  /** The HTTPS link to the VM cluster in OCI. */
  OciUrl?: string;
  /**
   * The FQDN of the DNS record for the Single Client Access Name (SCAN) IP addresses that are
   * associated with the VM cluster.
   */
  ScanDnsName?: string;
  /**
   * The OCID of the SCAN IP addresses that are associated with the VM cluster.
   * @uniqueItems false
   */
  ScanIpIds?: string[];
  /**
   * Property description not available.
   * @minimum 1024
   * @maximum 8999
   */
  ScanListenerPortTcp?: number;
  /** The hardware model name of the Exadata infrastructure that's running the VM cluster. */
  Shape?: string;
  /**
   * The public key portion of one or more key pairs used for SSH access to the VM cluster.
   * @uniqueItems false
   */
  SshPublicKeys?: string[];
  /** The amount of local node storage, in gigabytes (GB), that's allocated to the VM cluster. */
  StorageSizeInGBs?: number;
  /**
   * The operating system version of the image chosen for the VM cluster.
   * @minLength 1
   * @maxLength 255
   */
  SystemVersion?: string;
  /**
   * Tags to assign to the Vm Cluster.
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
  /**
   * The time zone of the VM cluster.
   * @minLength 1
   * @maxLength 255
   */
  TimeZone?: string;
  /**
   * The virtual IP (VIP) addresses that are associated with the VM cluster. Oracle's Cluster Ready
   * Services (CRS) creates and maintains one VIP address for each node in the VM cluster to enable
   * failover. If one node fails, the VIP is reassigned to another active node in the cluster.
   * @uniqueItems false
   */
  VipIds?: string[];
  /**
   * The list of database servers for the VM cluster.
   * @uniqueItems false
   */
  DbServers?: string[];
  /**
   * The DB nodes that are implicitly created and managed as part of this VM Cluster.
   * @minLength 1
   * @uniqueItems true
   */
  DbNodes?: {
    /** The unique identifier of the DB node. */
    DbNodeId?: string;
    /** The Amazon Resource Name (ARN) of the DB node. */
    DbNodeArn?: string;
    /** The current status of the DB node. */
    Status?: string;
    /** The number of CPU cores enabled on the DB node. */
    CpuCoreCount?: number;
    /** The amount of memory, in gigabytes (GB), that allocated on the DB node. */
    MemorySizeInGBs?: number;
    /** The amount of local node storage, in gigabytes (GB), that's allocated on the DB node. */
    DbNodeStorageSizeInGBs?: number;
    /** The host name for the DB node. */
    Hostname?: string;
    /** The unique identifier of the database server that's associated with the DB node. */
    DbServerId: string;
    /** The OCID of the DB node. */
    Ocid?: string;
    /** The OCID of the DB system. */
    DbSystemId?: string;
    /** The Oracle Cloud ID (OCID) of the backup IP address that's associated with the DB node. */
    BackupIpId?: string;
    /** The OCID of the second backup virtual network interface card (VNIC) for the DB node. */
    BackupVnic2Id?: string;
    /** The OCID of the VNIC. */
    VnicId?: string;
    /** The OCID of the second VNIC. */
    Vnic2Id?: string;
    /** The OCID of the host IP address that's associated with the DB node. */
    HostIpId?: string;
    /** @uniqueItems false */
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
  }[];
};
