// This file is auto-generated. Do not edit manually.
// Source: aws-datazone-datasource.json

/**
 * A data source is used to import technical metadata of assets (data) from the source databases or
 * data warehouses into Amazon DataZone.
 */
export type AwsDatazoneDatasource = {
  /**
   * The metadata forms that are to be attached to the assets that this data source works with.
   * @minItems 0
   * @maxItems 10
   */
  AssetFormsInput?: {
    /** The name of the metadata form. */
    FormName: string;
    /**
     * The ID of the metadata form type.
     * @minLength 1
     * @maxLength 385
     * @pattern ^(?!\.)[\w\.]*\w$
     */
    TypeIdentifier?: string;
    /** The revision of the metadata form type. */
    TypeRevision?: string;
    /**
     * The content of the metadata form.
     * @maxLength 75000
     */
    Content?: string;
  }[];
  /**
   * The unique identifier of a connection used to fetch relevant parameters from connection during
   * Datasource run
   */
  ConnectionId?: string;
  /**
   * The unique identifier of a connection used to fetch relevant parameters from connection during
   * Datasource run
   */
  ConnectionIdentifier?: string;
  /** The timestamp of when the data source was created. */
  CreatedAt?: string;
  /**
   * The description of the data source.
   * @maxLength 2048
   */
  Description?: string;
  /**
   * The ID of the Amazon DataZone domain where the data source is created.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  DomainId?: string;
  /**
   * The ID of the Amazon DataZone domain where the data source is created.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  DomainIdentifier: string;
  /** Specifies whether the data source is enabled. */
  EnableSetting?: "ENABLED" | "DISABLED";
  /** The unique identifier of the Amazon DataZone environment to which the data source publishes assets. */
  EnvironmentId?: string;
  /** The unique identifier of the Amazon DataZone environment to which the data source publishes assets. */
  EnvironmentIdentifier?: string;
  /**
   * The unique identifier of the data source.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  Id?: string;
  /**
   * Configuration of the data source. It can be set to either glueRunConfiguration or
   * redshiftRunConfiguration.
   */
  Configuration?: {
    GlueRunConfiguration?: {
      /** Specifies whether to automatically import data quality metrics as part of the data source run. */
      AutoImportDataQualityResult?: boolean;
      /**
       * The catalog name in the AWS Glue run configuration.
       * @minLength 1
       * @maxLength 128
       */
      CatalogName?: string;
      /** The data access role included in the configuration details of the AWS Glue data source. */
      DataAccessRole?: string;
      /**
       * The relational filter configurations included in the configuration details of the AWS Glue data
       * source.
       */
      RelationalFilterConfigurations: ({
        /**
         * The database name specified in the relational filter configuration for the data source.
         * @minLength 1
         * @maxLength 128
         */
        DatabaseName: string;
        /**
         * The schema name specified in the relational filter configuration for the data source.
         * @minLength 1
         * @maxLength 128
         */
        SchemaName?: string;
        /** The filter expressions specified in the relational filter configuration for the data source. */
        FilterExpressions?: ({
          Type: "INCLUDE" | "EXCLUDE";
          /**
           * @minLength 1
           * @maxLength 2048
           */
          Expression: string;
        })[];
      })[];
    };
  } | {
    RedshiftRunConfiguration?: {
      /** The data access role included in the configuration details of the Amazon Redshift data source. */
      DataAccessRole?: string;
      RelationalFilterConfigurations: ({
        /**
         * The database name specified in the relational filter configuration for the data source.
         * @minLength 1
         * @maxLength 128
         */
        DatabaseName: string;
        /**
         * The schema name specified in the relational filter configuration for the data source.
         * @minLength 1
         * @maxLength 128
         */
        SchemaName?: string;
        /** The filter expressions specified in the relational filter configuration for the data source. */
        FilterExpressions?: ({
          Type: "INCLUDE" | "EXCLUDE";
          /**
           * @minLength 1
           * @maxLength 2048
           */
          Expression: string;
        })[];
      })[];
      /** The details of the credentials required to access an Amazon Redshift cluster. */
      RedshiftCredentialConfiguration?: {
        /**
         * The ARN of a secret manager for an Amazon Redshift cluster.
         * @maxLength 256
         * @pattern ^arn:aws[^:]*:secretsmanager:[a-z]{2}-?(iso|gov)?-{1}[a-z]*-{1}[0-9]:\d{12}:secret:.*$
         */
        SecretManagerArn: string;
      };
      /**
       * The details of the Amazon Redshift storage as part of the configuration of an Amazon Redshift data
       * source run.
       */
      RedshiftStorage?: {
        RedshiftClusterSource: {
          /**
           * The name of an Amazon Redshift cluster.
           * @minLength 1
           * @maxLength 63
           * @pattern ^[0-9a-z].[a-z0-9\-]*$
           */
          ClusterName: string;
        };
      } | {
        RedshiftServerlessSource: {
          /**
           * The name of the Amazon Redshift Serverless workgroup.
           * @minLength 3
           * @maxLength 64
           * @pattern ^[a-z0-9-]+$
           */
          WorkgroupName: string;
        };
      };
    };
  } | {
    SageMakerRunConfiguration?: {
      /** The tracking assets of the Amazon SageMaker run. */
      TrackingAssets: Record<string, string[]>;
    };
  };
  /** The number of assets created by the data source during its last run. */
  LastRunAssetCount?: number;
  /** The timestamp that specifies when the data source was last run. */
  LastRunAt?: string;
  /** The status of the last run of this data source. */
  LastRunStatus?: string;
  /**
   * The name of the data source.
   * @minLength 1
   * @maxLength 256
   */
  Name: string;
  /**
   * The ID of the Amazon DataZone project to which the data source is added.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  ProjectId?: string;
  /** The identifier of the Amazon DataZone project in which you want to add the data source. */
  ProjectIdentifier: string;
  /**
   * Specifies whether the assets that this data source creates in the inventory are to be also
   * automatically published to the catalog.
   */
  PublishOnImport?: boolean;
  /** Specifies whether the business name generation is to be enabled for this data source. */
  Recommendation?: {
    /**
     * Specifies whether automatic business name generation is to be enabled or not as part of the
     * recommendation configuration.
     */
    EnableBusinessNameGeneration?: boolean;
  };
  /** The schedule of the data source runs. */
  Schedule?: {
    /** The timezone of the data source run. */
    Timezone?: string;
    /**
     * The schedule of the data source runs.
     * @minLength 1
     * @maxLength 256
     * @pattern cron\((\b[0-5]?[0-9]\b) (\b2[0-3]\b|\b[0-1]?[0-9]\b) (.*){1,5} (.*){1,5} (.*){1,5} (.*){1,5}\)
     */
    Schedule?: string;
  };
  /** The status of the data source. */
  Status?: "CREATING" | "FAILED_CREATION" | "READY" | "UPDATING" | "FAILED_UPDATE" | "RUNNING" | "DELETING" | "FAILED_DELETION";
  /**
   * The type of the data source.
   * @minLength 1
   * @maxLength 256
   */
  Type: string;
  /** The timestamp of when this data source was updated. */
  UpdatedAt?: string;
};
