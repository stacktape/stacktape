// This file is auto-generated. Do not edit manually.
// Source: aws-databrew-project.json

/** Resource schema for AWS::DataBrew::Project. */
export type AwsDatabrewProject = {
  /**
   * Dataset name
   * @minLength 1
   * @maxLength 255
   */
  DatasetName: string;
  /**
   * Project name
   * @minLength 1
   * @maxLength 255
   */
  Name: string;
  /**
   * Recipe name
   * @minLength 1
   * @maxLength 255
   */
  RecipeName: string;
  /** Role arn */
  RoleArn: string;
  /** Sample */
  Sample?: {
    /**
     * Sample size
     * @minimum 1
     */
    Size?: number;
    /**
     * Sample type
     * @enum ["FIRST_N","LAST_N","RANDOM"]
     */
    Type: "FIRST_N" | "LAST_N" | "RANDOM";
  };
  /** @uniqueItems false */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
