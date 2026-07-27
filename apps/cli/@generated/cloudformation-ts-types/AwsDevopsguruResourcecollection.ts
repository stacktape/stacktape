// This file is auto-generated. Do not edit manually.
// Source: aws-devopsguru-resourcecollection.json

/** This resource schema represents the ResourceCollection resource in the Amazon DevOps Guru. */
export type AwsDevopsguruResourcecollection = {
  ResourceCollectionFilter: {
    CloudFormation?: {
      /**
       * An array of CloudFormation stack names.
       * @minItems 1
       * @maxItems 1000
       */
      StackNames?: string[];
    };
    Tags?: {
      /**
       * A Tag key for DevOps Guru app boundary.
       * @minLength 1
       * @maxLength 128
       */
      AppBoundaryKey?: string;
      /**
       * Tag values of DevOps Guru app boundary.
       * @minItems 1
       * @maxItems 1000
       */
      TagValues?: string[];
    }[];
  };
  /**
   * The type of ResourceCollection
   * @enum ["AWS_CLOUD_FORMATION","AWS_TAGS"]
   */
  ResourceCollectionType?: "AWS_CLOUD_FORMATION" | "AWS_TAGS";
};
