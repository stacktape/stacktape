// This file is auto-generated. Do not edit manually.
// Source: aws-kendra-datasource.json

/** Kendra DataSource */
export type AwsKendraDatasource = {
  Id?: string;
  Arn?: string;
  Name: string;
  IndexId: string;
  Type: "S3" | "SHAREPOINT" | "SALESFORCE" | "ONEDRIVE" | "SERVICENOW" | "DATABASE" | "CUSTOM" | "CONFLUENCE" | "GOOGLEDRIVE" | "WEBCRAWLER" | "WORKDOCS" | "TEMPLATE";
  DataSourceConfiguration?: unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown;
  Description?: string;
  Schedule?: string;
  RoleArn?: string;
  /** Tags for labeling the data source */
  Tags?: {
    /**
     * A string used to identify this tag
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * A string containing the value for the tag
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  CustomDocumentEnrichmentConfiguration?: {
    InlineConfigurations?: ({
      Condition?: {
        ConditionDocumentAttributeKey: string;
        Operator: "GreaterThan" | "GreaterThanOrEquals" | "LessThan" | "LessThanOrEquals" | "Equals" | "NotEquals" | "Contains" | "NotContains" | "Exists" | "NotExists" | "BeginsWith";
        ConditionOnValue?: {
          /**
           * @minLength 1
           * @maxLength 2048
           */
          StringValue?: string;
          StringListValue?: string[];
          LongValue?: number;
          DateValue?: string;
        };
      };
      Target?: {
        TargetDocumentAttributeKey: string;
        TargetDocumentAttributeValueDeletion?: boolean;
        TargetDocumentAttributeValue?: {
          /**
           * @minLength 1
           * @maxLength 2048
           */
          StringValue?: string;
          StringListValue?: string[];
          LongValue?: number;
          DateValue?: string;
        };
      };
      DocumentContentDeletion?: boolean;
    })[];
    PreExtractionHookConfiguration?: {
      InvocationCondition?: {
        ConditionDocumentAttributeKey: string;
        Operator: "GreaterThan" | "GreaterThanOrEquals" | "LessThan" | "LessThanOrEquals" | "Equals" | "NotEquals" | "Contains" | "NotContains" | "Exists" | "NotExists" | "BeginsWith";
        ConditionOnValue?: {
          /**
           * @minLength 1
           * @maxLength 2048
           */
          StringValue?: string;
          StringListValue?: string[];
          LongValue?: number;
          DateValue?: string;
        };
      };
      LambdaArn: string;
      S3Bucket: string;
    };
    PostExtractionHookConfiguration?: {
      InvocationCondition?: {
        ConditionDocumentAttributeKey: string;
        Operator: "GreaterThan" | "GreaterThanOrEquals" | "LessThan" | "LessThanOrEquals" | "Equals" | "NotEquals" | "Contains" | "NotContains" | "Exists" | "NotExists" | "BeginsWith";
        ConditionOnValue?: {
          /**
           * @minLength 1
           * @maxLength 2048
           */
          StringValue?: string;
          StringListValue?: string[];
          LongValue?: number;
          DateValue?: string;
        };
      };
      LambdaArn: string;
      S3Bucket: string;
    };
    RoleArn?: string;
  };
  LanguageCode?: string;
};
