// This file is auto-generated. Do not edit manually.
// Source: aws-timestream-scheduledquery.json

/** The AWS::Timestream::ScheduledQuery resource creates a Timestream Scheduled Query. */
export type AwsTimestreamScheduledquery = {
  Arn?: string;
  ScheduledQueryName?: string;
  QueryString: string;
  ScheduleConfiguration: {
    ScheduleExpression: string;
  };
  NotificationConfiguration: {
    SnsConfiguration: {
      TopicArn: string;
    };
  };
  ClientToken?: string;
  ScheduledQueryExecutionRoleArn: string;
  TargetConfiguration?: {
    TimestreamConfiguration: {
      DatabaseName: string;
      TableName: string;
      TimeColumn: string;
      DimensionMappings: {
        Name: string;
        DimensionValueType: "VARCHAR";
      }[];
      MultiMeasureMappings?: {
        TargetMultiMeasureName?: string;
        MultiMeasureAttributeMappings: ({
          SourceColumn: string;
          MeasureValueType: "BIGINT" | "BOOLEAN" | "DOUBLE" | "VARCHAR" | "TIMESTAMP";
          TargetMultiMeasureAttributeName?: string;
        })[];
      };
      MixedMeasureMappings?: ({
        MeasureName?: string;
        SourceColumn?: string;
        TargetMeasureName?: string;
        MeasureValueType: "BIGINT" | "BOOLEAN" | "DOUBLE" | "VARCHAR" | "MULTI";
        MultiMeasureAttributeMappings?: ({
          SourceColumn: string;
          MeasureValueType: "BIGINT" | "BOOLEAN" | "DOUBLE" | "VARCHAR" | "TIMESTAMP";
          TargetMultiMeasureAttributeName?: string;
        })[];
      })[];
      MeasureNameColumn?: string;
    };
  };
  ErrorReportConfiguration: {
    S3Configuration: {
      BucketName: string;
      ObjectKeyPrefix?: string;
      EncryptionOption?: "SSE_S3" | "SSE_KMS";
    };
  };
  KmsKeyId?: string;
  /** The name of the scheduled query. Scheduled query names must be unique within each Region. */
  SQName?: string;
  /**
   * The query string to run. Parameter names can be specified in the query string @ character followed
   * by an identifier. The named Parameter @scheduled_runtime is reserved and can be used in the query
   * to get the time at which the query is scheduled to run. The timestamp calculated according to the
   * ScheduleConfiguration parameter, will be the value of @scheduled_runtime paramater for each query
   * run. For example, consider an instance of a scheduled query executing on 2021-12-01 00:00:00. For
   * this instance, the @scheduled_runtime parameter is initialized to the timestamp 2021-12-01 00:00:00
   * when invoking the query.
   */
  SQQueryString?: string;
  /** Configuration for when the scheduled query is executed. */
  SQScheduleConfiguration?: string;
  /**
   * Notification configuration for the scheduled query. A notification is sent by Timestream when a
   * query run finishes, when the state is updated or when you delete it.
   */
  SQNotificationConfiguration?: string;
  /** The ARN for the IAM role that Timestream will assume when running the scheduled query. */
  SQScheduledQueryExecutionRoleArn?: string;
  /** Configuration of target store where scheduled query results are written to. */
  SQTargetConfiguration?: string;
  /**
   * Configuration for error reporting. Error reports will be generated when a problem is encountered
   * when writing the query results.
   */
  SQErrorReportConfiguration?: string;
  /**
   * The Amazon KMS key used to encrypt the scheduled query resource, at-rest. If the Amazon KMS key is
   * not specified, the scheduled query resource will be encrypted with a Timestream owned Amazon KMS
   * key. To specify a KMS key, use the key ID, key ARN, alias name, or alias ARN. When using an alias
   * name, prefix the name with alias/. If ErrorReportConfiguration uses SSE_KMS as encryption type, the
   * same KmsKeyId is used to encrypt the error report at rest.
   */
  SQKmsKeyId?: string;
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
