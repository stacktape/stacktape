// This file is auto-generated. Do not edit manually.
// Source: aws-odb-cloudexadatainfrastructure.json

/** The AWS::ODB::CloudExadataInfrastructure resource creates an Exadata Infrastructure */
export type AwsOdbCloudexadatainfrastructure = {
  /** The number of storage servers requested for the Exadata infrastructure. */
  ActivatedStorageCount?: number;
  /** The number of storage servers requested for the Exadata infrastructure. */
  AdditionalStorageCount?: number;
  /**
   * The name of the Availability Zone (AZ) where the Exadata infrastructure is located.
   * @minLength 1
   * @maxLength 255
   */
  AvailabilityZone?: string;
  /**
   * The AZ ID of the AZ where the Exadata infrastructure is located.
   * @minLength 1
   * @maxLength 255
   */
  AvailabilityZoneId?: string;
  /** The amount of available storage, in gigabytes (GB), for the Exadata infrastructure. */
  AvailableStorageSizeInGBs?: number;
  /** The Amazon Resource Name (ARN) for the Exadata infrastructure. */
  CloudExadataInfrastructureArn?: string;
  /** The unique identifier for the Exadata infrastructure. */
  CloudExadataInfrastructureId?: string;
  /**
   * The scheduling details for the maintenance window. Patching and system updates take place during
   * the maintenance window.
   */
  MaintenanceWindow?: {
    /**
     * The timeout duration for custom actions in minutes.
     * @minimum 15
     * @maximum 120
     */
    CustomActionTimeoutInMins?: number;
    /**
     * The days of the week when maintenance can be performed.
     * @uniqueItems true
     */
    DaysOfWeek?: ("MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY")[];
    /**
     * The hours of the day when maintenance can be performed.
     * @uniqueItems true
     */
    HoursOfDay?: number[];
    /** Indicates whether custom action timeout is enabled. */
    IsCustomActionTimeoutEnabled?: boolean;
    /**
     * The lead time in weeks before the maintenance window.
     * @minimum 1
     * @maximum 4
     */
    LeadTimeInWeeks?: number;
    /**
     * The months when maintenance can be performed.
     * @uniqueItems true
     */
    Months?: ("JANUARY" | "FEBRUARY" | "MARCH" | "APRIL" | "MAY" | "JUNE" | "JULY" | "AUGUST" | "SEPTEMBER" | "OCTOBER" | "NOVEMBER" | "DECEMBER")[];
    /** The patching mode for the maintenance window. */
    PatchingMode?: string;
    /** The preference for the maintenance window scheduling. */
    Preference?: string;
    /**
     * The weeks of the month when maintenance can be performed.
     * @uniqueItems true
     */
    WeeksOfMonth?: number[];
  };
  /** The number of database servers for the Exadata infrastructure. */
  ComputeCount?: number;
  /**
   * The OCI model compute model used when you create or clone an instance: ECPU or OCPU. An ECPU is an
   * abstracted measure of compute resources. ECPUs are based on the number of cores elastically
   * allocated from a pool of compute and storage servers. An OCPU is a legacy physical measure of
   * compute resources. OCPUs are based on the physical core of a processor with hyper-threading
   * enabled.
   */
  ComputeModel?: string;
  /** The total number of CPU cores that are allocated to the Exadata infrastructure. */
  CpuCount?: number;
  /**
   * The email addresses of contacts to receive notification from Oracle about maintenance updates for
   * the Exadata infrastructure.
   * @uniqueItems false
   */
  CustomerContactsToSendToOCI?: {
    /** The email address of the contact. */
    Email?: string;
  }[];
  /** The size of the Exadata infrastructure's data disk group, in terabytes (TB). */
  DataStorageSizeInTBs?: number;
  /**
   * The database server model type of the Exadata infrastructure. For the list of valid model names,
   * use the ListDbSystemShapes operation.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9_\/.=-]+$
   */
  DatabaseServerType?: string;
  /** The size of the Exadata infrastructure's local node storage, in gigabytes (GB). */
  DbNodeStorageSizeInGBs?: number;
  /** The software version of the database servers (dom0) in the Exadata infrastructure. */
  DbServerVersion?: string;
  /**
   * The user-friendly name for the Exadata infrastructure.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z_](?!.*--)[a-zA-Z0-9_-]*$
   */
  DisplayName?: string;
  /** The total number of CPU cores available on the Exadata infrastructure. */
  MaxCpuCount?: number;
  /**
   * The total amount of data disk group storage, in terabytes (TB), that's available on the Exadata
   * infrastructure.
   */
  MaxDataStorageInTBs?: number;
  /**
   * The total amount of local node storage, in gigabytes (GB), that's available on the Exadata
   * infrastructure.
   */
  MaxDbNodeStorageSizeInGBs?: number;
  /** The total amount of memory, in gigabytes (GB), that's available on the Exadata infrastructure. */
  MaxMemoryInGBs?: number;
  /** The amount of memory, in gigabytes (GB), that's allocated on the Exadata infrastructure. */
  MemorySizeInGBs?: number;
  /** The name of the OCI resource anchor for the Exadata infrastructure. */
  OciResourceAnchorName?: string;
  /** The HTTPS link to the Exadata infrastructure in OCI. */
  OciUrl?: string;
  /** The OCID of the Exadata infrastructure. */
  Ocid?: string;
  /**
   * The model name of the Exadata infrastructure.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9_\/.=-]+$
   */
  Shape?: string;
  /** The number of storage servers that are activated for the Exadata infrastructure. */
  StorageCount?: number;
  /**
   * The storage server model type of the Exadata infrastructure. For the list of valid model names, use
   * the ListDbSystemShapes operation.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9_\/.=-]+$
   */
  StorageServerType?: string;
  /** The software version of the storage servers on the Exadata infrastructure. */
  StorageServerVersion?: string;
  /**
   * Tags to assign to the Exadata Infrastructure.
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
  /** The total amount of storage, in gigabytes (GB), on the the Exadata infrastructure. */
  TotalStorageSizeInGBs?: number;
  /**
   * The list of database server identifiers for the Exadata infrastructure.
   * @uniqueItems false
   */
  DbServerIds?: string[];
};
