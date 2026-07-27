// This file is auto-generated. Do not edit manually.
// Source: aws-quicksight-topic.json

/** Definition of the AWS::QuickSight::Topic Resource Type. */
export type AwsQuicksightTopic = {
  Arn?: string;
  /**
   * @minLength 12
   * @maxLength 12
   * @pattern ^[0-9]{12}$
   */
  AwsAccountId?: string;
  ConfigOptions?: {
    QBusinessInsightsEnabled?: boolean;
  };
  CustomInstructions?: {
    /**
     * @minLength 0
     * @maxLength 5000
     */
    CustomInstructionsString: string;
  };
  DataSets?: ({
    DatasetArn: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    DatasetName?: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    DatasetDescription?: string;
    DataAggregation?: {
      DatasetRowDateGranularity?: "SECOND" | "MINUTE" | "HOUR" | "DAY" | "WEEK" | "MONTH" | "QUARTER" | "YEAR";
      /**
       * @minLength 0
       * @maxLength 256
       */
      DefaultDateColumnName?: string;
    };
    Filters?: ({
      /**
       * @minLength 0
       * @maxLength 256
       */
      FilterDescription?: string;
      FilterClass?: "ENFORCED_VALUE_FILTER" | "CONDITIONAL_VALUE_FILTER" | "NAMED_VALUE_FILTER";
      /**
       * @minLength 0
       * @maxLength 256
       */
      FilterName: string;
      FilterSynonyms?: string[];
      /**
       * @minLength 0
       * @maxLength 256
       */
      OperandFieldName: string;
      FilterType?: "CATEGORY_FILTER" | "NUMERIC_EQUALITY_FILTER" | "NUMERIC_RANGE_FILTER" | "DATE_RANGE_FILTER" | "RELATIVE_DATE_FILTER";
      CategoryFilter?: {
        CategoryFilterFunction?: "EXACT" | "CONTAINS";
        CategoryFilterType?: "CUSTOM_FILTER" | "CUSTOM_FILTER_LIST" | "FILTER_LIST";
        Constant?: {
          ConstantType?: "SINGULAR" | "RANGE" | "COLLECTIVE";
          /**
           * @minLength 0
           * @maxLength 256
           */
          SingularConstant?: string;
          CollectiveConstant?: {
            ValueList?: string[];
          };
        };
        /** @default false */
        Inverse?: boolean;
      };
      NumericEqualityFilter?: {
        Constant?: {
          ConstantType?: "SINGULAR" | "RANGE" | "COLLECTIVE";
          /**
           * @minLength 0
           * @maxLength 256
           */
          SingularConstant?: string;
        };
        Aggregation?: "NO_AGGREGATION" | "SUM" | "AVERAGE" | "COUNT" | "DISTINCT_COUNT" | "MAX" | "MEDIAN" | "MIN" | "STDEV" | "STDEVP" | "VAR" | "VARP";
      };
      NumericRangeFilter?: {
        /** @default false */
        Inclusive?: boolean;
        Constant?: {
          ConstantType?: "SINGULAR" | "RANGE" | "COLLECTIVE";
          RangeConstant?: {
            /**
             * @minLength 0
             * @maxLength 256
             */
            Minimum?: string;
            /**
             * @minLength 0
             * @maxLength 256
             */
            Maximum?: string;
          };
        };
        Aggregation?: "NO_AGGREGATION" | "SUM" | "AVERAGE" | "COUNT" | "DISTINCT_COUNT" | "MAX" | "MEDIAN" | "MIN" | "STDEV" | "STDEVP" | "VAR" | "VARP";
      };
      DateRangeFilter?: {
        /** @default false */
        Inclusive?: boolean;
        Constant?: {
          ConstantType?: "SINGULAR" | "RANGE" | "COLLECTIVE";
          RangeConstant?: {
            /**
             * @minLength 0
             * @maxLength 256
             */
            Minimum?: string;
            /**
             * @minLength 0
             * @maxLength 256
             */
            Maximum?: string;
          };
        };
      };
      RelativeDateFilter?: {
        TimeGranularity?: "SECOND" | "MINUTE" | "HOUR" | "DAY" | "WEEK" | "MONTH" | "QUARTER" | "YEAR";
        RelativeDateFilterFunction?: "PREVIOUS" | "THIS" | "LAST" | "NEXT" | "NOW";
        Constant?: {
          ConstantType?: "SINGULAR" | "RANGE" | "COLLECTIVE";
          /**
           * @minLength 0
           * @maxLength 256
           */
          SingularConstant?: string;
        };
      };
    })[];
    Columns?: ({
      /**
       * @minLength 0
       * @maxLength 256
       */
      ColumnName: string;
      /**
       * @minLength 0
       * @maxLength 256
       */
      ColumnFriendlyName?: string;
      /**
       * @minLength 0
       * @maxLength 256
       */
      ColumnDescription?: string;
      ColumnSynonyms?: string[];
      ColumnDataRole?: "DIMENSION" | "MEASURE";
      Aggregation?: "SUM" | "MAX" | "MIN" | "COUNT" | "DISTINCT_COUNT" | "AVERAGE" | "MEDIAN" | "STDEV" | "STDEVP" | "VAR" | "VARP";
      /** @default false */
      IsIncludedInTopic?: boolean;
      DisableIndexing?: boolean;
      ComparativeOrder?: {
        UseOrdering?: "GREATER_IS_BETTER" | "LESSER_IS_BETTER" | "SPECIFIED";
        SpecifedOrder?: string[];
        TreatUndefinedSpecifiedValues?: "LEAST" | "MOST";
      };
      SemanticType?: {
        /**
         * @minLength 0
         * @maxLength 256
         */
        TypeName?: string;
        /**
         * @minLength 0
         * @maxLength 256
         */
        SubTypeName?: string;
        TypeParameters?: Record<string, string>;
        TruthyCellValue?: string;
        TruthyCellValueSynonyms?: string[];
        FalseyCellValue?: string;
        FalseyCellValueSynonyms?: string[];
      };
      TimeGranularity?: "SECOND" | "MINUTE" | "HOUR" | "DAY" | "WEEK" | "MONTH" | "QUARTER" | "YEAR";
      AllowedAggregations?: ("COUNT" | "DISTINCT_COUNT" | "MIN" | "MAX" | "MEDIAN" | "SUM" | "AVERAGE" | "STDEV" | "STDEVP" | "VAR" | "VARP" | "PERCENTILE")[];
      NotAllowedAggregations?: ("COUNT" | "DISTINCT_COUNT" | "MIN" | "MAX" | "MEDIAN" | "SUM" | "AVERAGE" | "STDEV" | "STDEVP" | "VAR" | "VARP" | "PERCENTILE")[];
      DefaultFormatting?: {
        DisplayFormat?: "AUTO" | "PERCENT" | "CURRENCY" | "NUMBER" | "DATE" | "STRING";
        DisplayFormatOptions?: {
          /** @default false */
          UseBlankCellFormat?: boolean;
          /**
           * @minLength 0
           * @maxLength 256
           */
          BlankCellFormat?: string;
          /**
           * @minLength 0
           * @maxLength 256
           */
          DateFormat?: string;
          DecimalSeparator?: "COMMA" | "DOT";
          /**
           * @minLength 0
           * @maxLength 256
           */
          GroupingSeparator?: string;
          /** @default false */
          UseGrouping?: boolean;
          /** @default 0 */
          FractionDigits?: number;
          /**
           * @minLength 0
           * @maxLength 256
           */
          Prefix?: string;
          /**
           * @minLength 0
           * @maxLength 256
           */
          Suffix?: string;
          UnitScaler?: "NONE" | "AUTO" | "THOUSANDS" | "MILLIONS" | "BILLIONS" | "TRILLIONS" | "LAKHS" | "CRORES";
          NegativeFormat?: {
            /**
             * @minLength 0
             * @maxLength 256
             */
            Prefix?: string;
            /**
             * @minLength 0
             * @maxLength 256
             */
            Suffix?: string;
          };
          /**
           * @minLength 0
           * @maxLength 256
           */
          CurrencySymbol?: string;
        };
      };
      /** @default false */
      NeverAggregateInFilter?: boolean;
      CellValueSynonyms?: {
        /**
         * @minLength 0
         * @maxLength 256
         */
        CellValue?: string;
        Synonyms?: string[];
      }[];
      /** @default false */
      NonAdditive?: boolean;
    })[];
    CalculatedFields?: ({
      /**
       * @minLength 0
       * @maxLength 256
       */
      CalculatedFieldName: string;
      /**
       * @minLength 0
       * @maxLength 256
       */
      CalculatedFieldDescription?: string;
      /**
       * @minLength 1
       * @maxLength 4096
       */
      Expression: string;
      CalculatedFieldSynonyms?: string[];
      /** @default false */
      IsIncludedInTopic?: boolean;
      DisableIndexing?: boolean;
      ColumnDataRole?: "DIMENSION" | "MEASURE";
      TimeGranularity?: "SECOND" | "MINUTE" | "HOUR" | "DAY" | "WEEK" | "MONTH" | "QUARTER" | "YEAR";
      DefaultFormatting?: {
        DisplayFormat?: "AUTO" | "PERCENT" | "CURRENCY" | "NUMBER" | "DATE" | "STRING";
        DisplayFormatOptions?: {
          /** @default false */
          UseBlankCellFormat?: boolean;
          /**
           * @minLength 0
           * @maxLength 256
           */
          BlankCellFormat?: string;
          /**
           * @minLength 0
           * @maxLength 256
           */
          DateFormat?: string;
          DecimalSeparator?: "COMMA" | "DOT";
          /**
           * @minLength 0
           * @maxLength 256
           */
          GroupingSeparator?: string;
          /** @default false */
          UseGrouping?: boolean;
          /** @default 0 */
          FractionDigits?: number;
          /**
           * @minLength 0
           * @maxLength 256
           */
          Prefix?: string;
          /**
           * @minLength 0
           * @maxLength 256
           */
          Suffix?: string;
          UnitScaler?: "NONE" | "AUTO" | "THOUSANDS" | "MILLIONS" | "BILLIONS" | "TRILLIONS" | "LAKHS" | "CRORES";
          NegativeFormat?: {
            /**
             * @minLength 0
             * @maxLength 256
             */
            Prefix?: string;
            /**
             * @minLength 0
             * @maxLength 256
             */
            Suffix?: string;
          };
          /**
           * @minLength 0
           * @maxLength 256
           */
          CurrencySymbol?: string;
        };
      };
      Aggregation?: "SUM" | "MAX" | "MIN" | "COUNT" | "DISTINCT_COUNT" | "AVERAGE" | "MEDIAN" | "STDEV" | "STDEVP" | "VAR" | "VARP";
      ComparativeOrder?: {
        UseOrdering?: "GREATER_IS_BETTER" | "LESSER_IS_BETTER" | "SPECIFIED";
        SpecifedOrder?: string[];
        TreatUndefinedSpecifiedValues?: "LEAST" | "MOST";
      };
      SemanticType?: {
        /**
         * @minLength 0
         * @maxLength 256
         */
        TypeName?: string;
        /**
         * @minLength 0
         * @maxLength 256
         */
        SubTypeName?: string;
        TypeParameters?: Record<string, string>;
        TruthyCellValue?: string;
        TruthyCellValueSynonyms?: string[];
        FalseyCellValue?: string;
        FalseyCellValueSynonyms?: string[];
      };
      AllowedAggregations?: ("COUNT" | "DISTINCT_COUNT" | "MIN" | "MAX" | "MEDIAN" | "SUM" | "AVERAGE" | "STDEV" | "STDEVP" | "VAR" | "VARP" | "PERCENTILE")[];
      NotAllowedAggregations?: ("COUNT" | "DISTINCT_COUNT" | "MIN" | "MAX" | "MEDIAN" | "SUM" | "AVERAGE" | "STDEV" | "STDEVP" | "VAR" | "VARP" | "PERCENTILE")[];
      /** @default false */
      NeverAggregateInFilter?: boolean;
      CellValueSynonyms?: {
        /**
         * @minLength 0
         * @maxLength 256
         */
        CellValue?: string;
        Synonyms?: string[];
      }[];
      /** @default false */
      NonAdditive?: boolean;
    })[];
    NamedEntities?: ({
      /**
       * @minLength 0
       * @maxLength 256
       */
      EntityName: string;
      /**
       * @minLength 0
       * @maxLength 256
       */
      EntityDescription?: string;
      EntitySynonyms?: string[];
      SemanticEntityType?: {
        /**
         * @minLength 0
         * @maxLength 256
         */
        TypeName?: string;
        /**
         * @minLength 0
         * @maxLength 256
         */
        SubTypeName?: string;
        TypeParameters?: Record<string, string>;
      };
      Definition?: ({
        /**
         * @minLength 0
         * @maxLength 256
         */
        FieldName?: string;
        /**
         * @minLength 0
         * @maxLength 256
         */
        PropertyName?: string;
        PropertyRole?: "PRIMARY" | "ID";
        PropertyUsage?: "INHERIT" | "DIMENSION" | "MEASURE";
        Metric?: {
          Aggregation?: "SUM" | "MIN" | "MAX" | "COUNT" | "AVERAGE" | "DISTINCT_COUNT" | "STDEV" | "STDEVP" | "VAR" | "VARP" | "PERCENTILE" | "MEDIAN" | "CUSTOM";
          AggregationFunctionParameters?: Record<string, string>;
        };
      })[];
    })[];
  })[];
  /**
   * @minLength 0
   * @maxLength 256
   */
  Description?: string;
  /**
   * @minItems 0
   * @maxItems 20
   */
  FolderArns?: string[];
  /**
   * @minLength 1
   * @maxLength 128
   */
  Name?: string;
  /**
   * @minItems 1
   * @maxItems 200
   */
  Tags?: {
    /**
     * <p>Tag key.</p>
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * <p>Tag value.</p>
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * @minLength 0
   * @maxLength 256
   * @pattern ^[A-Za-z0-9-_.\\+]*$
   */
  TopicId?: string;
  UserExperienceVersion?: "LEGACY" | "NEW_READER_EXPERIENCE";
};
