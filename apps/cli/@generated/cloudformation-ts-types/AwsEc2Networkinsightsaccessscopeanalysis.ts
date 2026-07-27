// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-networkinsightsaccessscopeanalysis.json

/** Resource schema for AWS::EC2::NetworkInsightsAccessScopeAnalysis */
export type AwsEc2Networkinsightsaccessscopeanalysis = {
  NetworkInsightsAccessScopeAnalysisId?: string;
  NetworkInsightsAccessScopeAnalysisArn?: string;
  NetworkInsightsAccessScopeId: string;
  /** @enum ["running","failed","succeeded"] */
  Status?: "running" | "failed" | "succeeded";
  StatusMessage?: string;
  StartDate?: string;
  EndDate?: string;
  /** @enum ["true","false","unknown"] */
  FindingsFound?: "true" | "false" | "unknown";
  AnalyzedEniCount?: number;
  Tags?: {
    Key: string;
    Value?: string;
  }[];
};
