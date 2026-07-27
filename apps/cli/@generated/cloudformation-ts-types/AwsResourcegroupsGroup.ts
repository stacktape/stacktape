// This file is auto-generated. Do not edit manually.
// Source: aws-resourcegroups-group.json

/** Schema for ResourceGroups::Group */
export type AwsResourcegroupsGroup = {
  /**
   * The name of the resource group
   * @maxLength 128
   */
  Name: string;
  /**
   * The description of the resource group
   * @maxLength 512
   */
  Description?: string;
  ResourceQuery?: {
    /** @enum ["TAG_FILTERS_1_0","CLOUDFORMATION_STACK_1_0"] */
    Type?: "TAG_FILTERS_1_0" | "CLOUDFORMATION_STACK_1_0";
    Query?: {
      ResourceTypeFilters?: string[];
      StackIdentifier?: string;
      TagFilters?: {
        Key?: string;
        Values?: string[];
      }[];
    };
  };
  Tags?: {
    /** @pattern ^(?!aws:).+ */
    Key?: string;
    Value?: string;
  }[];
  /** The Resource Group ARN. */
  Arn?: string;
  Configuration?: {
    Type?: string;
    Parameters?: {
      Name?: string;
      Values?: string[];
    }[];
  }[];
  Resources?: string[];
};
