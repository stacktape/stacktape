// This file is auto-generated. Do not edit manually.
// Source: aws-databrew-recipe.json

/** Resource schema for AWS::DataBrew::Recipe. */
export type AwsDatabrewRecipe = {
  /**
   * Description of the recipe
   * @minLength 0
   * @maxLength 1024
   */
  Description?: string;
  /**
   * Recipe name
   * @minLength 1
   * @maxLength 255
   */
  Name: string;
  Steps: ({
    Action: {
      /** Step action operation */
      Operation: string;
      Parameters?: unknown | Record<string, string>;
    };
    /** Condition expressions applied to the step action */
    ConditionExpressions?: {
      /** Input condition to be applied to the target column */
      Condition: string;
      /** Value of the condition */
      Value?: string;
      /** Name of the target column */
      TargetColumn: string;
    }[];
  })[];
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
