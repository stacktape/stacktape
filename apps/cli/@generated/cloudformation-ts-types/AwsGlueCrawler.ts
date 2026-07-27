// This file is auto-generated. Do not edit manually.
// Source: aws-glue-crawler.json

/** Resource Type definition for AWS::Glue::Crawler */
export type AwsGlueCrawler = {
  /**
   * A list of UTF-8 strings that specify the names of custom classifiers that are associated with the
   * crawler.
   * @uniqueItems false
   */
  Classifiers?: string[];
  /** A description of the crawler. */
  Description?: string;
  SchemaChangePolicy?: {
    /**
     * The update behavior when the crawler finds a changed schema. A value of LOG specifies that if a
     * table or a partition already exists, and a change is detected, do not update it, only log that a
     * change was detected. Add new tables and new partitions (including on existing tables). A value of
     * UPDATE_IN_DATABASE specifies that if a table or partition already exists, and a change is detected,
     * update it. Add new tables and partitions.
     */
    UpdateBehavior?: string;
    /**
     * The deletion behavior when the crawler finds a deleted object. A value of LOG specifies that if a
     * table or partition is found to no longer exist, do not delete it, only log that it was found to no
     * longer exist. A value of DELETE_FROM_DATABASE specifies that if a table or partition is found to
     * have been removed, delete it from the database. A value of DEPRECATE_IN_DATABASE specifies that if
     * a table has been found to no longer exist, to add a property to the table that says 'DEPRECATED'
     * and includes a timestamp with the time of deprecation.
     */
    DeleteBehavior?: string;
  };
  /**
   * Crawler configuration information. This versioned JSON string allows users to specify aspects of a
   * crawler's behavior.
   */
  Configuration?: string;
  RecrawlPolicy?: {
    /**
     * Specifies whether to crawl the entire dataset again or to crawl only folders that were added since
     * the last crawler run. A value of CRAWL_EVERYTHING specifies crawling the entire dataset again. A
     * value of CRAWL_NEW_FOLDERS_ONLY specifies crawling only folders that were added since the last
     * crawler run. A value of CRAWL_EVENT_MODE specifies crawling only the changes identified by Amazon
     * S3 events.
     */
    RecrawlBehavior?: string;
  };
  /** The name of the database in which the crawler's output is stored. */
  DatabaseName?: string;
  Targets: {
    /**
     * Specifies Amazon Simple Storage Service (Amazon S3) targets.
     * @uniqueItems false
     */
    S3Targets?: {
      /**
       * The name of a connection which allows a job or crawler to access data in Amazon S3 within an Amazon
       * Virtual Private Cloud environment (Amazon VPC).
       */
      ConnectionName?: string;
      /** The path to the Amazon S3 target. */
      Path?: string;
      /**
       * Sets the number of files in each leaf folder to be crawled when crawling sample files in a dataset.
       * If not set, all the files are crawled. A valid value is an integer between 1 and 249.
       */
      SampleSize?: number;
      /**
       * A list of glob patterns used to exclude from the crawl.
       * @uniqueItems false
       */
      Exclusions?: string[];
      /** A valid Amazon dead-letter SQS ARN. For example, arn:aws:sqs:region:account:deadLetterQueue. */
      DlqEventQueueArn?: string;
      /** A valid Amazon SQS ARN. For example, arn:aws:sqs:region:account:sqs. */
      EventQueueArn?: string;
    }[];
    /**
     * Specifies AWS Glue Data Catalog targets.
     * @uniqueItems false
     */
    CatalogTargets?: {
      /**
       * The name of the connection for an Amazon S3-backed Data Catalog table to be a target of the crawl
       * when using a Catalog connection type paired with a NETWORK Connection type.
       */
      ConnectionName?: string;
      /** The name of the database to be synchronized. */
      DatabaseName?: string;
      /** A valid Amazon dead-letter SQS ARN. For example, arn:aws:sqs:region:account:deadLetterQueue. */
      DlqEventQueueArn?: string;
      /**
       * A list of the tables to be synchronized.
       * @uniqueItems false
       */
      Tables?: string[];
      /** A valid Amazon SQS ARN. For example, arn:aws:sqs:region:account:sqs. */
      EventQueueArn?: string;
    }[];
    /**
     * Specifies an array of Delta data store targets.
     * @uniqueItems false
     */
    DeltaTargets?: {
      /** The name of the connection to use to connect to the Delta table target. */
      ConnectionName?: string;
      /**
       * Specifies whether the crawler will create native tables, to allow integration with query engines
       * that support querying of the Delta transaction log directly.
       */
      CreateNativeDeltaTable?: boolean;
      /** Specifies whether to write the manifest files to the Delta table path. */
      WriteManifest?: boolean;
      /** @uniqueItems false */
      DeltaTables?: string[];
    }[];
    /**
     * A list of Mongo DB targets.
     * @uniqueItems false
     */
    MongoDBTargets?: {
      /** The name of the connection to use to connect to the Amazon DocumentDB or MongoDB target. */
      ConnectionName?: string;
      /** The path of the Amazon DocumentDB or MongoDB target (database/collection). */
      Path?: string;
    }[];
    /**
     * Specifies JDBC targets.
     * @uniqueItems false
     */
    JdbcTargets?: {
      /** The name of the connection to use to connect to the JDBC target. */
      ConnectionName?: string;
      /** The path of the JDBC target. */
      Path?: string;
      /**
       * A list of glob patterns used to exclude from the crawl. For more information, see Catalog Tables
       * with a Crawler.
       * @uniqueItems false
       */
      Exclusions?: string[];
      /**
       * Specify a value of RAWTYPES or COMMENTS to enable additional metadata in table responses. RAWTYPES
       * provides the native-level datatype. COMMENTS provides comments associated with a column or table in
       * the database.
       * If you do not need additional metadata, keep the field empty.
       * @uniqueItems false
       */
      EnableAdditionalMetadata?: string[];
    }[];
    /**
     * Specifies Amazon DynamoDB targets.
     * @uniqueItems false
     */
    DynamoDBTargets?: {
      /** The name of the DynamoDB table to crawl. */
      Path?: string;
      /**
       * Indicates whether to scan all the records, or to sample rows from the table. Scanning all the
       * records can take a long time when the table is not a high throughput table. A value of true means
       * to scan all records, while a value of false means to sample the records. If no value is specified,
       * the value defaults to true.
       */
      ScanAll?: boolean;
      /**
       * The percentage of the configured read capacity units to use by the AWS Glue crawler. Read capacity
       * units is a term defined by DynamoDB, and is a numeric value that acts as rate limiter for the
       * number of reads that can be performed on that table per second.
       * The valid values are null or a value between 0.1 to 1.5. A null value is used when user does not
       * provide a value, and defaults to 0.5 of the configured Read Capacity Unit (for provisioned tables),
       * or 0.25 of the max configured Read Capacity Unit (for tables using on-demand mode).
       */
      ScanRate?: number;
    }[];
    /**
     * Specifies Apache Iceberg data store targets.
     * @uniqueItems false
     */
    IcebergTargets?: {
      /** The name of the connection to use to connect to the Iceberg target. */
      ConnectionName?: string;
      /**
       * One or more Amazon S3 paths that contains Iceberg metadata folders as s3://bucket/prefix .
       * @uniqueItems false
       */
      Paths?: string[];
      /**
       * A list of global patterns used to exclude from the crawl.
       * @uniqueItems false
       */
      Exclusions?: string[];
      /**
       * The maximum depth of Amazon S3 paths that the crawler can traverse to discover the Iceberg metadata
       * folder in your Amazon S3 path. Used to limit the crawler run time.
       */
      MaximumTraversalDepth?: number;
    }[];
    /**
     * Specifies Apache Hudi data store targets.
     * @uniqueItems false
     */
    HudiTargets?: {
      /** The name of the connection to use to connect to the Hudi target. */
      ConnectionName?: string;
      /**
       * One or more Amazon S3 paths that contains Hudi metadata folders as s3://bucket/prefix .
       * @uniqueItems false
       */
      Paths?: string[];
      /**
       * A list of global patterns used to exclude from the crawl.
       * @uniqueItems false
       */
      Exclusions?: string[];
      /**
       * The maximum depth of Amazon S3 paths that the crawler can traverse to discover the Hudi metadata
       * folder in your Amazon S3 path. Used to limit the crawler run time.
       */
      MaximumTraversalDepth?: number;
    }[];
  };
  /** The name of the SecurityConfiguration structure to be used by this crawler. */
  CrawlerSecurityConfiguration?: string;
  /** The name of the crawler. */
  Name?: string;
  /**
   * The Amazon Resource Name (ARN) of an IAM role that's used to access customer resources, such as
   * Amazon Simple Storage Service (Amazon S3) data.
   */
  Role: string;
  LakeFormationConfiguration?: {
    /**
     * Specifies whether to use AWS Lake Formation credentials for the crawler instead of the IAM role
     * credentials.
     */
    UseLakeFormationCredentials?: boolean;
    /**
     * Required for cross account crawls. For same account crawls as the target data, this can be left as
     * null.
     */
    AccountId?: string;
  };
  Schedule?: {
    /**
     * A cron expression used to specify the schedule. For more information, see Time-Based Schedules for
     * Jobs and Crawlers. For example, to run something every day at 12:15 UTC, specify cron(15 12 * * ?
     * *).
     */
    ScheduleExpression?: string;
  };
  /** The prefix added to the names of tables that are created. */
  TablePrefix?: string;
  /** The tags to use with this crawler. */
  Tags?: Record<string, unknown>;
};
