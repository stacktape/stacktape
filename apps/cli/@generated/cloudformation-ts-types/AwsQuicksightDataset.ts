// This file is auto-generated. Do not edit manually.
// Source: aws-quicksight-dataset.json

/** Definition of the AWS::QuickSight::DataSet Resource Type. */
export type AwsQuicksightDataset = {
  /** <p>The time that this dataset was created.</p> */
  CreatedTime?: string;
  /**
   * <p>When you create the dataset, Amazon QuickSight adds the dataset to these folders.</p>
   * @minItems 0
   * @maxItems 10
   */
  FolderArns?: string[];
  /**
   * <p>The amount of SPICE capacity used by this dataset. This is 0 if the dataset isn't
   * imported into SPICE.</p>
   * @default 0
   */
  ConsumedSpiceCapacityInBytes?: number;
  RowLevelPermissionDataSet?: {
    Status?: "ENABLED" | "DISABLED";
    FormatVersion?: "VERSION_1" | "VERSION_2";
    /** <p>The Amazon Resource Name (ARN) of the dataset that contains permissions for RLS.</p> */
    Arn: string;
    /**
     * <p>The namespace associated with the dataset that contains permissions for RLS.</p>
     * @minLength 0
     * @maxLength 64
     * @pattern ^[a-zA-Z0-9._-]*$
     */
    Namespace?: string;
    PermissionPolicy: "GRANT_ACCESS" | "DENY_ACCESS";
  };
  IngestionWaitPolicy?: {
    /**
     * <p>Wait for SPICE ingestion to finish to mark dataset creation/update successful. Default (true).
     * Applicable only when DataSetImportMode mode is set to SPICE.</p>
     * @default true
     */
    WaitForSpiceIngestion?: boolean;
    /**
     * <p>The maximum time (in hours) to wait for Ingestion to complete. Default timeout is 36 hours.
     * Applicable only when DataSetImportMode mode is set to SPICE and WaitForSpiceIngestion is set to
     * true.</p>
     * @default 36
     * @minimum 1
     * @maximum 36
     */
    IngestionWaitTimeInHours?: number;
  };
  /**
   * <p>A set of one or more definitions of a <code>
   * <a
   * href="https://docs.aws.amazon.com/quicksight/latest/APIReference/API_ColumnLevelPermissionRule.html">ColumnLevelPermissionRule</a>
   * </code>.</p>
   * @minItems 1
   */
  ColumnLevelPermissionRules?: {
    /**
     * <p>An array of column names.</p>
     * @minItems 1
     */
    ColumnNames?: string[];
    /**
     * <p>An array of Amazon Resource Names (ARNs) for Amazon QuickSight users or groups.</p>
     * @minItems 1
     * @maxItems 100
     */
    Principals?: string[];
  }[];
  /**
   * <p>The display name for the dataset.</p>
   * @minLength 1
   * @maxLength 128
   */
  Name?: string;
  /**
   * <p>A list of resource permissions on the dataset.</p>
   * @minItems 1
   * @maxItems 64
   */
  Permissions?: {
    /**
     * <p>The IAM action to grant or revoke permissions on.</p>
     * @minItems 1
     * @maxItems 20
     */
    Actions: string[];
    /**
     * <p>The Amazon Resource Name (ARN) of the principal. This can be one of the
     * following:</p>
     * <ul>
     * <li>
     * <p>The ARN of an Amazon QuickSight user or group associated with a data source or
     * dataset. (This is common.)</p>
     * </li>
     * <li>
     * <p>The ARN of an Amazon QuickSight user, group, or namespace associated with an
     * analysis, dashboard, template, or theme. (This is common.)</p>
     * </li>
     * <li>
     * <p>The ARN of an Amazon Web Services account root: This is an IAM ARN rather than a
     * QuickSight
     * ARN. Use this option only to share resources (templates) across Amazon Web
     * Services accounts.
     * (This is less common.) </p>
     * </li>
     * </ul>
     * @minLength 1
     * @maxLength 256
     */
    Principal: string;
  }[];
  UseAs?: "RLS_RULES";
  /**
   * <p>Contains a map of the key-value pairs for the resource tag or tags assigned to the dataset.</p>
   * @minItems 1
   * @maxItems 200
   */
  Tags?: {
    /**
     * <p>Tag value.</p>
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
    /**
     * <p>Tag key.</p>
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
  PhysicalTableMap?: Record<string, {
    SaaSTable?: {
      DataSourceArn: string;
      /**
       * @minItems 0
       * @maxItems 2048
       */
      InputColumns: ({
        Type: "STRING" | "INTEGER" | "DECIMAL" | "DATETIME" | "BIT" | "BOOLEAN" | "JSON";
        SubType?: "FLOAT" | "FIXED";
        /**
         * @minLength 1
         * @maxLength 64
         */
        Id?: string;
        /**
         * <p>The name of this column in the underlying data source.</p>
         * @minLength 1
         * @maxLength 127
         */
        Name: string;
      })[];
      /**
       * @minItems 1
       * @maxItems 32
       */
      TablePath: {
        /**
         * @minLength 1
         * @maxLength 256
         */
        Id?: string;
        /**
         * @minLength 1
         * @maxLength 256
         */
        Name?: string;
      }[];
    };
    RelationalTable?: {
      /** <p>The Amazon Resource Name (ARN) for the data source.</p> */
      DataSourceArn: string;
      /**
       * <p>The column schema of the table.</p>
       * @minItems 0
       * @maxItems 2048
       */
      InputColumns: ({
        Type: "STRING" | "INTEGER" | "DECIMAL" | "DATETIME" | "BIT" | "BOOLEAN" | "JSON";
        SubType?: "FLOAT" | "FIXED";
        /**
         * @minLength 1
         * @maxLength 64
         */
        Id?: string;
        /**
         * <p>The name of this column in the underlying data source.</p>
         * @minLength 1
         * @maxLength 127
         */
        Name: string;
      })[];
      /**
       * <p>The schema name. This name applies to certain relational database engines.</p>
       * @minLength 0
       * @maxLength 256
       */
      Schema?: string;
      /**
       * <p>The catalog associated with a table.</p>
       * @minLength 0
       * @maxLength 256
       */
      Catalog?: string;
      /**
       * <p>The name of the relational table.</p>
       * @minLength 1
       * @maxLength 256
       */
      Name: string;
    };
    CustomSql?: {
      /** <p>The Amazon Resource Name (ARN) of the data source.</p> */
      DataSourceArn: string;
      /**
       * <p>The SQL query.</p>
       * @minLength 1
       * @maxLength 168000
       */
      SqlQuery: string;
      /**
       * <p>The column schema from the SQL query result set.</p>
       * @minItems 0
       * @maxItems 2048
       */
      Columns: ({
        Type: "STRING" | "INTEGER" | "DECIMAL" | "DATETIME" | "BIT" | "BOOLEAN" | "JSON";
        SubType?: "FLOAT" | "FIXED";
        /**
         * @minLength 1
         * @maxLength 64
         */
        Id?: string;
        /**
         * <p>The name of this column in the underlying data source.</p>
         * @minLength 1
         * @maxLength 127
         */
        Name: string;
      })[];
      /**
       * <p>A display name for the SQL query result.</p>
       * @minLength 1
       * @maxLength 128
       */
      Name: string;
    };
    S3Source?: {
      /** <p>The Amazon Resource Name (ARN) for the data source.</p> */
      DataSourceArn: string;
      /**
       * <p>A physical table type for an S3 data source.</p>
       * <note>
       * <p>For files that aren't JSON, only <code>STRING</code> data types are supported in
       * input columns.</p>
       * </note>
       * @minItems 0
       * @maxItems 2048
       */
      InputColumns: ({
        Type: "STRING" | "INTEGER" | "DECIMAL" | "DATETIME" | "BIT" | "BOOLEAN" | "JSON";
        SubType?: "FLOAT" | "FIXED";
        /**
         * @minLength 1
         * @maxLength 64
         */
        Id?: string;
        /**
         * <p>The name of this column in the underlying data source.</p>
         * @minLength 1
         * @maxLength 127
         */
        Name: string;
      })[];
      UploadSettings?: {
        /** <p>Whether the file has a header row, or the files each have a header row.</p> */
        ContainsHeader?: boolean;
        TextQualifier?: "DOUBLE_QUOTE" | "SINGLE_QUOTE";
        Format?: "CSV" | "TSV" | "CLF" | "ELF" | "XLSX" | "JSON";
        /**
         * <p>A row number to start reading data from.</p>
         * @minimum 1
         */
        StartFromRow?: number;
        /**
         * <p>The delimiter between values in the file.</p>
         * @minLength 1
         * @maxLength 1
         */
        Delimiter?: string;
      };
    };
  }>;
  FieldFolders?: Record<string, {
    /**
     * <p>The description for a field folder.</p>
     * @minLength 0
     * @maxLength 500
     */
    Description?: string;
    /**
     * <p>A folder has a list of columns. A column can only be in one folder.</p>
     * @minItems 0
     * @maxItems 5000
     */
    Columns?: string[];
  }>;
  /** <p>The last time that this dataset was updated.</p> */
  LastUpdatedTime?: string;
  SemanticModelConfiguration?: {
    TableMap?: Record<string, {
      /**
       * @minLength 1
       * @maxLength 64
       */
      Alias: string;
      /**
       * @minLength 1
       * @maxLength 64
       * @pattern ^[0-9a-zA-Z-]*$
       */
      DestinationTableId: string;
      RowLevelPermissionConfiguration?: {
        TagConfiguration?: {
          Status?: "ENABLED" | "DISABLED";
          /**
           * <p>A set of rules associated with row-level security, such as the tag names and columns that they
           * are assigned to.</p>
           * @minItems 1
           * @maxItems 50
           */
          TagRules: {
            /** <p>The column name that a tag key is assigned to.</p> */
            ColumnName: string;
            /**
             * <p>The unique key for a tag.</p>
             * @minLength 1
             * @maxLength 128
             */
            TagKey: string;
            /**
             * <p>A string that you want to use to filter by all the values in a column in the dataset and don’t
             * want to list the values one by one. For example, you can use an asterisk as your match all
             * value.</p>
             * @minLength 1
             * @maxLength 256
             */
            MatchAllValue?: string;
            /**
             * <p>A string that you want to use to delimit the values when you pass the values at run time. For
             * example, you can delimit the values with a comma.</p>
             * @minLength 0
             * @maxLength 10
             */
            TagMultiValueDelimiter?: string;
          }[];
          /**
           * <p>A list of tag configuration rules to apply to a dataset. All tag configurations have the OR
           * condition. Tags within each tile will be joined (AND). At least one rule in this structure must
           * have all tag values assigned to it to apply Row-level security (RLS) to the dataset.</p>
           * @minItems 1
           * @maxItems 50
           */
          TagRuleConfigurations?: string[][];
        };
        RowLevelPermissionDataSet?: {
          Status?: "ENABLED" | "DISABLED";
          FormatVersion?: "VERSION_1" | "VERSION_2";
          /** <p>The Amazon Resource Name (ARN) of the dataset that contains permissions for RLS.</p> */
          Arn: string;
          /**
           * <p>The namespace associated with the dataset that contains permissions for RLS.</p>
           * @minLength 0
           * @maxLength 64
           * @pattern ^[a-zA-Z0-9._-]*$
           */
          Namespace?: string;
          PermissionPolicy: "GRANT_ACCESS" | "DENY_ACCESS";
        };
      };
    }>;
  };
  DataSetId?: string;
  PerformanceConfiguration?: {
    /**
     * @minItems 1
     * @maxItems 1
     */
    UniqueKeys?: {
      /**
       * @minItems 1
       * @maxItems 1
       */
      ColumnNames: string[];
    }[];
  };
  DataSetRefreshProperties?: {
    RefreshConfiguration?: {
      IncrementalRefresh: {
        LookbackWindow: {
          /** <p>The name of the lookback window column.</p> */
          ColumnName: string;
          SizeUnit: "HOUR" | "DAY" | "WEEK";
          /**
           * <p>The lookback window column size.</p>
           * @default 0
           * @minimum 1
           */
          Size: number;
        };
      };
    };
    FailureConfiguration?: {
      EmailAlert?: {
        AlertStatus?: "ENABLED" | "DISABLED";
      };
    };
  };
  RowLevelPermissionTagConfiguration?: {
    Status?: "ENABLED" | "DISABLED";
    /**
     * <p>A set of rules associated with row-level security, such as the tag names and columns that they
     * are assigned to.</p>
     * @minItems 1
     * @maxItems 50
     */
    TagRules: {
      /** <p>The column name that a tag key is assigned to.</p> */
      ColumnName: string;
      /**
       * <p>The unique key for a tag.</p>
       * @minLength 1
       * @maxLength 128
       */
      TagKey: string;
      /**
       * <p>A string that you want to use to filter by all the values in a column in the dataset and don’t
       * want to list the values one by one. For example, you can use an asterisk as your match all
       * value.</p>
       * @minLength 1
       * @maxLength 256
       */
      MatchAllValue?: string;
      /**
       * <p>A string that you want to use to delimit the values when you pass the values at run time. For
       * example, you can delimit the values with a comma.</p>
       * @minLength 0
       * @maxLength 10
       */
      TagMultiValueDelimiter?: string;
    }[];
    /**
     * <p>A list of tag configuration rules to apply to a dataset. All tag configurations have the OR
     * condition. Tags within each tile will be joined (AND). At least one rule in this structure must
     * have all tag values assigned to it to apply Row-level security (RLS) to the dataset.</p>
     * @minItems 1
     * @maxItems 50
     */
    TagRuleConfigurations?: string[][];
  };
  /**
   * <p>Groupings of columns that work together in certain Amazon QuickSight features. Currently, only
   * geospatial hierarchy is supported.</p>
   * @minItems 1
   * @maxItems 8
   */
  ColumnGroups?: {
    GeoSpatialColumnGroup?: {
      /**
       * <p>Columns in this hierarchy.</p>
       * @minItems 1
       * @maxItems 16
       */
      Columns: string[];
      CountryCode?: "US";
      /**
       * <p>A display name for the hierarchy.</p>
       * @minLength 1
       * @maxLength 64
       */
      Name: string;
    };
  }[];
  ImportMode?: "SPICE" | "DIRECT_QUERY";
  /**
   * <p>The parameter declarations of the dataset.</p>
   * @minItems 0
   * @maxItems 32
   */
  DatasetParameters?: ({
    IntegerDatasetParameter?: {
      ValueType: "MULTI_VALUED" | "SINGLE_VALUED";
      DefaultValues?: {
        /**
         * <p>A list of static default values for a given integer parameter.</p>
         * @minItems 0
         * @maxItems 32
         */
        StaticValues?: number[];
      };
      /**
       * <p>An identifier for the integer parameter created in the dataset.</p>
       * @minLength 1
       * @maxLength 128
       * @pattern ^[a-zA-Z0-9-]+$
       */
      Id: string;
      /**
       * <p>The name of the integer parameter that is created in the dataset.</p>
       * @minLength 1
       * @maxLength 2048
       * @pattern ^[a-zA-Z0-9]+$
       */
      Name: string;
    };
    DateTimeDatasetParameter?: {
      ValueType: "MULTI_VALUED" | "SINGLE_VALUED";
      TimeGranularity?: "YEAR" | "QUARTER" | "MONTH" | "WEEK" | "DAY" | "HOUR" | "MINUTE" | "SECOND" | "MILLISECOND";
      DefaultValues?: {
        /**
         * <p>A list of static default values for a given date time parameter.</p>
         * @minItems 0
         * @maxItems 32
         */
        StaticValues?: string[];
      };
      /**
       * <p>An identifier for the parameter that is created in the dataset.</p>
       * @minLength 1
       * @maxLength 128
       * @pattern ^[a-zA-Z0-9-]+$
       */
      Id: string;
      /**
       * <p>The name of the date time parameter that is created in the dataset.</p>
       * @minLength 1
       * @maxLength 2048
       * @pattern ^[a-zA-Z0-9]+$
       */
      Name: string;
    };
    DecimalDatasetParameter?: {
      ValueType: "MULTI_VALUED" | "SINGLE_VALUED";
      DefaultValues?: {
        /**
         * <p>A list of static default values for a given decimal parameter.</p>
         * @minItems 0
         * @maxItems 32
         */
        StaticValues?: number[];
      };
      /**
       * <p>An identifier for the decimal parameter created in the dataset.</p>
       * @minLength 1
       * @maxLength 128
       * @pattern ^[a-zA-Z0-9-]+$
       */
      Id: string;
      /**
       * <p>The name of the decimal parameter that is created in the dataset.</p>
       * @minLength 1
       * @maxLength 2048
       * @pattern ^[a-zA-Z0-9]+$
       */
      Name: string;
    };
    StringDatasetParameter?: {
      ValueType: "MULTI_VALUED" | "SINGLE_VALUED";
      DefaultValues?: {
        /**
         * <p>A list of static default values for a given string parameter.</p>
         * @minItems 0
         * @maxItems 32
         */
        StaticValues?: string[];
      };
      /**
       * <p>An identifier for the string parameter that is created in the dataset.</p>
       * @minLength 1
       * @maxLength 128
       * @pattern ^[a-zA-Z0-9-]+$
       */
      Id: string;
      /**
       * <p>The name of the string parameter that is created in the dataset.</p>
       * @minLength 1
       * @maxLength 2048
       * @pattern ^[a-zA-Z0-9]+$
       */
      Name: string;
    };
  })[];
  LogicalTableMap?: Record<string, {
    /**
     * <p>A display name for the logical table.</p>
     * @minLength 1
     * @maxLength 64
     */
    Alias: string;
    /**
     * <p>Transform operations that act on this logical table. For this structure to be valid, only one of
     * the attributes can be non-null. </p>
     * @minItems 1
     * @maxItems 2048
     */
    DataTransforms?: ({
      TagColumnOperation?: {
        /**
         * <p>The column that this operation acts on.</p>
         * @minLength 1
         * @maxLength 127
         */
        ColumnName: string;
        /**
         * <p>The dataset column tag, currently only used for geospatial type tagging.</p>
         * <note>
         * <p>This is not tags for the Amazon Web Services tagging feature.</p>
         * </note>
         * @minItems 1
         * @maxItems 16
         */
        Tags: ({
          ColumnGeographicRole?: "COUNTRY" | "STATE" | "COUNTY" | "CITY" | "POSTCODE" | "LONGITUDE" | "LATITUDE" | "POLITICAL1" | "CENSUS_TRACT" | "CENSUS_BLOCK_GROUP" | "CENSUS_BLOCK";
          ColumnDescription?: {
            /**
             * <p>The text of a description for a column.</p>
             * @minLength 0
             * @maxLength 500
             */
            Text?: string;
          };
        })[];
      };
      UntagColumnOperation?: {
        /**
         * <p>The column that this operation acts on.</p>
         * @minLength 1
         * @maxLength 127
         */
        ColumnName: string;
        /** <p>The column tags to remove from this column.</p> */
        TagNames: ("COLUMN_GEOGRAPHIC_ROLE" | "COLUMN_DESCRIPTION")[];
      };
      OverrideDatasetParameterOperation?: {
        NewDefaultValues?: {
          /**
           * <p>A list of static default values for a given decimal parameter.</p>
           * @minItems 0
           * @maxItems 32
           */
          DecimalStaticValues?: number[];
          /**
           * <p>A list of static default values for a given integer parameter.</p>
           * @minItems 0
           * @maxItems 32
           */
          IntegerStaticValues?: number[];
          /**
           * <p>A list of static default values for a given string parameter.</p>
           * @minItems 0
           * @maxItems 32
           */
          StringStaticValues?: string[];
          /**
           * <p>A list of static default values for a given date time parameter.</p>
           * @minItems 0
           * @maxItems 32
           */
          DateTimeStaticValues?: string[];
        };
        /**
         * <p>The name of the parameter to be overridden with different values.</p>
         * @minLength 1
         * @maxLength 2048
         * @pattern ^[a-zA-Z0-9]+$
         */
        ParameterName: string;
        /**
         * <p>The new name for the parameter.</p>
         * @minLength 1
         * @maxLength 2048
         * @pattern ^[a-zA-Z0-9]+$
         */
        NewParameterName?: string;
      };
      FilterOperation?: {
        DateFilterCondition?: {
          /**
           * @minLength 1
           * @maxLength 127
           */
          ColumnName?: string;
          RangeFilterCondition?: {
            /** @default null */
            IncludeMaximum?: boolean;
            RangeMinimum?: {
              StaticValue?: string;
            };
            RangeMaximum?: {
              StaticValue?: string;
            };
            /** @default null */
            IncludeMinimum?: boolean;
          };
          ComparisonFilterCondition?: {
            Operator: "BEFORE" | "BEFORE_OR_EQUALS_TO" | "AFTER" | "AFTER_OR_EQUALS_TO";
            Value?: {
              StaticValue?: string;
            };
          };
        };
        StringFilterCondition?: {
          /**
           * @minLength 1
           * @maxLength 127
           */
          ColumnName?: string;
          ComparisonFilterCondition?: {
            Operator: "EQUALS" | "DOES_NOT_EQUAL" | "CONTAINS" | "DOES_NOT_CONTAIN" | "STARTS_WITH" | "ENDS_WITH";
            Value?: {
              /**
               * @minLength 0
               * @maxLength 512
               */
              StaticValue?: string;
            };
          };
          ListFilterCondition?: {
            Operator: "INCLUDE" | "EXCLUDE";
            Values?: {
              /**
               * @minItems 0
               * @maxItems 1000
               */
              StaticValues?: string[];
            };
          };
        };
        /**
         * <p>An expression that must evaluate to a Boolean value. Rows for which the expression
         * evaluates to true are kept in the dataset.</p>
         * @minLength 1
         * @maxLength 4096
         */
        ConditionExpression?: string;
        NumericFilterCondition?: {
          /**
           * @minLength 1
           * @maxLength 127
           */
          ColumnName?: string;
          RangeFilterCondition?: {
            /** @default null */
            IncludeMaximum?: boolean;
            RangeMinimum?: {
              /** @default null */
              StaticValue?: number;
            };
            RangeMaximum?: {
              /** @default null */
              StaticValue?: number;
            };
            /** @default null */
            IncludeMinimum?: boolean;
          };
          ComparisonFilterCondition?: {
            Operator: "EQUALS" | "DOES_NOT_EQUAL" | "GREATER_THAN" | "GREATER_THAN_OR_EQUALS_TO" | "LESS_THAN" | "LESS_THAN_OR_EQUALS_TO";
            Value?: {
              /** @default null */
              StaticValue?: number;
            };
          };
        };
      };
      CastColumnTypeOperation?: {
        /**
         * <p>Column name.</p>
         * @minLength 1
         * @maxLength 127
         */
        ColumnName: string;
        SubType?: "FLOAT" | "FIXED";
        /**
         * <p>When casting a column from string to datetime type, you can supply a string in a
         * format supported by Amazon QuickSight to denote the source data format.</p>
         * @minLength 0
         * @maxLength 32
         */
        Format?: string;
        NewColumnType: "STRING" | "INTEGER" | "DECIMAL" | "DATETIME";
      };
      CreateColumnsOperation?: {
        /**
         * @minLength 1
         * @maxLength 64
         */
        Alias?: string;
        /**
         * <p>Calculated columns to create.</p>
         * @minItems 0
         * @maxItems 256
         */
        Columns: {
          /**
           * <p>A unique ID to identify a calculated column. During a dataset update, if the column ID
           * of a calculated column matches that of an existing calculated column, Amazon QuickSight
           * preserves the existing calculated column.</p>
           * @minLength 1
           * @maxLength 64
           */
          ColumnId: string;
          /**
           * <p>Column name.</p>
           * @minLength 1
           * @maxLength 127
           */
          ColumnName: string;
          /**
           * <p>An expression that defines the calculated column.</p>
           * @minLength 1
           * @maxLength 250000
           */
          Expression: string;
        }[];
        Source?: {
          /**
           * @minLength 1
           * @maxLength 64
           * @pattern ^[0-9a-zA-Z-]*$
           */
          TransformOperationId: string;
          /**
           * @minItems 1
           * @maxItems 2048
           */
          ColumnIdMappings?: {
            /**
             * @minLength 1
             * @maxLength 64
             */
            SourceColumnId: string;
            /**
             * @minLength 1
             * @maxLength 64
             */
            TargetColumnId: string;
          }[];
        };
      };
      RenameColumnOperation?: {
        /**
         * <p>The new name for the column.</p>
         * @minLength 1
         * @maxLength 127
         */
        NewColumnName: string;
        /**
         * <p>The name of the column to be renamed.</p>
         * @minLength 1
         * @maxLength 127
         */
        ColumnName: string;
      };
      ProjectOperation?: {
        /**
         * @minLength 1
         * @maxLength 64
         */
        Alias?: string;
        /**
         * <p>Projected columns.</p>
         * @minItems 0
         * @maxItems 2048
         */
        ProjectedColumns?: string[];
        Source?: {
          /**
           * @minLength 1
           * @maxLength 64
           * @pattern ^[0-9a-zA-Z-]*$
           */
          TransformOperationId: string;
          /**
           * @minItems 1
           * @maxItems 2048
           */
          ColumnIdMappings?: {
            /**
             * @minLength 1
             * @maxLength 64
             */
            SourceColumnId: string;
            /**
             * @minLength 1
             * @maxLength 64
             */
            TargetColumnId: string;
          }[];
        };
      };
    })[];
    Source: {
      /**
       * <p>Physical table ID.</p>
       * @minLength 1
       * @maxLength 64
       * @pattern ^[0-9a-zA-Z-]*$
       */
      PhysicalTableId?: string;
      JoinInstruction?: {
        /**
         * <p>The join instructions provided in the <code>ON</code> clause of a join.</p>
         * @minLength 1
         * @maxLength 512
         */
        OnClause: string;
        Type: "INNER" | "OUTER" | "LEFT" | "RIGHT";
        LeftJoinKeyProperties?: {
          /**
           * <p>A value that indicates that a row in a table is uniquely identified by the columns in
           * a join key. This is used by Amazon QuickSight to optimize query performance.</p>
           */
          UniqueKey?: boolean;
        };
        /**
         * <p>The operand on the left side of a join.</p>
         * @minLength 1
         * @maxLength 64
         * @pattern ^[0-9a-zA-Z-]*$
         */
        LeftOperand: string;
        /**
         * <p>The operand on the right side of a join.</p>
         * @minLength 1
         * @maxLength 64
         * @pattern ^[0-9a-zA-Z-]*$
         */
        RightOperand: string;
        RightJoinKeyProperties?: {
          /**
           * <p>A value that indicates that a row in a table is uniquely identified by the columns in
           * a join key. This is used by Amazon QuickSight to optimize query performance.</p>
           */
          UniqueKey?: boolean;
        };
      };
      /** <p>The Amazon Resource Number (ARN) of the parent dataset.</p> */
      DataSetArn?: string;
    };
  }>;
  /**
   * @minLength 12
   * @maxLength 12
   * @pattern ^[0-9]{12}$
   */
  AwsAccountId?: string;
  DataSetUsageConfiguration?: {
    /**
     * <p>An option that controls whether a child dataset that's stored in QuickSight can use this dataset
     * as a source.</p>
     * @default false
     */
    DisableUseAsImportedSource?: boolean;
    /**
     * <p>An option that controls whether a child dataset of a direct query can use this dataset as a
     * source.</p>
     * @default false
     */
    DisableUseAsDirectQuerySource?: boolean;
  };
  /**
   * <p>The list of columns after all transforms. These columns are available in templates,
   * analyses, and dashboards.</p>
   */
  OutputColumns?: ({
    Type?: "STRING" | "INTEGER" | "DECIMAL" | "DATETIME";
    /**
     * <p>A description for a column.</p>
     * @minLength 0
     * @maxLength 500
     */
    Description?: string;
    SubType?: "FLOAT" | "FIXED";
    /**
     * @minLength 1
     * @maxLength 64
     */
    Id?: string;
    /**
     * <p>The display name of the column..</p>
     * @minLength 1
     * @maxLength 127
     */
    Name?: string;
  })[];
  DataPrepConfiguration?: {
    DestinationTableMap: Record<string, {
      /**
       * @minLength 1
       * @maxLength 64
       */
      Alias: string;
      Source: {
        /**
         * @minLength 1
         * @maxLength 64
         * @pattern ^[0-9a-zA-Z-]*$
         */
        TransformOperationId: string;
      };
    }>;
    TransformStepMap: Record<string, {
      ProjectStep?: {
        /**
         * @minLength 1
         * @maxLength 64
         */
        Alias?: string;
        /**
         * <p>Projected columns.</p>
         * @minItems 0
         * @maxItems 2048
         */
        ProjectedColumns?: string[];
        Source?: {
          /**
           * @minLength 1
           * @maxLength 64
           * @pattern ^[0-9a-zA-Z-]*$
           */
          TransformOperationId: string;
          /**
           * @minItems 1
           * @maxItems 2048
           */
          ColumnIdMappings?: {
            /**
             * @minLength 1
             * @maxLength 64
             */
            SourceColumnId: string;
            /**
             * @minLength 1
             * @maxLength 64
             */
            TargetColumnId: string;
          }[];
        };
      };
      CreateColumnsStep?: {
        /**
         * @minLength 1
         * @maxLength 64
         */
        Alias?: string;
        /**
         * <p>Calculated columns to create.</p>
         * @minItems 0
         * @maxItems 256
         */
        Columns: {
          /**
           * <p>A unique ID to identify a calculated column. During a dataset update, if the column ID
           * of a calculated column matches that of an existing calculated column, Amazon QuickSight
           * preserves the existing calculated column.</p>
           * @minLength 1
           * @maxLength 64
           */
          ColumnId: string;
          /**
           * <p>Column name.</p>
           * @minLength 1
           * @maxLength 127
           */
          ColumnName: string;
          /**
           * <p>An expression that defines the calculated column.</p>
           * @minLength 1
           * @maxLength 250000
           */
          Expression: string;
        }[];
        Source?: {
          /**
           * @minLength 1
           * @maxLength 64
           * @pattern ^[0-9a-zA-Z-]*$
           */
          TransformOperationId: string;
          /**
           * @minItems 1
           * @maxItems 2048
           */
          ColumnIdMappings?: {
            /**
             * @minLength 1
             * @maxLength 64
             */
            SourceColumnId: string;
            /**
             * @minLength 1
             * @maxLength 64
             */
            TargetColumnId: string;
          }[];
        };
      };
      RenameColumnsStep?: {
        /**
         * @minLength 1
         * @maxLength 64
         */
        Alias: string;
        /**
         * @minItems 0
         * @maxItems 2048
         */
        RenameColumnOperations: {
          /**
           * <p>The new name for the column.</p>
           * @minLength 1
           * @maxLength 127
           */
          NewColumnName: string;
          /**
           * <p>The name of the column to be renamed.</p>
           * @minLength 1
           * @maxLength 127
           */
          ColumnName: string;
        }[];
        Source: {
          /**
           * @minLength 1
           * @maxLength 64
           * @pattern ^[0-9a-zA-Z-]*$
           */
          TransformOperationId: string;
          /**
           * @minItems 1
           * @maxItems 2048
           */
          ColumnIdMappings?: {
            /**
             * @minLength 1
             * @maxLength 64
             */
            SourceColumnId: string;
            /**
             * @minLength 1
             * @maxLength 64
             */
            TargetColumnId: string;
          }[];
        };
      };
      CastColumnTypesStep?: {
        /**
         * @minItems 0
         * @maxItems 2048
         */
        CastColumnTypeOperations: ({
          /**
           * <p>Column name.</p>
           * @minLength 1
           * @maxLength 127
           */
          ColumnName: string;
          SubType?: "FLOAT" | "FIXED";
          /**
           * <p>When casting a column from string to datetime type, you can supply a string in a
           * format supported by Amazon QuickSight to denote the source data format.</p>
           * @minLength 0
           * @maxLength 32
           */
          Format?: string;
          NewColumnType: "STRING" | "INTEGER" | "DECIMAL" | "DATETIME";
        })[];
        /**
         * @minLength 1
         * @maxLength 64
         */
        Alias: string;
        Source: {
          /**
           * @minLength 1
           * @maxLength 64
           * @pattern ^[0-9a-zA-Z-]*$
           */
          TransformOperationId: string;
          /**
           * @minItems 1
           * @maxItems 2048
           */
          ColumnIdMappings?: {
            /**
             * @minLength 1
             * @maxLength 64
             */
            SourceColumnId: string;
            /**
             * @minLength 1
             * @maxLength 64
             */
            TargetColumnId: string;
          }[];
        };
      };
      ImportTableStep?: {
        /**
         * @minLength 1
         * @maxLength 64
         */
        Alias: string;
        Source: {
          /**
           * @minLength 1
           * @maxLength 64
           * @pattern ^[0-9a-zA-Z-]*$
           */
          SourceTableId: string;
          /**
           * @minItems 1
           * @maxItems 2048
           */
          ColumnIdMappings?: {
            /**
             * @minLength 1
             * @maxLength 64
             */
            SourceColumnId: string;
            /**
             * @minLength 1
             * @maxLength 64
             */
            TargetColumnId: string;
          }[];
        };
      };
      UnpivotStep?: {
        /**
         * @minLength 1
         * @maxLength 127
         */
        UnpivotedLabelColumnName: string;
        /**
         * @minItems 0
         * @maxItems 100
         */
        ColumnsToUnpivot: {
          /**
           * @minLength 1
           * @maxLength 127
           */
          ColumnName?: string;
          /**
           * @minLength 0
           * @maxLength 2047
           */
          NewValue?: string;
        }[];
        /**
         * @minLength 1
         * @maxLength 64
         */
        UnpivotedLabelColumnId: string;
        /**
         * @minLength 1
         * @maxLength 64
         */
        Alias: string;
        /**
         * @minLength 1
         * @maxLength 64
         */
        UnpivotedValueColumnId: string;
        /**
         * @minLength 1
         * @maxLength 127
         */
        UnpivotedValueColumnName: string;
        Source: {
          /**
           * @minLength 1
           * @maxLength 64
           * @pattern ^[0-9a-zA-Z-]*$
           */
          TransformOperationId: string;
          /**
           * @minItems 1
           * @maxItems 2048
           */
          ColumnIdMappings?: {
            /**
             * @minLength 1
             * @maxLength 64
             */
            SourceColumnId: string;
            /**
             * @minLength 1
             * @maxLength 64
             */
            TargetColumnId: string;
          }[];
        };
      };
      JoinStep?: {
        /**
         * @minLength 1
         * @maxLength 512
         */
        OnClause: string;
        Type: "INNER" | "OUTER" | "LEFT" | "RIGHT";
        RightOperandProperties?: {
          /**
           * @minItems 1
           * @maxItems 2048
           */
          OutputColumnNameOverrides: {
            /**
             * @minLength 1
             * @maxLength 127
             */
            OutputColumnName: string;
            /**
             * @minLength 1
             * @maxLength 127
             */
            SourceColumnName?: string;
          }[];
        };
        LeftOperandProperties?: {
          /**
           * @minItems 1
           * @maxItems 2048
           */
          OutputColumnNameOverrides: {
            /**
             * @minLength 1
             * @maxLength 127
             */
            OutputColumnName: string;
            /**
             * @minLength 1
             * @maxLength 127
             */
            SourceColumnName?: string;
          }[];
        };
        /**
         * @minLength 1
         * @maxLength 64
         */
        Alias: string;
        LeftOperand: {
          /**
           * @minLength 1
           * @maxLength 64
           * @pattern ^[0-9a-zA-Z-]*$
           */
          TransformOperationId: string;
          /**
           * @minItems 1
           * @maxItems 2048
           */
          ColumnIdMappings?: {
            /**
             * @minLength 1
             * @maxLength 64
             */
            SourceColumnId: string;
            /**
             * @minLength 1
             * @maxLength 64
             */
            TargetColumnId: string;
          }[];
        };
        RightOperand: {
          /**
           * @minLength 1
           * @maxLength 64
           * @pattern ^[0-9a-zA-Z-]*$
           */
          TransformOperationId: string;
          /**
           * @minItems 1
           * @maxItems 2048
           */
          ColumnIdMappings?: {
            /**
             * @minLength 1
             * @maxLength 64
             */
            SourceColumnId: string;
            /**
             * @minLength 1
             * @maxLength 64
             */
            TargetColumnId: string;
          }[];
        };
      };
      AppendStep?: {
        /**
         * @minItems 0
         * @maxItems 2048
         */
        AppendedColumns: {
          /**
           * @minLength 1
           * @maxLength 127
           */
          ColumnName: string;
          /**
           * @minLength 1
           * @maxLength 64
           */
          NewColumnId: string;
        }[];
        SecondSource?: {
          /**
           * @minLength 1
           * @maxLength 64
           * @pattern ^[0-9a-zA-Z-]*$
           */
          TransformOperationId: string;
          /**
           * @minItems 1
           * @maxItems 2048
           */
          ColumnIdMappings?: {
            /**
             * @minLength 1
             * @maxLength 64
             */
            SourceColumnId: string;
            /**
             * @minLength 1
             * @maxLength 64
             */
            TargetColumnId: string;
          }[];
        };
        /**
         * @minLength 1
         * @maxLength 64
         */
        Alias: string;
        FirstSource?: {
          /**
           * @minLength 1
           * @maxLength 64
           * @pattern ^[0-9a-zA-Z-]*$
           */
          TransformOperationId: string;
          /**
           * @minItems 1
           * @maxItems 2048
           */
          ColumnIdMappings?: {
            /**
             * @minLength 1
             * @maxLength 64
             */
            SourceColumnId: string;
            /**
             * @minLength 1
             * @maxLength 64
             */
            TargetColumnId: string;
          }[];
        };
      };
      FiltersStep?: {
        /**
         * @minItems 0
         * @maxItems 128
         */
        FilterOperations: ({
          DateFilterCondition?: {
            /**
             * @minLength 1
             * @maxLength 127
             */
            ColumnName?: string;
            RangeFilterCondition?: {
              /** @default null */
              IncludeMaximum?: boolean;
              RangeMinimum?: {
                StaticValue?: string;
              };
              RangeMaximum?: {
                StaticValue?: string;
              };
              /** @default null */
              IncludeMinimum?: boolean;
            };
            ComparisonFilterCondition?: {
              Operator: "BEFORE" | "BEFORE_OR_EQUALS_TO" | "AFTER" | "AFTER_OR_EQUALS_TO";
              Value?: {
                StaticValue?: string;
              };
            };
          };
          StringFilterCondition?: {
            /**
             * @minLength 1
             * @maxLength 127
             */
            ColumnName?: string;
            ComparisonFilterCondition?: {
              Operator: "EQUALS" | "DOES_NOT_EQUAL" | "CONTAINS" | "DOES_NOT_CONTAIN" | "STARTS_WITH" | "ENDS_WITH";
              Value?: {
                /**
                 * @minLength 0
                 * @maxLength 512
                 */
                StaticValue?: string;
              };
            };
            ListFilterCondition?: {
              Operator: "INCLUDE" | "EXCLUDE";
              Values?: {
                /**
                 * @minItems 0
                 * @maxItems 1000
                 */
                StaticValues?: string[];
              };
            };
          };
          /**
           * <p>An expression that must evaluate to a Boolean value. Rows for which the expression
           * evaluates to true are kept in the dataset.</p>
           * @minLength 1
           * @maxLength 4096
           */
          ConditionExpression?: string;
          NumericFilterCondition?: {
            /**
             * @minLength 1
             * @maxLength 127
             */
            ColumnName?: string;
            RangeFilterCondition?: {
              /** @default null */
              IncludeMaximum?: boolean;
              RangeMinimum?: {
                /** @default null */
                StaticValue?: number;
              };
              RangeMaximum?: {
                /** @default null */
                StaticValue?: number;
              };
              /** @default null */
              IncludeMinimum?: boolean;
            };
            ComparisonFilterCondition?: {
              Operator: "EQUALS" | "DOES_NOT_EQUAL" | "GREATER_THAN" | "GREATER_THAN_OR_EQUALS_TO" | "LESS_THAN" | "LESS_THAN_OR_EQUALS_TO";
              Value?: {
                /** @default null */
                StaticValue?: number;
              };
            };
          };
        })[];
        /**
         * @minLength 1
         * @maxLength 64
         */
        Alias: string;
        Source: {
          /**
           * @minLength 1
           * @maxLength 64
           * @pattern ^[0-9a-zA-Z-]*$
           */
          TransformOperationId: string;
          /**
           * @minItems 1
           * @maxItems 2048
           */
          ColumnIdMappings?: {
            /**
             * @minLength 1
             * @maxLength 64
             */
            SourceColumnId: string;
            /**
             * @minLength 1
             * @maxLength 64
             */
            TargetColumnId: string;
          }[];
        };
      };
      AggregateStep?: {
        /**
         * @minItems 0
         * @maxItems 128
         */
        GroupByColumnNames?: string[];
        /**
         * @minLength 1
         * @maxLength 64
         */
        Alias: string;
        /**
         * @minItems 0
         * @maxItems 128
         */
        Aggregations: ({
          AggregationFunction: {
            PercentileAggregation?: {
              /**
               * @minLength 1
               * @maxLength 127
               */
              InputColumnName?: string;
              /**
               * @default 0
               * @minimum 0
               * @maximum 100
               */
              PercentileValue: number;
            };
            SimpleAggregation?: {
              FunctionType: "COUNT" | "DISTINCT_COUNT" | "SUM" | "AVERAGE" | "MEDIAN" | "MAX" | "MIN" | "VARIANCE" | "STANDARD_DEVIATION";
              /**
               * @minLength 1
               * @maxLength 127
               */
              InputColumnName?: string;
            };
            ListAggregation?: {
              /** @default false */
              Distinct: boolean;
              /**
               * @minLength 1
               * @maxLength 127
               */
              InputColumnName?: string;
              Separator: string;
            };
          };
          /**
           * @minLength 1
           * @maxLength 127
           */
          NewColumnName: string;
          /**
           * @minLength 1
           * @maxLength 64
           */
          NewColumnId: string;
        })[];
        Source: {
          /**
           * @minLength 1
           * @maxLength 64
           * @pattern ^[0-9a-zA-Z-]*$
           */
          TransformOperationId: string;
          /**
           * @minItems 1
           * @maxItems 2048
           */
          ColumnIdMappings?: {
            /**
             * @minLength 1
             * @maxLength 64
             */
            SourceColumnId: string;
            /**
             * @minLength 1
             * @maxLength 64
             */
            TargetColumnId: string;
          }[];
        };
      };
      PivotStep?: {
        PivotConfiguration: {
          /**
           * @minLength 1
           * @maxLength 127
           */
          LabelColumnName?: string;
          /**
           * @minItems 0
           * @maxItems 100
           */
          PivotedLabels: {
            /**
             * @minLength 1
             * @maxLength 127
             */
            NewColumnName: string;
            /**
             * @minLength 1
             * @maxLength 64
             */
            NewColumnId: string;
            /**
             * @minLength 0
             * @maxLength 2047
             */
            LabelName: string;
          }[];
        };
        /**
         * @minItems 0
         * @maxItems 128
         */
        GroupByColumnNames?: string[];
        /**
         * @minLength 1
         * @maxLength 64
         */
        Alias: string;
        ValueColumnConfiguration: {
          AggregationFunction?: {
            PercentileAggregation?: {
              /**
               * @minLength 1
               * @maxLength 127
               */
              InputColumnName?: string;
              /**
               * @default 0
               * @minimum 0
               * @maximum 100
               */
              PercentileValue: number;
            };
            SimpleAggregation?: {
              FunctionType: "COUNT" | "DISTINCT_COUNT" | "SUM" | "AVERAGE" | "MEDIAN" | "MAX" | "MIN" | "VARIANCE" | "STANDARD_DEVIATION";
              /**
               * @minLength 1
               * @maxLength 127
               */
              InputColumnName?: string;
            };
            ListAggregation?: {
              /** @default false */
              Distinct: boolean;
              /**
               * @minLength 1
               * @maxLength 127
               */
              InputColumnName?: string;
              Separator: string;
            };
          };
        };
        Source: {
          /**
           * @minLength 1
           * @maxLength 64
           * @pattern ^[0-9a-zA-Z-]*$
           */
          TransformOperationId: string;
          /**
           * @minItems 1
           * @maxItems 2048
           */
          ColumnIdMappings?: {
            /**
             * @minLength 1
             * @maxLength 64
             */
            SourceColumnId: string;
            /**
             * @minLength 1
             * @maxLength 64
             */
            TargetColumnId: string;
          }[];
        };
      };
    }>;
    SourceTableMap: Record<string, {
      /**
       * @minLength 1
       * @maxLength 64
       * @pattern ^[0-9a-zA-Z-]*$
       */
      PhysicalTableId?: string;
      DataSet?: {
        /**
         * @minItems 0
         * @maxItems 2048
         */
        InputColumns: ({
          Type: "STRING" | "INTEGER" | "DECIMAL" | "DATETIME" | "BIT" | "BOOLEAN" | "JSON";
          SubType?: "FLOAT" | "FIXED";
          /**
           * @minLength 1
           * @maxLength 64
           */
          Id?: string;
          /**
           * <p>The name of this column in the underlying data source.</p>
           * @minLength 1
           * @maxLength 127
           */
          Name: string;
        })[];
        DataSetArn: string;
      };
    }>;
  };
  /** <p>The Amazon Resource Name (ARN) of the resource.</p> */
  Arn?: string;
};
