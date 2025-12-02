// This file is auto-generated. Do not edit manually.
// Source: aws-glue-classifier.json

/** Resource Type definition for AWS::Glue::Classifier */
export type AwsGlueClassifier = {
  XMLClassifier?: {
    RowTag: string;
    Classification: string;
    Name?: string;
  };
  CsvClassifier?: {
    /** @uniqueItems false */
    ContainsCustomDatatype?: string[];
    QuoteSymbol?: string;
    ContainsHeader?: string;
    Delimiter?: string;
    /** @uniqueItems false */
    Header?: string[];
    AllowSingleColumn?: boolean;
    CustomDatatypeConfigured?: boolean;
    DisableValueTrimming?: boolean;
    Name?: string;
  };
  Id?: string;
  GrokClassifier?: {
    CustomPatterns?: string;
    GrokPattern: string;
    Classification: string;
    Name?: string;
  };
  JsonClassifier?: {
    JsonPath: string;
    Name?: string;
  };
};
