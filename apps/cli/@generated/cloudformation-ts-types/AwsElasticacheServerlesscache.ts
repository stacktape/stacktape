// This file is auto-generated. Do not edit manually.
// Source: aws-elasticache-serverlesscache.json

/** The AWS::ElastiCache::ServerlessCache resource creates an Amazon ElastiCache Serverless Cache. */
export type AwsElasticacheServerlesscache = {
  /** The name of the Serverless Cache. This value must be unique. */
  ServerlessCacheName: string;
  /** The description of the Serverless Cache. */
  Description?: string;
  /** The engine name of the Serverless Cache. */
  Engine: string;
  /** The major engine version of the Serverless Cache. */
  MajorEngineVersion?: string;
  /** The full engine version of the Serverless Cache. */
  FullEngineVersion?: string;
  CacheUsageLimits?: {
    DataStorage?: {
      /** The minimum cached data capacity of the Serverless Cache. */
      Minimum?: number;
      /** The maximum cached data capacity of the Serverless Cache. */
      Maximum?: number;
      /**
       * The unit of cached data capacity of the Serverless Cache.
       * @enum ["GB"]
       */
      Unit: "GB";
    };
    ECPUPerSecond?: {
      /** The minimum ECPU per second of the Serverless Cache. */
      Minimum?: number;
      /** The maximum ECPU per second of the Serverless Cache. */
      Maximum?: number;
    };
  };
  /** The ID of the KMS key used to encrypt the cluster. */
  KmsKeyId?: string;
  /**
   * One or more Amazon VPC security groups associated with this Serverless Cache.
   * @uniqueItems true
   */
  SecurityGroupIds?: string[];
  /**
   * The ARN's of snapshot to restore Serverless Cache.
   * @uniqueItems true
   */
  SnapshotArnsToRestore?: string[];
  /**
   * An array of key-value pairs to apply to this Serverless Cache.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with 'aws:'. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z0-9 _\.\/=+:\-@]*$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length. You
     * can use any of the following characters: the set of Unicode letters, digits, whitespace, _, ., /,
     * =, +, and -.
     * @minLength 0
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9 _\.\/=+:\-@]*$
     */
    Value?: string;
  }[];
  /** The ID of the user group. */
  UserGroupId?: string;
  /**
   * The subnet id's of the Serverless Cache.
   * @uniqueItems true
   */
  SubnetIds?: string[];
  /** The snapshot retention limit of the Serverless Cache. */
  SnapshotRetentionLimit?: number;
  /**
   * The daily time range (in UTC) during which the service takes automatic snapshot of the Serverless
   * Cache.
   */
  DailySnapshotTime?: string;
  /** The creation time of the Serverless Cache. */
  CreateTime?: string;
  /** The status of the Serverless Cache. */
  Status?: string;
  Endpoint?: {
    /** Endpoint address. */
    Address?: string;
    /** Endpoint port. */
    Port?: string;
  };
  ReaderEndpoint?: {
    /** Endpoint address. */
    Address?: string;
    /** Endpoint port. */
    Port?: string;
  };
  /** The ARN of the Serverless Cache. */
  ARN?: string;
  /** The final snapshot name which is taken before Serverless Cache is deleted. */
  FinalSnapshotName?: string;
};
