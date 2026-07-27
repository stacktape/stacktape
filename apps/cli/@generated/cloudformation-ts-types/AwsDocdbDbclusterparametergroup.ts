// This file is auto-generated. Do not edit manually.
// Source: aws-docdb-dbclusterparametergroup.json

/** Resource Type definition for AWS::DocDB::DBClusterParameterGroup */
export type AwsDocdbDbclusterparametergroup = {
  Id?: string;
  Description: string;
  Parameters: Record<string, unknown>;
  Family: string;
  /** @uniqueItems false */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  Name?: string;
};
