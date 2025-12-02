// This file is auto-generated. Do not edit manually.
// Source: aws-resourceexplorer2-view.json

/** Definition of AWS::ResourceExplorer2::View Resource Type */
export type AwsResourceexplorer2View = {
  Filters?: {
    /**
     * @minLength 0
     * @maxLength 2048
     */
    FilterString: string;
  };
  IncludedProperties?: {
    /**
     * @minLength 1
     * @maxLength 1011
     */
    Name: string;
  }[];
  Scope?: string;
  Tags?: Record<string, string>;
  ViewArn?: string;
  /** @pattern ^[a-zA-Z0-9\-]{1,64}$ */
  ViewName: string;
};
