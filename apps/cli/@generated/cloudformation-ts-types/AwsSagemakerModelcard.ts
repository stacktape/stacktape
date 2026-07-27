// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-modelcard.json

/** Resource Type definition for AWS::SageMaker::ModelCard. */
export type AwsSagemakerModelcard = {
  /**
   * The Amazon Resource Name (ARN) of the successfully created model card.
   * @minLength 1
   * @maxLength 256
   * @pattern ^arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]{9,16}:[0-9]{12}:model-card/[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}$
   */
  ModelCardArn?: string;
  /**
   * A version of the model card.
   * @minimum 1
   */
  ModelCardVersion?: number;
  /**
   * The unique name of the model card.
   * @maxLength 63
   * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}$
   */
  ModelCardName: string;
  SecurityConfig?: {
    /**
     * A Key Management Service key ID to use for encrypting a model card.
     * @maxLength 2048
     * @pattern .*
     */
    KmsKeyId?: string;
  };
  /**
   * The approval status of the model card within your organization. Different organizations might have
   * different criteria for model card review and approval.
   * @enum ["Draft","PendingReview","Approved","Archived"]
   */
  ModelCardStatus: "Draft" | "PendingReview" | "Approved" | "Archived";
  Content: {
    ModelOverview?: {
      /**
       * description of model.
       * @maxLength 1024
       */
      ModelDescription?: string;
      /**
       * Owner of model.
       * @maxLength 1024
       */
      ModelOwner?: string;
      /**
       * Creator of model.
       * @maxLength 1024
       */
      ModelCreator?: string;
      /**
       * Problem being solved with the model.
       * @maxLength 1024
       */
      ProblemType?: string;
      /**
       * Algorithm used to solve the problem.
       * @maxLength 1024
       */
      AlgorithmType?: string;
      /**
       * SageMaker Model Arn or Non SageMaker Model id.
       * @maxLength 1024
       */
      ModelId?: string;
      /**
       * Location of the model artifact.
       * @maxItems 15
       */
      ModelArtifact?: string[];
      /**
       * Name of the model.
       * @maxLength 1024
       */
      ModelName?: string;
      /**
       * Version of the model.
       * @minimum 1
       */
      ModelVersion?: number;
      /** Overview about the inference. */
      InferenceEnvironment?: {
        /**
         * SageMaker inference image uri.
         * @maxItems 15
         */
        ContainerImage?: string[];
      };
    };
    ModelPackageDetails?: {
      /**
       * A brief summary of the model package
       * @maxLength 1024
       */
      ModelPackageDescription?: string;
      /**
       * The Amazon Resource Name (ARN) of the model package
       * @minLength 1
       * @maxLength 2048
       */
      ModelPackageArn?: string;
      /** Information about the user who created model package. */
      CreatedBy?: {
        /**
         * The name of the user's profile in Studio
         * @maxLength 63
         */
        UserProfileName?: string;
      };
      /**
       * Current status of model package
       * @enum ["Pending","InProgress","Completed","Failed","Deleting"]
       */
      ModelPackageStatus?: "Pending" | "InProgress" | "Completed" | "Failed" | "Deleting";
      /**
       * Current approval status of model package
       * @enum ["Approved","Rejected","PendingManualApproval"]
       */
      ModelApprovalStatus?: "Approved" | "Rejected" | "PendingManualApproval";
      /**
       * A description provided for the model approval
       * @maxLength 1024
       */
      ApprovalDescription?: string;
      /**
       * If the model is a versioned model, the name of the model group that the versioned model belongs to.
       * @minLength 1
       * @maxLength 63
       */
      ModelPackageGroupName?: string;
      /**
       * Name of the model package
       * @minLength 1
       * @maxLength 63
       */
      ModelPackageName?: string;
      /**
       * Version of the model package
       * @minimum 1
       */
      ModelPackageVersion?: number;
      /**
       * The machine learning domain of the model package you specified. Common machine learning domains
       * include computer vision and natural language processing.
       */
      Domain?: string;
      /**
       * The machine learning task you specified that your model package accomplishes. Common machine
       * learning tasks include object detection and image classification.
       */
      Task?: string;
      /** A list of algorithms that were used to create a model package. */
      SourceAlgorithms?: {
        /**
         * The name of an algorithm that was used to create the model package. The algorithm must be either an
         * algorithm resource in your SageMaker account or an algorithm in AWS Marketplace that you are
         * subscribed to.
         * @maxLength 170
         */
        AlgorithmName: string;
        /**
         * The Amazon S3 path where the model artifacts, which result from model training, are stored.
         * @maxLength 1024
         */
        ModelDataUrl?: string;
      }[];
      /** Details about inference jobs that can be run with models based on this model package. */
      InferenceSpecification?: {
        /**
         * Contains inference related information which were used to create model package.
         * @minItems 1
         * @maxItems 15
         */
        Containers: {
          /**
           * The Amazon S3 path where the model artifacts, which result from model training, are stored.
           * @maxLength 1024
           */
          ModelDataUrl?: string;
          /**
           * Inference environment path. The Amazon EC2 Container Registry (Amazon ECR) path where inference
           * code is stored.
           * @maxLength 255
           */
          Image: string;
          /**
           * The name of a pre-trained machine learning benchmarked by Amazon SageMaker Inference Recommender
           * model that matches your model.
           */
          NearestModelName?: string;
        }[];
      };
    };
    IntendedUses?: {
      /**
       * Why the model was developed?
       * @maxLength 2048
       */
      PurposeOfModel?: string;
      /**
       * intended use cases.
       * @maxLength 2048
       */
      IntendedUses?: string;
      /** @maxLength 2048 */
      FactorsAffectingModelEfficiency?: string;
      RiskRating?: "High" | "Medium" | "Low" | "Unknown";
      /** @maxLength 2048 */
      ExplanationsForRiskRating?: string;
    };
    BusinessDetails?: {
      /**
       * What business problem does the model solve?
       * @maxLength 2048
       */
      BusinessProblem?: string;
      /**
       * Business stakeholders.
       * @maxLength 2048
       */
      BusinessStakeholders?: string;
      /**
       * Line of business.
       * @maxLength 2048
       */
      LineOfBusiness?: string;
    };
    TrainingDetails?: {
      ObjectiveFunction?: {
        /** objective function that training job is optimized for. */
        Function?: {
          /** @enum ["Maximize","Minimize"] */
          Function?: "Maximize" | "Minimize";
          /** @maxLength 63 */
          Facet?: string;
          /** @maxLength 63 */
          Condition?: string;
        };
        /** @maxLength 1024 */
        Notes?: string;
      };
      /** @maxLength 1024 */
      TrainingObservations?: string;
      TrainingJobDetails?: {
        /**
         * SageMaker Training job arn.
         * @maxLength 1024
         */
        TrainingArn?: string;
        /**
         * Location of the model datasets.
         * @maxItems 15
         */
        TrainingDatasets?: string[];
        TrainingEnvironment?: {
          /**
           * SageMaker training image uri.
           * @maxItems 15
           */
          ContainerImage?: string[];
        };
        TrainingMetrics?: {
          /** @pattern .{1,255} */
          Name: string;
          /** @maxLength 1024 */
          Notes?: string;
          Value: number;
        }[];
        UserProvidedTrainingMetrics?: {
          /** @pattern .{1,255} */
          Name: string;
          /** @maxLength 1024 */
          Notes?: string;
          Value: number;
        }[];
        HyperParameters?: {
          /** @pattern .{1,255} */
          Name: string;
          /** @pattern .{1,255} */
          Value: string;
        }[];
        UserProvidedHyperParameters?: {
          /** @pattern .{1,255} */
          Name: string;
          /** @pattern .{1,255} */
          Value: string;
        }[];
      };
    };
    EvaluationDetails?: ({
      /** @pattern .{1,63} */
      Name: string;
      /** @maxLength 2096 */
      EvaluationObservation?: string;
      /** @maxLength 256 */
      EvaluationJobArn?: string;
      /** @maxItems 10 */
      Datasets?: string[];
      /** additional attributes associated with the evaluation results. */
      Metadata?: Record<string, string>;
      /** @default [] */
      MetricGroups?: ({
        /** @pattern .{1,63} */
        Name: string;
        MetricData: ({
          /** @pattern .{1,255} */
          Name: string;
          /** @maxLength 1024 */
          Notes?: string;
          /** @enum ["number","string","boolean"] */
          Type: "number" | "string" | "boolean";
          Value: number | string | boolean;
          XAxisName?: string;
          YAxisName?: string;
        } | {
          /** @pattern .{1,255} */
          Name: string;
          /** @maxLength 1024 */
          Notes?: string;
          /** @enum ["linear_graph"] */
          Type: "linear_graph";
          Value: number[][];
          XAxisName?: string;
          YAxisName?: string;
        } | {
          /** @pattern .{1,255} */
          Name: string;
          /** @maxLength 1024 */
          Notes?: string;
          /** @enum ["bar_chart"] */
          Type: "bar_chart";
          Value: number[];
          XAxisName?: string[];
          YAxisName?: string;
        } | {
          /** @pattern .{1,255} */
          Name: string;
          /** @maxLength 1024 */
          Notes?: string;
          /** @enum ["matrix"] */
          Type: "matrix";
          Value: number[][];
          XAxisName?: string[];
          YAxisName?: string[];
        })[];
      })[];
    })[];
    AdditionalInformation?: {
      /**
       * Any ethical considerations that the author wants to provide.
       * @maxLength 2048
       */
      EthicalConsiderations?: string;
      /**
       * Caveats and recommendations for people who might use this model in their applications.
       * @maxLength 2048
       */
      CaveatsAndRecommendations?: string;
      /** customer details. */
      CustomDetails?: Record<string, string>;
    };
  };
  /** The date and time the model card was created. */
  CreationTime?: string;
  /**
   * Information about the user who created or modified an experiment, trial, trial component, lineage
   * group, project, or model card.
   */
  CreatedBy?: {
    /**
     * The Amazon Resource Name (ARN) of the user's profile.
     * @default "UnsetValue"
     */
    UserProfileArn?: string;
    /**
     * The name of the user's profile.
     * @default "UnsetValue"
     */
    UserProfileName?: string;
    /**
     * The domain associated with the user.
     * @default "UnsetValue"
     */
    DomainId?: string;
  };
  /** The date and time the model card was last modified. */
  LastModifiedTime?: string;
  /**
   * Information about the user who created or modified an experiment, trial, trial component, lineage
   * group, project, or model card.
   */
  LastModifiedBy?: {
    /**
     * The Amazon Resource Name (ARN) of the user's profile.
     * @default "UnsetValue"
     */
    UserProfileArn?: string;
    /**
     * The name of the user's profile.
     * @default "UnsetValue"
     */
    UserProfileName?: string;
    /**
     * The domain associated with the user.
     * @default "UnsetValue"
     */
    DomainId?: string;
  };
  /**
   * The processing status of model card deletion. The ModelCardProcessingStatus updates throughout the
   * different deletion steps.
   * @default "UnsetValue"
   * @enum ["UnsetValue","DeleteInProgress","DeletePending","ContentDeleted","ExportJobsDeleted","DeleteCompleted","DeleteFailed"]
   */
  ModelCardProcessingStatus?: "UnsetValue" | "DeleteInProgress" | "DeletePending" | "ContentDeleted" | "ExportJobsDeleted" | "DeleteCompleted" | "DeleteFailed";
  /**
   * Key-value pairs used to manage metadata for model cards.
   * @minItems 1
   * @maxItems 50
   */
  Tags?: {
    /**
     * The tag key. Tag keys must be unique per resource.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The tag value.
     * @maxLength 256
     */
    Value: string;
  }[];
};
