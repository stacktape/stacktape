// This file is auto-generated. Do not edit manually.
// Source: aws-personalize-solution.json

/** Resource schema for AWS::Personalize::Solution. */
export type AwsPersonalizeSolution = {
  /**
   * The name for the solution
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9\-_]*
   */
  Name: string;
  SolutionArn?: string;
  /**
   * When your have multiple event types (using an EVENT_TYPE schema field), this parameter specifies
   * which event type (for example, 'click' or 'like') is used for training the model. If you do not
   * provide an eventType, Amazon Personalize will use all interactions for training with equal weight
   * regardless of type.
   * @maxLength 256
   */
  EventType?: string;
  /**
   * The ARN of the dataset group that provides the training data.
   * @maxLength 256
   * @pattern arn:([a-z\d-]+):personalize:.*:.*:.+
   */
  DatasetGroupArn: string;
  /**
   * Whether to perform automated machine learning (AutoML). The default is false. For this case, you
   * must specify recipeArn.
   */
  PerformAutoML?: boolean;
  /**
   * Whether to perform hyperparameter optimization (HPO) on the specified or selected recipe. The
   * default is false. When performing AutoML, this parameter is always true and you should not set it
   * to false.
   */
  PerformHPO?: boolean;
  /**
   * The ARN of the recipe to use for model training. Only specified when performAutoML is false.
   * @maxLength 256
   * @pattern arn:([a-z\d-]+):personalize:.*:.*:.+
   */
  RecipeArn?: string;
  SolutionConfig?: {
    /** Lists the hyperparameter names and ranges. */
    AlgorithmHyperParameters?: Record<string, string>;
    /** The AutoMLConfig object containing a list of recipes to search when AutoML is performed. */
    AutoMLConfig?: {
      /**
       * The metric to optimize.
       * @maxLength 256
       */
      MetricName?: string;
      /**
       * The list of candidate recipes.
       * @maxItems 100
       */
      RecipeList?: string[];
    };
    /**
     * Only events with a value greater than or equal to this threshold are used for training a model.
     * @maxLength 256
     */
    EventValueThreshold?: string;
    /** Lists the feature transformation parameters. */
    FeatureTransformationParameters?: Record<string, string>;
    /** Describes the properties for hyperparameter optimization (HPO) */
    HpoConfig?: {
      /** The hyperparameters and their allowable ranges */
      AlgorithmHyperParameterRanges?: {
        /**
         * The categorical hyperparameters and their ranges.
         * @maxItems 100
         */
        CategoricalHyperParameterRanges?: {
          /**
           * The name of the hyperparameter.
           * @maxLength 256
           */
          Name?: string;
          /**
           * A list of the categories for the hyperparameter.
           * @maxItems 100
           */
          Values?: string[];
        }[];
        /**
         * The continuous hyperparameters and their ranges.
         * @maxItems 100
         */
        ContinuousHyperParameterRanges?: {
          /**
           * The name of the hyperparameter.
           * @maxLength 256
           */
          Name?: string;
          /**
           * The minimum allowable value for the hyperparameter.
           * @minimum -1000000
           */
          MinValue?: number;
          /**
           * The maximum allowable value for the hyperparameter.
           * @minimum -1000000
           */
          MaxValue?: number;
        }[];
        /**
         * The integer hyperparameters and their ranges.
         * @maxItems 100
         */
        IntegerHyperParameterRanges?: {
          /**
           * The name of the hyperparameter.
           * @maxLength 256
           */
          Name?: string;
          /**
           * The minimum allowable value for the hyperparameter.
           * @minimum -1000000
           */
          MinValue?: number;
          /**
           * The maximum allowable value for the hyperparameter.
           * @maximum 1000000
           */
          MaxValue?: number;
        }[];
      };
      /** The metric to optimize during HPO. */
      HpoObjective?: {
        /**
         * The name of the metric
         * @maxLength 256
         */
        MetricName?: string;
        /**
         * The type of the metric. Valid values are Maximize and Minimize.
         * @enum ["Maximize","Minimize"]
         */
        Type?: "Maximize" | "Minimize";
        /**
         * A regular expression for finding the metric in the training job logs.
         * @maxLength 256
         */
        MetricRegex?: string;
      };
      /** Describes the resource configuration for hyperparameter optimization (HPO). */
      HpoResourceConfig?: {
        /**
         * The maximum number of training jobs when you create a solution version. The maximum value for
         * maxNumberOfTrainingJobs is 40.
         * @maxLength 256
         */
        MaxNumberOfTrainingJobs?: string;
        /**
         * The maximum number of parallel training jobs when you create a solution version. The maximum value
         * for maxParallelTrainingJobs is 10.
         * @maxLength 256
         */
        MaxParallelTrainingJobs?: string;
      };
    };
  };
};
