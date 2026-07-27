// This file is auto-generated. Do not edit manually.
// Source: aws-inspector-assessmenttemplate.json

/** Resource Type definition for AWS::Inspector::AssessmentTemplate */
export type AwsInspectorAssessmenttemplate = {
  Arn?: string;
  AssessmentTargetArn: string;
  DurationInSeconds: number;
  AssessmentTemplateName?: string;
  /** @uniqueItems false */
  RulesPackageArns: string[];
  /** @uniqueItems false */
  UserAttributesForFindings?: {
    Key: string;
    Value: string;
  }[];
};
